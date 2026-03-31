# SSO-Chat User Sync Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Periodically sync employees from SSO to lgu-chat's local users table so new employees appear immediately, profiles stay fresh, and deleted employees are deactivated.

**Architecture:** Two changes: (1) New SSO endpoint `GET /sso/employees` using app credentials auth, (2) New sync service in lgu-chat that calls this endpoint on startup + every 5 minutes, upserting/deactivating local users.

**Tech Stack:** Laravel (SSO backend), Next.js + SQLite (lgu-chat), TypeScript

---

### Task 1: Add `GET /sso/employees` endpoint to SSO backend

**Files:**
- Modify: `/Users/jsonse/Documents/development/lgu-sso/app/Http/Controllers/Api/V1/SsoController.php`
- Modify: `/Users/jsonse/Documents/development/lgu-sso/routes/api.php`

- [ ] **Step 1: Add the `employees()` method to SsoController**

In `/Users/jsonse/Documents/development/lgu-sso/app/Http/Controllers/Api/V1/SsoController.php`, add this method at the end of the class (before the closing `}`):

```php
    public function employees(): JsonResponse
    {
        $employees = Employee::with(['office', 'position'])->get();

        $data = $employees->map(function (Employee $employee) {
            return [
                'uuid' => $employee->uuid,
                'username' => $employee->username,
                'email' => $employee->email,
                'first_name' => $employee->first_name,
                'middle_name' => $employee->middle_name,
                'last_name' => $employee->last_name,
                'full_name' => $employee->full_name,
                'position' => $employee->position?->title,
                'office_name' => $employee->office?->name,
                'is_active' => $employee->is_active,
            ];
        });

        return response()->json($data);
    }
```

- [ ] **Step 2: Add the route**

In `/Users/jsonse/Documents/development/lgu-sso/routes/api.php`, inside the `sso` prefix group under the `ValidateAppCredentials` middleware (after line 74, the `Route::get('check', ...)` line), add:

```php
            Route::get('employees', [SsoController::class, 'employees']);
```

- [ ] **Step 3: Verify the endpoint works**

```bash
curl -s -H "X-Client-ID: lguchat-client-28f6267b251e22159a55" -H "X-Client-Secret: 724c8d217e19b81711ea725904ea41d467df591d" http://sso.local/api/v1/sso/employees | python3 -m json.tool | head -30
```

Expected: JSON array of employee objects with uuid, username, full_name, position, office_name, is_active fields.

- [ ] **Step 4: Commit**

```bash
cd /Users/jsonse/Documents/development/lgu-sso
git add app/Http/Controllers/Api/V1/SsoController.php routes/api.php
git commit -m "feat: add GET /sso/employees endpoint for app-credential-based employee sync"
```

---

### Task 2: Create sync service in lgu-chat

**Files:**
- Create: `/Users/jsonse/Documents/development/lgu-chat/lib/sso-sync.ts`

- [ ] **Step 1: Create the sync service file**

Create `/Users/jsonse/Documents/development/lgu-chat/lib/sso-sync.ts`:

