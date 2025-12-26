API Base URL: https://api.brandon.my/v1/api

Note: This project expects all endpoints to return HTTP 200 with a JSON body and a descriptive field (e.g., "status"). Non‑200 responses are treated as errors by the app.

Overview
- Purpose: Back up and restore the dashboard’s localStorage data per app identifier.
- Identity fields: `email`, `apps` (app identifier), and either `password` (login) or `password_key` (subsequent requests).
- App identifier used by this project: the browser hostname at runtime; if unavailable or "localhost", it falls back to `post-man-test`.
- Client cookie: On successful login, the app stores `password_key` in a cookie `masterauth_password_key` (SameSite=Lax, max‑age ~30 days) so it can auto‑sync without re‑entering the password.

Conventions
- POST requests send JSON in the body with `Content-Type: application/json`.
- GET requests send the same fields as query parameters. If any field is an object, it is JSON‑stringified.

Register
- Path: `auth/register`
- Method: POST
- Request (example):
  {
    "email": "user@example.com",
    "password": "your-password",
    "apps": "app-idendifier (app id)"
  }
- Success:
  {
    "status": "success-registered",
    "password_key": "1764765529466"
  }
- Errors (examples):
  { "status": "already-registered" }
  { "status": "invalid-registration" }

Login
- Path: `auth/login`
- Method: POST
- Request (example):
  {
    "email": "user@example.com",
    "password": "your-password",
    "apps": "app-idendifier (app id)"
  }
- Success:
  {
    "status": "success-login",
    "session": "1764767648049",
    "password_key": "1764765610241"
  }
- Notes:
  - The app saves `password_key` in the `masterauth_password_key` cookie for automatic sync.
  - After login, developer can define the data upload/download option (Auto or Manual) based on apps requirement. `config/app` (GET then conditional POST).
- Errors (examples):
  { "status": "invalid-login" }
  { "status": "user-not-found" }

Get User Data (For User Forget Password or Reset Password)
- Path: `user`
- Method: GET
- Request (example):
  {
    "email": "user@example.com",
    "apps": "app-idendifier (app id)"
  }
- Success:
  {
    "status": "user-found"
  }
- Failed:
  {
    "status": "user-not-found"
  }

Request OTP for reset password
- Path: `user`
- Method: POST
- Request (example):
  {
    "email": "user@example.com",
    "apps": "app-idendifier (app id) (app id)"
  }
- Success:
  {
    "status": "sent",
    "challenge": "xxxxxx" //  6 numbers OTP will be send, save this in LocalStorage for Verification,
    "password_key": "1764765610241" // Save to 2FA verification in background.
  }
- Failed:
  {
    "status": "user-not-found"
  }

Update Password
- Path: `user/password`
- Method: POST
- Request (example):
  {
    "email": "user@example.com",
    "apps": "app-idendifier (app id) (app id)",
    "password_key": "password_key",
    "otp": "saved_otp",
    "new_password": "user new password"
  }
- Success:
  {
    "status": "password-updated"
  }
- Failed:
  {
    "status": "password-update-failed"
  }

Log out
Removing the saved password_key cookie suffices for the app to be defined as logged out.

Request OTP for reset password
- Path: `user`
- Method: POST
- Request (example):
  {
    "email": "user@example.com",
    "apps": "app-idendifier (app id) (app id)"
  }
- Success:
  {
    "status": "user-found"
  }
- Failed:
  {
    "status": "user-not-found"
  }


Get App Data
- Path: `config/app`
- Method: GET
- Request (example):
  {
    "email": "user@example.com",
    "password": "your-password",
    "apps": "app-idendifier (app id)"
  }
- Success (no data yet):
  {
    "status": "data-found",
    "last_sync": "new-data",
    "data": {}
  }
- Success (has data):
  {
    "status": "data-found",
    "last_sync": "2025-12-03T14:38:21.205Z",
    "data": "{\"version\":\"2.1.0\",\"minimum_version\":\"2.0.0\",\"force_update\":false,\"maintenance_mode\":false,\"maintenance_message\":null}"
  }
- Data shape note: `data` may be returned as an object or as a JSON‑encoded string. The app accepts either. The string form is parsed before use.
- Errors (examples):
  { "status": "invalid-password_key" }
  { "status": "invalid-requeest" }

Update App Data
- Path: `config/app`
- Method: POST
- Request (example):
  {
    "email": "user@example.com",
    "apps": "app-idendifier (app id)",
    "password_key": "1764765610241",
    "app_data": { /* all app data from localStorage (JSON) */ }
  }
- Success:
  { "  { "status": "data-update-failed" }
": "data-updated" }
- Errors (examples):
  { "status": "data-update-failed" }

App Sync Behavior In This Project
- On login or revisit (with `masterauth_password_key` cookie present), the app requests `config/app` (GET).
- It compares `last_sync` from the server with the local last‑sync metadata:
  - If the server is newer and contains data, the app replaces localStorage with the server snapshot.
  - If local data exists and is newer or the server is empty, the app uploads via `config/app` (POST).
- `last_sync: "new-data"` means the server has no stored snapshot yet.
- The app excludes its own reserved keys from uploads: `masterauth_profile_v1` and `masterauth_last_sync_v1`.

PowerShell Examples

Register
```powershell
Invoke-RestMethod -Method Post -Uri "https://api.brandon.my/v1/api/auth/register" -ContentType "application/json" -Body (@{
  email = "user@example.com";
  password = "your-password";
  apps = "post-man-test"
} | ConvertTo-Json)
```

Login
```powershell
$login = Invoke-RestMethod -Method Post -Uri "https://api.brandon.my/v1/api/auth/login" -ContentType "application/json" -Body (@{
  email = "user@example.com";
  password = "your-password";
  apps = "post-man-test"
} | ConvertTo-Json)
$passwordKey = $login.password_key
```

Get App Data
```powershell
Invoke-RestMethod -Method Get -Uri ("https://api.brandon.my/v1/api/config/app?" + @{
  email = "user@example.com";
  apps = "post-man-test";
  password_key = $passwordKey
} | ForEach-Object { $_.GetEnumerator() } | ForEach-Object { "{0}={1}" -f [uri]::EscapeDataString($_.Key), [uri]::EscapeDataString($_.Value) } -join '&')
```

Update App Data
```powershell
Invoke-RestMethod -Method Post -Uri "https://api.brandon.my/v1/api/config/app" -ContentType "application/json" -Body (@{
  email = "user@example.com";
  apps = "post-man-test";
  password_key = $passwordKey;
  app_data = @{ some_key = "some_value"; version = "2.1.0" }
} | ConvertTo-Json)
```