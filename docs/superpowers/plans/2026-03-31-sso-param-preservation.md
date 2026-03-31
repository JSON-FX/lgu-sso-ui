# SSO Parameter Preservation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Preserve SSO parameters (`client_id`, `redirect_uri`, `state`) through the entire new-user auth chain so users are redirected back to the originating application after registration and password change.

**Architecture:** Three surgical edits to existing files. No new files, no new dependencies. Each fix addresses one broken handoff in the SSO param chain: (1) SSO login → setup-account, (2) setup-account → SSO login after password change, (3) setup layout fallback redirect.

**Tech Stack:** Next.js App Router, React, TypeScript

---

### Task 1: Add `client_id` to setup-account redirect in SSO login

**Files:**
- Modify: `app/(auth)/sso/login/page.tsx:106`

- [ ] **Step 1: Edit the setup-account redirect to include `client_id`**

In `app/(auth)/sso/login/page.tsx`, line 106, change:

```typescript
        window.location.href = `/setup-account?redirect_uri=${encodeURIComponent(redirectUri!)}&state=${encodeURIComponent(state!)}`;
```

to:

```typescript
        window.location.href = `/setup-account?client_id=${encodeURIComponent(clientId!)}&redirect_uri=${encodeURIComponent(redirectUri!)}&state=${encodeURIComponent(state!)}`;
```

This adds the missing `client_id` param so the setup-account page has all three SSO params available.

- [ ] **Step 2: Verify the edit**

Run: `npx tsc --noEmit 2>&1 | head -20`
Expected: No new type errors (the `clientId` variable is already extracted from `searchParams` on line 31).

- [ ] **Step 3: Commit**

```bash
git add app/(auth)/sso/login/page.tsx
git commit -m "fix: include client_id in SSO login → setup-account redirect"
```

---

### Task 2: Redirect to SSO login after password change instead of directly to `redirect_uri`

**Files:**
- Modify: `app/(setup)/setup-account/page.tsx:337-370`

- [ ] **Step 1: Fix `handleSetPassword` session-expired redirect**

In `app/(setup)/setup-account/page.tsx`, line 339-341, the `handleSetPassword` function redirects to `/login` when `sessionPassword` is missing. Change:

```typescript
    if (!sessionPassword) {
      toast.error("Session expired. Please log in again.");
      router.push("/login");
      return;
    }
```

to:

```typescript
    if (!sessionPassword) {
      toast.error("Session expired. Please log in again.");
      const clientId = searchParams.get("client_id");
      const redirectUri = searchParams.get("redirect_uri");
      const state = searchParams.get("state");
      if (clientId && redirectUri && state) {
        window.location.href = `/sso/login?client_id=${encodeURIComponent(clientId)}&redirect_uri=${encodeURIComponent(redirectUri)}&state=${encodeURIComponent(state)}`;
      } else {
        router.push("/login");
      }
      return;
    }
```

- [ ] **Step 2: Fix `handleDoneContinue` to redirect to SSO login instead of directly to `redirect_uri`**

In `app/(setup)/setup-account/page.tsx`, lines 359-370, replace the entire `handleDoneContinue` callback:

```typescript
  const handleDoneContinue = useCallback(() => {
    const redirectUri = searchParams.get("redirect_uri");
    const state = searchParams.get("state");

    if (redirectUri && state && token) {
      const separator = redirectUri.includes("?") ? "&" : "?";
      window.location.href = `${redirectUri}${separator}token=${encodeURIComponent(token)}&state=${encodeURIComponent(state)}`;
      return;
    }

    router.push(isSuperAdmin ? "/dashboard" : "/portal");
  }, [searchParams, token, isSuperAdmin, router]);
```

with:

```typescript
  const handleDoneContinue = useCallback(() => {
    const clientId = searchParams.get("client_id");
    const redirectUri = searchParams.get("redirect_uri");
    const state = searchParams.get("state");

    if (clientId && redirectUri && state) {
      window.location.href = `/sso/login?client_id=${encodeURIComponent(clientId)}&redirect_uri=${encodeURIComponent(redirectUri)}&state=${encodeURIComponent(state)}`;
      return;
    }

    router.push(isSuperAdmin ? "/dashboard" : "/portal");
  }, [searchParams, isSuperAdmin, router]);
```

