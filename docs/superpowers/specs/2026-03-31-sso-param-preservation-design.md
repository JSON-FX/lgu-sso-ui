# SSO Parameter Preservation Through Full Auth Chain

**Date:** 2026-03-31
**Status:** Draft

## Problem

When a new user registers through the SSO flow (arriving from an external app like lgu-chat), the SSO parameters (`client_id`, `redirect_uri`, `state`) are lost at multiple handoff points. This causes the user to land on the admin `/login` page instead of being redirected back to the originating application.

### Expected New User Flow

1. `/sso/login?client_id=...&redirect_uri=...&state=...` — user arrives, clicks "Register here"
2. `/register?redirect_sso=true&client_id=...&redirect_uri=...&state=...` — account created, clicks "Go to Login"
3. `/sso/login?client_id=...&redirect_uri=...&state=...` — user logs in, `must_change_password` detected
4. `/setup-account?client_id=...&redirect_uri=...&state=...` — user changes password, clicks "Continue"
5. `/sso/login?client_id=...&redirect_uri=...&state=...` — user logs in with new password
6. Redirect to `redirect_uri` (e.g. lgu-chat) with token and state

### Expected Existing User Flow

1. `/sso/login?client_id=...&redirect_uri=...&state=...` — user logs in
2. Redirect to `redirect_uri` with token and state

### Actual Behavior (Broken)

Steps 1-3 work. At step 4:
- SSO login redirects to `/setup-account?redirect_uri=...&state=...` — **drops `client_id`**
- After password change, setup-account tries to redirect directly to `redirect_uri` with a potentially stale token instead of sending user back to SSO login
- If the session is lost, the setup layout redirects to `/login` (admin login) instead of `/sso/login`, losing all SSO context

## Bugs and Fixes

### Bug 1: SSO login drops `client_id` when redirecting to setup-account

**File:** `app/(auth)/sso/login/page.tsx` line 106

**Current:**
```typescript
window.location.href = `/setup-account?redirect_uri=${encodeURIComponent(redirectUri!)}&state=${encodeURIComponent(state!)}`;
```

**Fix:** Include `client_id` in the redirect:
```typescript
window.location.href = `/setup-account?client_id=${encodeURIComponent(clientId!)}&redirect_uri=${encodeURIComponent(redirectUri!)}&state=${encodeURIComponent(state!)}`;
```

### Bug 2: Setup-account redirects directly to `redirect_uri` instead of back to SSO login

**File:** `app/(setup)/setup-account/page.tsx` lines 359-367

**Current:** `handleDoneContinue` checks for `redirect_uri` and `state`, then redirects directly to `redirect_uri` with the current token. This is wrong because:
- The user needs to re-authenticate with the new password
- The token may be from the pre-password-change session

**Fix:** When SSO params are present (`client_id`, `redirect_uri`, `state`), redirect back to `/sso/login?client_id=...&redirect_uri=...&state=...` so the user logs in fresh. Fall back to portal/dashboard redirect when no SSO params.

```typescript
const handleDoneContinue = useCallback(() => {
  const clientId = searchParams.get("client_id");
  const redirectUri = searchParams.get("redirect_uri");
  const state = searchParams.get("state");

  if (clientId && redirectUri && state) {
    // Send back to SSO login to re-authenticate with new password
    window.location.href = `/sso/login?client_id=${encodeURIComponent(clientId)}&redirect_uri=${encodeURIComponent(redirectUri)}&state=${encodeURIComponent(state)}`;
    return;
  }

  router.push(isSuperAdmin ? "/dashboard" : "/portal");
}, [searchParams, isSuperAdmin, router]);
```

### Bug 3: Setup layout redirects to `/login` instead of `/sso/login` when SSO params present

**File:** `app/(setup)/layout.tsx` line 24

**Current:**
```typescript
if (!isAuthenticated) {
  router.push("/login");
  return;
}
```

**Fix:** This layout does not have access to search params directly (it's a layout, not a page). However, the redirect to `/login` only fires if the user's session is lost (token expired, cookie cleared). Since the setup-account page now redirects back to `/sso/login` on completion (Bug 2 fix), the main risk is the session expiring mid-setup. For this edge case, we should read the URL search params and preserve them:

```typescript
// In the layout, use window.location.search to extract SSO params
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
```

## Files to Modify

1. `app/(auth)/sso/login/page.tsx` — Add `client_id` to setup-account redirect (line 106)
2. `app/(setup)/setup-account/page.tsx` — Change `handleDoneContinue` to redirect to `/sso/login` with SSO params instead of directly to `redirect_uri` (lines 359-367)
3. `app/(setup)/layout.tsx` — Preserve SSO params when redirecting unauthenticated users (line 24)

## Testing

- **New user SSO flow:** Register → Go to Login → Login → Change Password → Continue → Login again → Redirected to lgu-chat
- **Existing user SSO flow:** Login → Redirected to lgu-chat (no regression)
- **Non-SSO new user:** Register → Go to Login → Login → Change Password → Continue → Portal/Dashboard (no regression)
- **Non-SSO existing user:** Login → Portal/Dashboard (no regression)
- **Session expiry during setup (SSO):** Should redirect to `/sso/login` with params preserved
- **Session expiry during setup (non-SSO):** Should redirect to `/login`