```typescript
import "./env";
import { getDatabase } from './database';

const SSO_API_URL = process.env.SSO_API_URL || 'http://lgu-sso.test/api/v1';
const SSO_CLIENT_ID = process.env.SSO_CLIENT_ID || '';
const SSO_CLIENT_SECRET = process.env.SSO_CLIENT_SECRET || '';
const SYNC_INTERVAL_MS = parseInt(process.env.SSO_SYNC_INTERVAL_MS || '300000', 10);
const SYNC_REQUEST_TIMEOUT = 10000;

interface SsoEmployee {
  uuid: string;
  username: string;
  email: string;
  first_name: string;
  middle_name: string | null;
  last_name: string;
  full_name: string;
  position: string | null;
  office_name: string | null;
  is_active: boolean;
}

async function fetchSsoEmployees(): Promise<SsoEmployee[] | null> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), SYNC_REQUEST_TIMEOUT);

  try {
    const response = await fetch(`${SSO_API_URL}/sso/employees`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'X-Client-ID': SSO_CLIENT_ID,
        'X-Client-Secret': SSO_CLIENT_SECRET,
      },
      signal: controller.signal,
    });

    clearTimeout(timeout);

    if (!response.ok) {
      console.error(`[SSO Sync] Failed to fetch employees: ${response.status}`);
      return null;
    }

    return await response.json();
  } catch (error: any) {
    clearTimeout(timeout);
    if (error.name === 'AbortError') {
      console.error('[SSO Sync] Request timed out');
    } else {
      console.error('[SSO Sync] Request failed:', error.message);
    }
    return null;
  }
}

export async function syncEmployees(): Promise<void> {
  const employees = await fetchSsoEmployees();
  if (!employees) {
    console.warn('[SSO Sync] Skipping sync — could not reach SSO');
    return;
  }

  const db = await getDatabase();
  let created = 0;
  let updated = 0;
  let deactivated = 0;

  const ssoUuids = new Set(employees.map((e) => e.uuid));

  for (const emp of employees) {
    const existing = await db.get(
      'SELECT id, status FROM users WHERE sso_employee_uuid = ?',
      [emp.uuid]
    );

    const status = emp.is_active ? 'active' : 'inactive';

    if (existing) {
      await db.run(
        `UPDATE users SET
          username = ?, email = ?, full_name = ?, name = ?, middle_name = ?, last_name = ?,
          position = ?, office_name = ?, status = ?, profile_synced_at = CURRENT_TIMESTAMP
        WHERE sso_employee_uuid = ?`,
        [emp.username, emp.email, emp.full_name, emp.first_name, emp.middle_name, emp.last_name,
         emp.position, emp.office_name, status, emp.uuid]
      );
      if (existing.status !== status) {
        deactivated += status === 'inactive' ? 1 : 0;
      }
      updated++;
    } else {
      await db.run(
        `INSERT INTO users (sso_employee_uuid, username, email, full_name, name, middle_name, last_name, position, office_name, status, role, profile_synced_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'user', CURRENT_TIMESTAMP)`,
        [emp.uuid, emp.username, emp.email, emp.full_name, emp.first_name, emp.middle_name, emp.last_name,
         emp.position, emp.office_name, status]
      );
      created++;
    }
  }

  // Deactivate local users not in SSO response (deleted from SSO)
  const localUsers = await db.all(
    "SELECT id, sso_employee_uuid FROM users WHERE status = 'active' AND sso_employee_uuid IS NOT NULL AND id != 0"
  );

  for (const local of localUsers) {
    if (!ssoUuids.has(local.sso_employee_uuid)) {
      await db.run("UPDATE users SET status = 'inactive' WHERE id = ?", [local.id]);
      deactivated++;
    }
  }

  console.log(`[SSO Sync] Done — created: ${created}, updated: ${updated}, deactivated: ${deactivated}`);
}

let syncInterval: NodeJS.Timeout | null = null;

export function startSyncScheduler(): void {
  // Run initial sync
  syncEmployees().catch((err) => {
    console.error('[SSO Sync] Initial sync failed:', err.message);
  });

  // Schedule periodic sync
  syncInterval = setInterval(() => {
    syncEmployees().catch((err) => {
      console.error('[SSO Sync] Scheduled sync failed:', err.message);
    });
  }, SYNC_INTERVAL_MS);

  console.log(`[SSO Sync] Scheduler started — interval: ${SYNC_INTERVAL_MS / 1000}s`);
}

export function stopSyncScheduler(): void {
  if (syncInterval) {
    clearInterval(syncInterval);
    syncInterval = null;
    console.log('[SSO Sync] Scheduler stopped');
  }
}
```

- [ ] **Step 2: Commit**

```bash
cd /Users/jsonse/Documents/development/lgu-chat
git add lib/sso-sync.ts
git commit -m "feat: add SSO employee sync service"
```

---

### Task 3: Wire up sync to server startup

**Files:**
- Modify: `/Users/jsonse/Documents/development/lgu-chat/server.ts`

- [ ] **Step 1: Import and start the sync scheduler after server starts**

In `/Users/jsonse/Documents/development/lgu-chat/server.ts`, add the import at the top (after the other imports, around line 5):

```typescript
import { startSyncScheduler } from './lib/sso-sync';
```

Then inside the `server.listen` callback (after the `FileService.initializeStorage()` block, around line 55), add:

```typescript
  // Start SSO employee sync
  startSyncScheduler();
```

- [ ] **Step 2: Commit**

```bash
cd /Users/jsonse/Documents/development/lgu-chat
git add server.ts
git commit -m "feat: start SSO sync scheduler on server startup"
```

---

### Task 4: Rebuild and test

- [ ] **Step 1: Rebuild SSO backend**

```bash
cd /Users/jsonse/Documents/development && docker compose build --no-cache lgu-sso 2>&1
docker compose up -d lgu-sso
```

- [ ] **Step 2: Test the SSO endpoint directly**

```bash
curl -s -H "X-Client-ID: lguchat-client-28f6267b251e22159a55" -H "X-Client-Secret: 724c8d217e19b81711ea725904ea41d467df591d" http://sso.local/api/v1/sso/employees | python3 -m json.tool | head -30
```

Expected: JSON array of employees.

- [ ] **Step 3: Rebuild lgu-chat**

```bash
cd /Users/jsonse/Documents/development && docker compose build --no-cache lgu-chat 2>&1
docker compose up -d lgu-chat
```

- [ ] **Step 4: Check lgu-chat logs for sync output**

```bash
docker logs lgu-chat --tail 20 2>&1 | grep "SSO Sync"
```

Expected: `[SSO Sync] Scheduler started` and `[SSO Sync] Done — created: N, updated: N, deactivated: N`

- [ ] **Step 5: Verify in the UI**

1. Register a new user in SSO (via `http://sso-ui.local/register`)
2. Wait up to 5 minutes (or restart lgu-chat to trigger immediate sync)
3. Open lgu-chat → Start New Chat → verify the new user appears without having logged into chat

- [ ] **Step 6: Verify deactivation**

1. Delete an SSO user (or set `is_active = false`)
2. Wait for sync or restart lgu-chat
3. Verify the user no longer appears in "Start New Chat"
4. Verify their old messages still display correctly