This sends the user back to SSO login to re-authenticate with their new password, instead of trying to redirect directly to the external app with a potentially stale token.

- [ ] **Step 3: Clean up unused `token` destructuring**

In `app/(setup)/setup-account/page.tsx`, line 327, `token` is no longer used in `handleDoneContinue`. Change:

```typescript
  const { user, sessionPassword, changePassword, isSuperAdmin, token } =
    useAuth();
```

to:

```typescript
  const { user, sessionPassword, changePassword, isSuperAdmin } =
    useAuth();
```

- [ ] **Step 4: Verify the edits**

Run: `npx tsc --noEmit 2>&1 | head -20`
Expected: No type errors.

- [ ] **Step 5: Commit**

```bash
git add app/(setup)/setup-account/page.tsx
git commit -m "fix: redirect to SSO login after password change instead of directly to redirect_uri"
```

---

### Task 3: Preserve SSO params in setup layout fallback redirect

**Files:**
- Modify: `app/(setup)/layout.tsx:20-31`

- [ ] **Step 1: Update the unauthenticated redirect to preserve SSO params**

In `app/(setup)/layout.tsx`, lines 20-31, replace:

```typescript
  useEffect(() => {
    if (isLoading) return;

    if (!isAuthenticated) {
      router.push("/login");
      return;
    }

    if (!mustChangePassword) {
      router.push(isSuperAdmin ? "/dashboard" : "/portal");
    }
  }, [isLoading, isAuthenticated, mustChangePassword, isSuperAdmin, router]);
```

with:

```typescript
  useEffect(() => {
    if (isLoading) return;

    if (!isAuthenticated) {
      const params = new URLSearchParams(window.location.search);
      const clientId = params.get("client_id");
      const redirectUri = params.get("redirect_uri");
      const state = params.get("state");

      if (clientId && redirectUri && state) {
        router.push(`/sso/login?client_id=${encodeURIComponent(clientId)}&redirect_uri=${encodeURIComponent(redirectUri)}&state=${encodeURIComponent(state)}`);
      } else {
        router.push("/login");
      }
      return;
    }

    if (!mustChangePassword) {
      router.push(isSuperAdmin ? "/dashboard" : "/portal");
    }
  }, [isLoading, isAuthenticated, mustChangePassword, isSuperAdmin, router]);
```

This ensures that if the user's session expires while on the setup-account page, they get sent back to `/sso/login` with all SSO params intact (instead of the admin `/login` page).

- [ ] **Step 2: Verify the edit**

Run: `npx tsc --noEmit 2>&1 | head -20`
Expected: No type errors.

- [ ] **Step 3: Commit**

```bash
git add app/(setup)/layout.tsx
git commit -m "fix: preserve SSO params in setup layout fallback redirect"
```

---

### Task 4: Manual end-to-end verification

- [ ] **Step 1: Test new user SSO flow**

1. Navigate to `http://sso-ui.local/sso/login?client_id=lguchat-client-28f6267b251e22159a55&redirect_uri=http%3A%2F%2Fchat.local%2Fapi%2Fauth%2Fsso%2Fcallback&state=teststate123`
2. Click "Register here" — verify URL has all SSO params
3. Fill form, submit — on success screen, click "Go to Login"
4. Verify you land on `/sso/login` with all SSO params in URL
5. Login with new account — verify redirect to `/setup-account` with `client_id`, `redirect_uri`, `state` all present
6. Complete password change, click "Continue" — verify redirect to `/sso/login` with all SSO params
7. Login again — verify redirect to `chat.local` callback with token and state

- [ ] **Step 2: Test existing user SSO flow (no regression)**

1. Navigate to SSO login URL with params
2. Login with existing user (no `must_change_password`)
3. Verify direct redirect to `chat.local` callback with token and state

- [ ] **Step 3: Test non-SSO flows (no regression)**

1. Navigate to `http://sso-ui.local/login`
2. Login — verify redirect to dashboard/portal (not broken)
3. Navigate to `http://sso-ui.local/register`
4. Register — click "Go to Login" — verify redirect to `/login` (not `/sso/login`)
