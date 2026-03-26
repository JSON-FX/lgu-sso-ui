# LGU-SSO Integration Guide

A complete guide on how to integrate LGU Single Sign-On (SSO) authentication into your application. This document covers the full flow from registering your app to handling authenticated users.

---

## Table of Contents

- [Overview](#overview)
- [Architecture](#architecture)
- [Prerequisites](#prerequisites)
- [Step 1: Register Your Application in LGU-SSO](#step-1-register-your-application-in-lgu-sso)
- [Step 2: Configure Environment Variables](#step-2-configure-environment-variables)
- [Step 3: Implement the Login Redirect](#step-3-implement-the-login-redirect)
- [Step 4: Implement the Callback Handler](#step-4-implement-the-callback-handler)
- [Step 5: Validate the Token and Fetch User Data](#step-5-validate-the-token-and-fetch-user-data)
- [Step 6: Protect Routes with Auth Guards](#step-6-protect-routes-with-auth-guards)
- [Step 7: Handle Logout](#step-7-handle-logout)
- [API Reference](#api-reference)
- [Data Types Reference](#data-types-reference)
- [Full Integration Example (Next.js)](#full-integration-example-nextjs)
- [Full Integration Example (Laravel)](#full-integration-example-laravel)
- [Security Considerations](#security-considerations)
- [Troubleshooting](#troubleshooting)

---

## Overview

LGU-SSO provides centralized authentication for all LGU applications. Instead of each app managing its own user accounts and passwords, users sign in once through LGU-SSO and are automatically authenticated across all integrated applications.

**How it works:**

1. Your app redirects the user to the LGU-SSO login page.
2. The user enters their credentials on the SSO login page.
3. After successful authentication, LGU-SSO redirects back to your app with an access token.
4. Your app uses the access token to verify the user and fetch their profile.

---

## Architecture

```
┌──────────────────┐         ┌──────────────────────┐         ┌──────────────────┐
│                  │  1. Redirect to SSO login       │                  │
│   Your App       │────────────────────────────────▶│   LGU-SSO UI     │
│   (Client)       │                                 │   (Login Page)   │
│                  │◀────────────────────────────────│                  │
│                  │  4. Redirect back with token     │                  │
└──────────────────┘                                 └────────┬─────────┘
        │                                                     │
        │  5. GET /auth/me                           2. POST /sso/validate-redirect
        │     (Bearer token)                         3. POST /auth/login
        │                                                     │
        ▼                                                     ▼
┌──────────────────────────────────────────────────────────────────────┐
│                        LGU-SSO Backend API                          │
│                   (http://lgu-sso.test/api/v1)                      │
└──────────────────────────────────────────────────────────────────────┘
```

---

## Prerequisites

Before integrating, ensure you have:

- [ ] **Access to the LGU-SSO Admin Dashboard** — You need an administrator account to register your application. Contact the SSO administrator if you don't have access.
- [ ] **LGU-SSO Backend Running** — The SSO API must be available at its configured URL (e.g., `http://lgu-sso.test/api/v1` for local, or the production URL).
- [ ] **LGU-SSO UI Deployed** — The SSO login UI must be accessible (e.g., `http://localhost:3000` for local development, or the production URL).
- [ ] **A callback URL for your app** — A dedicated route in your application that will handle the redirect from SSO after login (e.g., `https://your-app.lgu.gov.ph/sso/callback`).
- [ ] **HTTPS in Production** — The callback URL must use HTTPS in production environments for secure token transmission.

---

## Step 1: Register Your Application in LGU-SSO

Before your app can use SSO login, it must be registered as an **Application** in the LGU-SSO Admin Dashboard.

### Via the Admin Dashboard UI

1. Log in to the LGU-SSO Admin Dashboard.
2. Navigate to **Applications** → **Add Application**.
3. Fill in the form:

| Field | Description | Example |
|---|---|---|
| **Name** | Display name shown on the login page | `LGU Chat` |
| **Description** | Brief description of the app | `Real-time messaging for LGU employees` |
| **Redirect URIs** | Callback URLs where SSO will redirect after login. Add one per environment. | `https://lgu-chat.lgu.gov.ph/sso/callback`, `http://localhost:3002/sso/callback` |
| **Rate Limit (per minute)** | Max API requests per minute | `60` |

4. Click **Create**. You will receive:
   - **Client ID** — Public identifier for your app (e.g., `lgu-chat-a1b2c3d4`)
   - **Client Secret** — Secret key (shown only once, save it immediately)

> **Important:** The `client_secret` is only displayed once upon creation. Store it securely. If lost, you can regenerate it from the application settings, but the old secret will be invalidated immediately.

### Via the API (for automation)

```bash
curl -X POST https://lgu-sso.lgu.gov.ph/api/v1/applications \
  -H "Authorization: Bearer <admin_token>" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "LGU Chat",
    "description": "Real-time messaging for LGU employees",
    "redirect_uris": [
      "https://lgu-chat.lgu.gov.ph/sso/callback",
      "http://localhost:3002/sso/callback"
    ],
    "rate_limit_per_minute": 60
  }'
```

**Response:**

```json
{
  "data": {
    "uuid": "app-007-chat",
    "name": "LGU Chat",
    "description": "Real-time messaging for LGU employees",
    "client_id": "lgu-chat-a1b2c3d4",
    "client_secret": "secret-xxxx-yyyy-zzzz",
    "redirect_uris": [
      "https://lgu-chat.lgu.gov.ph/sso/callback",
      "http://localhost:3002/sso/callback"
    ],
    "rate_limit_per_minute": 60,
    "is_active": true
  }
}
```

### Grant Employee Access

After registration, employees need to be granted access to your application with an appropriate role:

```bash
curl -X POST https://lgu-sso.lgu.gov.ph/api/v1/applications/<app_uuid>/employees \
  -H "Authorization: Bearer <admin_token>" \
  -H "Content-Type: application/json" \
  -d '{
    "employee_uuid": "emp-001-admin",
    "role": "standard"
  }'
```

Available roles: `guest`, `standard`, `administrator`, `super_administrator`

---

## Step 2: Configure Environment Variables

Add the following to your application's environment configuration:

```env
# LGU-SSO Configuration
LGU_SSO_CLIENT_ID=lgu-chat-a1b2c3d4
LGU_SSO_CLIENT_SECRET=secret-xxxx-yyyy-zzzz
LGU_SSO_API_URL=http://lgu-sso.test/api/v1
LGU_SSO_LOGIN_URL=http://localhost:3000/sso/login
LGU_SSO_CALLBACK_URL=http://localhost:3002/sso/callback
```

| Variable | Description |
|---|---|
| `LGU_SSO_CLIENT_ID` | The client ID from Step 1 |
| `LGU_SSO_CLIENT_SECRET` | The client secret from Step 1 |
| `LGU_SSO_API_URL` | Base URL of the LGU-SSO backend API |
| `LGU_SSO_LOGIN_URL` | URL of the LGU-SSO UI login page |
| `LGU_SSO_CALLBACK_URL` | Your app's callback URL (must match a registered redirect URI) |

**Production values example:**

```env
LGU_SSO_CLIENT_ID=lgu-chat-a1b2c3d4
LGU_SSO_CLIENT_SECRET=secret-xxxx-yyyy-zzzz
LGU_SSO_API_URL=https://lgu-sso.lgu.gov.ph/api/v1
LGU_SSO_LOGIN_URL=https://sso.lgu.gov.ph/sso/login
LGU_SSO_CALLBACK_URL=https://lgu-chat.lgu.gov.ph/sso/callback
```

---

## Step 3: Implement the Login Redirect

When a user needs to log in, redirect them to the LGU-SSO login page with the required query parameters.

### Required Query Parameters

| Parameter | Type | Required | Description |
|---|---|---|---|
| `client_id` | string | Yes | Your application's client ID |
| `redirect_uri` | string | Yes | URL-encoded callback URL (must match a registered redirect URI) |
| `state` | string | Yes | A unique, random string to prevent CSRF attacks. Store it in session to verify later. |

### JavaScript / TypeScript Example

```typescript
function redirectToSSOLogin() {
  // Generate a random state value for CSRF protection
  const state = crypto.randomUUID();
  sessionStorage.setItem("sso_state", state);

  // Build the SSO login URL
  const ssoLoginUrl = new URL(process.env.LGU_SSO_LOGIN_URL);
  ssoLoginUrl.searchParams.set("client_id", process.env.LGU_SSO_CLIENT_ID);
  ssoLoginUrl.searchParams.set("redirect_uri", process.env.LGU_SSO_CALLBACK_URL);
  ssoLoginUrl.searchParams.set("state", state);

  // Redirect the user
  window.location.href = ssoLoginUrl.toString();
}
```

**The resulting URL will look like:**

```
https://sso.lgu.gov.ph/sso/login?client_id=lgu-chat-a1b2c3d4&redirect_uri=https%3A%2F%2Flgu-chat.lgu.gov.ph%2Fsso%2Fcallback&state=550e8400-e29b-41d4-a716-446655440000
```

### What Happens on the SSO Side

1. **Validation** — The SSO UI calls `POST /sso/validate-redirect` with your `client_id` and `redirect_uri` to verify the request. If the client ID doesn't exist or the redirect URI doesn't match any registered URI, an error is shown.
2. **Session Check** — The SSO UI checks for an existing session (`GET /sso/session-check`). If the user is already authenticated, they are redirected back immediately without re-entering credentials.
3. **Login Form** — If no session exists, the user sees a login form branded with your application's name (e.g., "Sign in to access **LGU Chat**").
4. **Authentication** — The user enters their email and password. The SSO UI calls `POST /auth/login` to authenticate.
5. **Redirect** — On success, the user is redirected to your callback URL with the token and state.

---

## Step 4: Implement the Callback Handler

After the user logs in, LGU-SSO redirects them to your `redirect_uri` with these query parameters:

```
https://lgu-chat.lgu.gov.ph/sso/callback?token=<access_token>&state=<state_value>
```

| Parameter | Description |
|---|---|
| `token` | The JWT access token for the authenticated user |
| `state` | The same state value you sent in Step 3 |

### Callback Handler Implementation

```typescript
// Route: /sso/callback

function handleSSOCallback() {
  const urlParams = new URLSearchParams(window.location.search);
  const token = urlParams.get("token");
  const state = urlParams.get("state");

  // 1. Verify the state parameter matches what we stored
  const storedState = sessionStorage.getItem("sso_state");
  if (!state || state !== storedState) {
    throw new Error("Invalid state parameter — possible CSRF attack");
  }
  sessionStorage.removeItem("sso_state"); // Clean up

  // 2. Verify we received a token
  if (!token) {
    throw new Error("No token received from SSO");
  }

  // 3. Store the token securely
  // Option A: Cookie (recommended for server-side validation)
  document.cookie = `auth_token=${token}; path=/; max-age=${30 * 24 * 60 * 60}; SameSite=Lax; Secure`;

  // Option B: localStorage (for SPAs)
  localStorage.setItem("auth_token", token);

  // 4. Fetch user data and create session (see Step 5)
  fetchUserProfile(token);
}
```

---

## Step 5: Validate the Token and Fetch User Data

Use the token to call the LGU-SSO API and fetch the authenticated user's profile.

### API Call: `GET /auth/me`

```typescript
async function fetchUserProfile(token: string) {
  const response = await fetch(`${process.env.LGU_SSO_API_URL}/auth/me`, {
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: "application/json",
    },
  });

  if (!response.ok) {
    // Token is invalid or expired
    throw new Error("Failed to validate token");
  }

  const { data: user } = await response.json();

  // User object structure:
  // {
  //   uuid: "emp-001-admin",
  //   first_name: "Maria",
  //   middle_name: "Santos",
  //   last_name: "Dela Cruz",
  //   full_name: "Maria Santos Dela Cruz",
  //   email: "maria.delacruz@lgu.gov.ph",
  //   is_active: true,
  //   office: { id: 5, name: "Office of the Municipal Administrator", abbreviation: "OMA" },
  //   position: "Municipal Administrator",
  //   applications: [
  //     { uuid: "app-007-chat", name: "LGU Chat", role: "standard" }
  //   ],
  //   ...
  // }

  // 5. Verify the user has access to YOUR application
  const appAccess = user.applications?.find(
    (app) => app.uuid === "YOUR_APP_UUID" || app.name === "LGU Chat"
  );

  if (!appAccess) {
    throw new Error("User does not have access to this application");
  }

  // 6. Use appAccess.role to set permissions in your app
  // Roles: "guest" | "standard" | "administrator" | "super_administrator"
  console.log(`User role: ${appAccess.role}`);

  // 7. Create your app's local session
  createLocalSession(user, appAccess.role, token);
}
```

### User Data Structure

The `/auth/me` endpoint returns the full employee profile:

```typescript
interface Employee {
  uuid: string;
  first_name: string;
  middle_name: string | null;
  last_name: string;
  suffix: string | null;
  full_name: string;
  initials: string;
  birthday: string;
  age: number;
  civil_status: "single" | "married" | "widowed" | "separated" | "divorced";
  email: string;
  is_active: boolean;
  nationality: string;
  residence: string;
  office: { id: number; name: string; abbreviation: string } | null;
  position: string | null;
  date_employed: string | null;
  applications: {
    uuid: string;
    name: string;
    role: "guest" | "standard" | "administrator" | "super_administrator";
  }[];
}
```

---

## Step 6: Protect Routes with Auth Guards

### Next.js Middleware Example

```typescript
// middleware.ts
import { NextRequest, NextResponse } from "next/server";

export function middleware(request: NextRequest) {
  const token = request.cookies.get("auth_token")?.value;

  // Allow access to the callback route and public pages
  const publicPaths = ["/sso/callback", "/login", "/"];
  if (publicPaths.some((path) => request.nextUrl.pathname.startsWith(path))) {
    return NextResponse.next();
  }

  // Redirect to SSO login if no token
  if (!token) {
    const ssoUrl = new URL(process.env.NEXT_PUBLIC_LGU_SSO_LOGIN_URL!);
    const state = crypto.randomUUID();
    ssoUrl.searchParams.set("client_id", process.env.NEXT_PUBLIC_LGU_SSO_CLIENT_ID!);
    ssoUrl.searchParams.set("redirect_uri", process.env.NEXT_PUBLIC_LGU_SSO_CALLBACK_URL!);
    ssoUrl.searchParams.set("state", state);

    const response = NextResponse.redirect(ssoUrl);
    response.cookies.set("sso_state", state, { httpOnly: true, maxAge: 300 });
    return response;
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/dashboard/:path*", "/chat/:path*"],
};
```

### React Auth Guard Component

```tsx
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

export function AuthGuard({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem("auth_token");

    if (!token) {
      redirectToSSO();
      return;
    }

    // Validate token with SSO backend
    fetch(`${process.env.NEXT_PUBLIC_LGU_SSO_API_URL}/auth/me`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((res) => {
        if (!res.ok) throw new Error("Invalid token");
        return res.json();
      })
      .then(() => {
        setIsAuthenticated(true);
        setIsLoading(false);
      })
      .catch(() => {
        localStorage.removeItem("auth_token");
        redirectToSSO();
      });
  }, []);

  if (isLoading) return <div>Loading...</div>;
  if (!isAuthenticated) return null;
  return <>{children}</>;
}

function redirectToSSO() {
  const state = crypto.randomUUID();
  sessionStorage.setItem("sso_state", state);

  const url = new URL(process.env.NEXT_PUBLIC_LGU_SSO_LOGIN_URL!);
  url.searchParams.set("client_id", process.env.NEXT_PUBLIC_LGU_SSO_CLIENT_ID!);
  url.searchParams.set("redirect_uri", process.env.NEXT_PUBLIC_LGU_SSO_CALLBACK_URL!);
  url.searchParams.set("state", state);

  window.location.href = url.toString();
}
```

---

## Step 7: Handle Logout

To log out, revoke the token on the SSO backend and clear local session.

```typescript
async function logout() {
  const token = localStorage.getItem("auth_token");

  if (token) {
    // Revoke token on the SSO backend
    await fetch(`${process.env.NEXT_PUBLIC_LGU_SSO_API_URL}/auth/logout`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
    }).catch(() => {
      // Even if the API call fails, proceed with local cleanup
    });
  }

  // Clear local session
  localStorage.removeItem("auth_token");
  document.cookie = "auth_token=; path=/; max-age=0";

  // Redirect to login or home
  window.location.href = "/";
}
```

To log out from **all sessions** (all devices), use:

```typescript
await fetch(`${process.env.NEXT_PUBLIC_LGU_SSO_API_URL}/auth/logout-all`, {
  method: "POST",
  headers: { Authorization: `Bearer ${token}` },
});
```

---

## API Reference

### Authentication Endpoints

| Method | Endpoint | Description | Auth Required |
|---|---|---|---|
| `POST` | `/auth/login` | Authenticate with email/password | No |
| `POST` | `/auth/logout` | Revoke current token | Yes |
| `POST` | `/auth/logout-all` | Revoke all user sessions | Yes |
| `GET` | `/auth/me` | Get current user profile | Yes |
| `POST` | `/auth/refresh` | Refresh access token | Yes |

### SSO Endpoints

| Method | Endpoint | Description | Auth Required |
|---|---|---|---|
| `POST` | `/sso/validate-redirect` | Validate client_id and redirect_uri | No |
| `GET` | `/sso/session-check` | Check for existing SSO session | Cookie-based |

### Request/Response Examples

#### POST `/auth/login`

**Request:**
```json
{
  "email": "maria.delacruz@lgu.gov.ph",
  "password": "your_password"
}
```

**Response (200):**
```json
{
  "access_token": "eyJhbGciOiJIUzI1NiIs...",
  "token_type": "bearer",
  "employee": {
    "uuid": "emp-001-admin",
    "full_name": "Maria Santos Dela Cruz",
    "email": "maria.delacruz@lgu.gov.ph"
  }
}
```

#### POST `/sso/validate-redirect`

**Request:**
```json
{
  "client_id": "lgu-chat-a1b2c3d4",
  "redirect_uri": "https://lgu-chat.lgu.gov.ph/sso/callback"
}
```

**Response (200):**
```json
{
  "application_name": "LGU Chat"
}
```

**Response (400/404):**
```json
{
  "message": "The redirect request could not be validated."
}
```

#### GET `/auth/me`

**Headers:** `Authorization: Bearer <token>`

**Response (200):**
```json
{
  "data": {
    "uuid": "emp-001-admin",
    "first_name": "Maria",
    "middle_name": "Santos",
    "last_name": "Dela Cruz",
    "suffix": null,
    "full_name": "Maria Santos Dela Cruz",
    "email": "maria.delacruz@lgu.gov.ph",
    "is_active": true,
    "office": {
      "id": 5,
      "name": "Office of the Municipal Administrator",
      "abbreviation": "OMA"
    },
    "position": "Municipal Administrator",
    "applications": [
      {
        "uuid": "app-007-chat",
        "name": "LGU Chat",
        "role": "standard"
      }
    ]
  }
}
```

---

## Data Types Reference

### Roles

| Role | Description |
|---|---|
| `guest` | Read-only access |
| `standard` | Regular user access |
| `administrator` | Admin-level access within the app |
| `super_administrator` | Full access, typically for SSO admins |

### Application Registration

```typescript
interface Application {
  uuid: string;
  name: string;
  description: string | null;
  client_id: string;
  redirect_uris: string[];
  rate_limit_per_minute: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}
```

---

## Full Integration Example (Next.js)

Here's a complete working example for a Next.js app (e.g., LGU-Chat):

### 1. Environment Variables (`.env.local`)

```env
NEXT_PUBLIC_LGU_SSO_API_URL=http://lgu-sso.test/api/v1
NEXT_PUBLIC_LGU_SSO_LOGIN_URL=http://localhost:3000/sso/login
NEXT_PUBLIC_LGU_SSO_CLIENT_ID=lgu-chat-a1b2c3d4
NEXT_PUBLIC_LGU_SSO_CALLBACK_URL=http://localhost:3002/sso/callback
```

### 2. SSO Config (`lib/sso-config.ts`)

```typescript
export const ssoConfig = {
  apiUrl: process.env.NEXT_PUBLIC_LGU_SSO_API_URL!,
  loginUrl: process.env.NEXT_PUBLIC_LGU_SSO_LOGIN_URL!,
  clientId: process.env.NEXT_PUBLIC_LGU_SSO_CLIENT_ID!,
  callbackUrl: process.env.NEXT_PUBLIC_LGU_SSO_CALLBACK_URL!,
};
```

### 3. Auth Utility (`lib/auth.ts`)

```typescript
import { ssoConfig } from "./sso-config";

export function redirectToSSOLogin() {
  const state = crypto.randomUUID();
  sessionStorage.setItem("sso_state", state);

  const url = new URL(ssoConfig.loginUrl);
  url.searchParams.set("client_id", ssoConfig.clientId);
  url.searchParams.set("redirect_uri", ssoConfig.callbackUrl);
  url.searchParams.set("state", state);

  window.location.href = url.toString();
}

export function getToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem("sso_token");
}

export function setToken(token: string) {
  localStorage.setItem("sso_token", token);
}

export function clearToken() {
  localStorage.removeItem("sso_token");
}

export async function fetchCurrentUser(token: string) {
  const response = await fetch(`${ssoConfig.apiUrl}/auth/me`, {
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: "application/json",
    },
  });

  if (!response.ok) {
    throw new Error("Token validation failed");
  }

  const { data } = await response.json();
  return data;
}

export async function logout() {
  const token = getToken();
  if (token) {
    await fetch(`${ssoConfig.apiUrl}/auth/logout`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` },
    }).catch(() => {});
  }
  clearToken();
  window.location.href = "/";
}
```

### 4. Callback Page (`app/sso/callback/page.tsx`)

```tsx
"use client";

import { useEffect, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { setToken, fetchCurrentUser } from "@/lib/auth";

export default function SSOCallbackPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const token = searchParams.get("token");
    const state = searchParams.get("state");
    const storedState = sessionStorage.getItem("sso_state");

    // Validate state
    if (!state || state !== storedState) {
      setError("Invalid state parameter. Please try logging in again.");
      return;
    }
    sessionStorage.removeItem("sso_state");

    // Validate token
    if (!token) {
      setError("No authentication token received.");
      return;
    }

    // Store token and validate with backend
    setToken(token);

    fetchCurrentUser(token)
      .then((user) => {
        // Check if user has access to this app
        const hasAccess = user.applications?.some(
          (app: { name: string }) => app.name === "LGU Chat"
        );

        if (!hasAccess) {
          setError("You do not have access to this application.");
          return;
        }

        // Redirect to the main app
        router.replace("/chat");
      })
      .catch(() => {
        setError("Failed to validate your session. Please try again.");
      });
  }, [searchParams, router]);

  if (error) {
    return (
      <div>
        <h1>Authentication Error</h1>
        <p>{error}</p>
        <a href="/">Return to Home</a>
      </div>
    );
  }

  return <p>Authenticating...</p>;
}
```

### 5. Login Page (`app/login/page.tsx`)

```tsx
"use client";

import { useEffect } from "react";
import { redirectToSSOLogin, getToken } from "@/lib/auth";
import { useRouter } from "next/navigation";

export default function LoginPage() {
  const router = useRouter();

  useEffect(() => {
    // If already authenticated, go to dashboard
    const token = getToken();
    if (token) {
      router.replace("/chat");
      return;
    }
  }, [router]);

  return (
    <div>
      <h1>Welcome to LGU Chat</h1>
      <p>Please sign in to continue.</p>
      <button onClick={redirectToSSOLogin}>
        Sign in with LGU-SSO
      </button>
    </div>
  );
}
```

### 6. Auth Guard Layout (`app/(protected)/layout.tsx`)

```tsx
"use client";

import { useEffect, useState } from "react";
import { getToken, fetchCurrentUser, redirectToSSOLogin } from "@/lib/auth";

export default function ProtectedLayout({ children }: { children: React.ReactNode }) {
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    const token = getToken();

    if (!token) {
      redirectToSSOLogin();
      return;
    }

    fetchCurrentUser(token)
      .then(() => setIsReady(true))
      .catch(() => {
        localStorage.removeItem("sso_token");
        redirectToSSOLogin();
      });
  }, []);

  if (!isReady) return <div>Loading...</div>;
  return <>{children}</>;
}
```

---

## Full Integration Example (Laravel)

For Laravel-based applications, here's how to integrate LGU-SSO.

### 1. Environment Variables (`.env`)

```env
LGU_SSO_API_URL=http://lgu-sso.test/api/v1
LGU_SSO_LOGIN_URL=http://localhost:3000/sso/login
LGU_SSO_CLIENT_ID=your-client-id
LGU_SSO_CLIENT_SECRET=your-client-secret
LGU_SSO_CALLBACK_URL=http://localhost:8000/sso/callback
```

### 2. Config File (`config/lgu-sso.php`)

```php
<?php

return [
    'api_url' => env('LGU_SSO_API_URL'),
    'login_url' => env('LGU_SSO_LOGIN_URL'),
    'client_id' => env('LGU_SSO_CLIENT_ID'),
    'client_secret' => env('LGU_SSO_CLIENT_SECRET'),
    'callback_url' => env('LGU_SSO_CALLBACK_URL'),
];
```

### 3. Routes (`routes/web.php`)

```php
use App\Http\Controllers\SSOController;

Route::get('/login', [SSOController::class, 'redirectToSSO'])->name('login');
Route::get('/sso/callback', [SSOController::class, 'handleCallback']);
Route::post('/logout', [SSOController::class, 'logout'])->name('logout');
```

### 4. Controller (`app/Http/Controllers/SSOController.php`)

```php
<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Session;
use Illuminate\Support\Str;

class SSOController extends Controller
{
    public function redirectToSSO()
    {
        $state = Str::uuid()->toString();
        Session::put('sso_state', $state);

        $query = http_build_query([
            'client_id' => config('lgu-sso.client_id'),
            'redirect_uri' => config('lgu-sso.callback_url'),
            'state' => $state,
        ]);

        return redirect(config('lgu-sso.login_url') . '?' . $query);
    }

    public function handleCallback(Request $request)
    {
        // Validate state
        $storedState = Session::pull('sso_state');
        if ($request->query('state') !== $storedState) {
            abort(403, 'Invalid state parameter');
        }

        $token = $request->query('token');
        if (!$token) {
            abort(400, 'No token received');
        }

        // Validate token and fetch user data
        $response = Http::withToken($token)
            ->acceptJson()
            ->get(config('lgu-sso.api_url') . '/auth/me');

        if (!$response->successful()) {
            abort(401, 'Token validation failed');
        }

        $user = $response->json('data');

        // Store in session
        Session::put('sso_token', $token);
        Session::put('sso_user', $user);

        return redirect('/dashboard');
    }

    public function logout()
    {
        $token = Session::get('sso_token');

        if ($token) {
            Http::withToken($token)
                ->post(config('lgu-sso.api_url') . '/auth/logout');
        }

        Session::flush();

        return redirect('/');
    }
}
```

### 5. Middleware (`app/Http/Middleware/SSOAuthenticate.php`)

```php
<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Session;

class SSOAuthenticate
{
    public function handle(Request $request, Closure $next)
    {
        if (!Session::has('sso_token') || !Session::has('sso_user')) {
            return redirect()->route('login');
        }

        // Make user data available to the request
        $request->merge(['sso_user' => Session::get('sso_user')]);

        return $next($request);
    }
}
```

Register in `bootstrap/app.php` (Laravel 11+):

```php
->withMiddleware(function (Middleware $middleware) {
    $middleware->alias([
        'sso.auth' => \App\Http\Middleware\SSOAuthenticate::class,
    ]);
})
```

Protect routes:

```php
Route::middleware('sso.auth')->group(function () {
    Route::get('/dashboard', [DashboardController::class, 'index']);
    // ... other protected routes
});
```

---

## Security Considerations

1. **Always validate the `state` parameter** — This prevents CSRF attacks. Generate a unique value before redirecting and verify it matches when the callback is received.

2. **Use HTTPS in production** — Tokens are passed via query parameters during the redirect. HTTPS ensures they cannot be intercepted.

3. **Validate tokens server-side** — Always call `GET /auth/me` to validate the token with the SSO backend. Never trust a token without verification.

4. **Set secure cookie flags** — When storing the token in a cookie:
   - `Secure`: Only send over HTTPS
   - `HttpOnly`: Prevent JavaScript access (for server-side cookie usage)
   - `SameSite=Lax`: Prevent CSRF

5. **Handle token expiration** — Tokens may expire. Use `POST /auth/refresh` to get a new token, or redirect the user back to the SSO login.

6. **Verify application access** — After fetching the user profile, check that the user has an entry in `applications` matching your app. Don't assume all SSO users have access to your application.

7. **Store `client_secret` securely** — Never expose the client secret in frontend code or commit it to version control. It should only exist in environment variables on the server.

8. **Clean up query parameters** — After processing the callback, redirect the user to a clean URL to remove the token from the browser's address bar and history.

---

## Troubleshooting

### "Invalid Request" / Missing Parameters

**Cause:** The redirect to the SSO login page is missing `client_id`, `redirect_uri`, or `state`.

**Fix:** Ensure all three query parameters are present and properly URL-encoded.

### "Validation Failed" / Redirect Could Not Be Validated

**Cause:** The `client_id` doesn't exist, the `redirect_uri` doesn't match any registered URI, or the application is inactive.

**Fix:**
- Verify the `client_id` matches what was assigned during app registration.
- Verify the `redirect_uri` exactly matches one of the registered redirect URIs (including protocol, domain, port, and path).
- Ensure the application is marked as active in the SSO admin dashboard.

### Token validation fails on callback

**Cause:** The token has expired, or the SSO backend is unreachable.

**Fix:**
- Check that `LGU_SSO_API_URL` is correct and the backend is running.
- Ensure there are no network/firewall issues between your app and the SSO backend.
- If the token expired during a long login session, redirect the user to log in again.

### User has no applications in profile

**Cause:** The employee hasn't been granted access to your application.

**Fix:** An SSO administrator needs to grant the employee access to your app via the Admin Dashboard or the API (`POST /applications/{uuid}/employees`).

### CORS errors

**Cause:** Your frontend is making direct API calls to the SSO backend from a different origin.

**Fix:** The SSO backend must be configured to allow CORS from your app's origin. Contact the SSO backend administrator to add your domain to the allowed origins.

### State mismatch on callback

**Cause:** The `state` value in the callback doesn't match what was stored before the redirect. This can happen if the user's session expired, they opened multiple login tabs, or it's a CSRF attack.

**Fix:** Clear stored state and redirect the user to start the login flow again.
