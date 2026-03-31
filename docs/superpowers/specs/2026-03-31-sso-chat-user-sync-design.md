# SSO-Chat User Sync Design

**Date:** 2026-03-31
**Status:** Draft

## Problem

lgu-chat maintains its own local users table (SQLite) that gets populated when users log in via SSO. This creates data drift:
- Users deleted from SSO still appear in lgu-chat's user list
- Profile data (name, position, office) goes stale if updated in SSO after login
- New SSO employees don't appear in "Start New Chat" until they've logged into chat at least once

## Solution: Periodic Background Sync

lgu-chat periodically fetches the full employee list from SSO and reconciles its local users table.

## Changes Required

### 1. SSO Backend: New `GET /api/v1/sso/employees` Endpoint

**Location:** Add to `routes/api.php` under the existing `ValidateAppCredentials` middleware group.

**Authentication:** App credentials (client_id + client_secret in headers). lgu-chat already has these configured.

**Response:** JSON array of all employees:
```json
[
  {
    "uuid": "abc-123",
    "username": "j.doe",
    "email": "j.doe@lgu.gov.ph",
    "first_name": "John",
    "middle_name": null,
    "last_name": "Doe",
    "full_name": "John Doe",
    "position": "IT Officer",
    "office_name": "MMO-MISS",
    "is_active": true
  }
]
```

Returns all employees (active and inactive). lgu-chat decides how to handle each based on `is_active`.

**Controller:** Add `employees()` method to `SsoController`. Queries `Employee::with(['office', 'position'])->get()` and maps to the response format.

### 2. lgu-chat: Sync Service

**New file:** `lib/sso-sync.ts`

**Responsibilities:**
- Call `GET /sso/employees` with app credentials (client_id/secret headers)
- For each SSO employee:
  - If no local user with matching `sso_employee_uuid` exists → **create** local user record
  - If local user exists → **update** profile fields: `username`, `email`, `full_name`, `name` (first_name), `middle_name`, `last_name`, `position`, `office_name`, `profile_synced_at`
  - If local user exists but SSO employee has `is_active: false` → set local user `status = 'inactive'`
- For local users whose `sso_employee_uuid` is NOT in the SSO response → set `status = 'inactive'` (employee was deleted from SSO)
- Log sync results: created count, updated count, deactivated count

**Sync triggers:**
1. On app startup (server initialization)
2. Every 5 minutes (configurable via `SSO_SYNC_INTERVAL_MS` env var, default `300000`)
3. On SSO login (existing `upsertLocalUser` already handles single-user refresh)

### 3. lgu-chat: User List Filtering

**Affected queries:** Any query that lists users for selection (Start New Chat, group member picker, etc.) must filter `WHERE status = 'active'`.

**Files to check:**
- User search/list API endpoints
- The `users` query in `lib/schema.ts` or wherever user lists are fetched
- Socket.io user presence/online status

**Message history:** Messages from now-inactive users remain visible. The sender name displays correctly from the local cache. Inactive users simply don't appear in user pickers.

### 4. Configuration

**New env var for lgu-chat:**
- `SSO_SYNC_INTERVAL_MS` — sync interval in milliseconds (default: 300000 = 5 minutes)

**Existing env vars used:**
- `SSO_API_URL` — base URL for SSO API (already configured)
- `SSO_CLIENT_ID` — app client ID (already configured)
- `SSO_CLIENT_SECRET` — app client secret (already configured)

## Data Flow

```
SSO Backend (MySQL)                    lgu-chat (SQLite)
┌──────────────┐                      ┌──────────────┐
│  employees   │  GET /sso/employees  │    users     │
│  - uuid      │ ──────────────────►  │  - id (local)│
│  - username   │   (app credentials) │  - sso_uuid  │
│  - name      │                      │  - username   │
│  - office    │    Every 5 min +     │  - full_name │
│  - position  │    on startup +      │  - position  │
│  - is_active │    on SSO login      │  - office    │
└──────────────┘                      │  - status    │
                                      │  - synced_at │
                                      └──────────────┘
                                            │
                                      ┌─────┴──────┐
                                      │  messages   │
                                      │  groups     │
                                      │  (use local │
                                      │   user id)  │
                                      └────────────┘
```

## Files to Modify

### SSO (lgu-sso)
1. `routes/api.php` — add `GET sso/employees` route under `ValidateAppCredentials` middleware
2. `app/Http/Controllers/Api/V1/SsoController.php` — add `employees()` method

### Chat (lgu-chat)
1. **New:** `lib/sso-sync.ts` — sync service with `syncEmployees()` function
2. `lib/auth.ts` or server initialization — trigger sync on startup and set interval
3. User list queries — add `status = 'active'` filter where missing

## Edge Cases

- **SSO unreachable during sync:** Log error, skip this sync cycle, retry next interval. Don't deactivate users just because SSO is temporarily down.
- **Race condition (login during sync):** The existing `upsertLocalUser` on login and the sync service both write to the same table. Both are upserts keyed on `sso_employee_uuid`, so last-write-wins is fine — both write the same data.
- **First startup with empty DB:** Sync creates all users from SSO. Users can be found in "Start New Chat" immediately without needing to log in first.
- **Large employee count:** Government LGU employee count is manageable (hundreds, not millions). No pagination needed on the SSO endpoint.

## Testing

- **Sync creates new users:** Register a user in SSO, wait for sync, verify they appear in lgu-chat's user list
- **Sync updates profiles:** Change a user's office in SSO, wait for sync, verify it updates in lgu-chat
- **Sync deactivates deleted users:** Delete a user from SSO, wait for sync, verify they disappear from "Start New Chat" but their old messages remain
- **SSO down during sync:** Stop SSO container, verify lgu-chat continues working and doesn't deactivate everyone
- **Existing user flow:** Login via SSO still works, immediate profile refresh on login still works
