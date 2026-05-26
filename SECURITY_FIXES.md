# Security Fixes - May 25, 2026

## What was fixed

1. Notifications access was locked to the signed-in user.
2. Notification read updates now only affect notifications owned by that user.
3. Login now returns a signed token and the frontend stores it for authenticated requests.
4. Manager 2FA setup now requires the manager's signed token instead of trusting a raw userId from the browser.
5. Logout now clears both the saved user profile and the saved auth token.

## How it was fixed

- Added a small JWT-based auth helper in `backend/middleware/auth.js`.
- Updated `backend/routes/auth.js` to issue a signed token after successful login.
- Updated `backend/routes/notifications.js` to require authentication and to scope reads and writes to the authenticated user only.
- Updated the manager and worker login flows to store the token and send it with the requests that need it.
- Updated logout actions to remove the token as well as the user profile.

## Why it was fixed this way

- The original notifications endpoints trusted a browser-supplied userId, which allowed one user to request another user's notifications.
- The 2FA setup endpoint trusted a browser-supplied userId, which meant the server was not verifying who was allowed to act on that account.
- A server-signed token gives the backend a way to verify identity instead of trusting client state alone.

## Follow-up

- The repo still has other routes that should be reviewed for full role-based authorization.
- This change fixes the highest-risk IDOR and authentication trust issues first.

## TLS and CSRF status

- TLS: The database SSL configuration was tightened so that certificate
	verification is enabled by default when `DB_SSL=true`. To disable verification
	for testing only, set `DB_SSL_REJECT_UNAUTHORIZED=false`. See
	`backend/config/database.js` for details. This removes the `rejectUnauthorized: false`
	pattern that Semgrep flagged.

- CSRF: The API uses `Authorization: Bearer <token>` headers for authentication
	(JWTs issued at login). Because browsers do not automatically attach
	`Authorization` headers to cross-site requests (unlike cookies), the classic
	CSRF threat is substantially reduced for these endpoints. For that reason we
	accepted the Semgrep CSRF finding for now and documented the rationale here.
	If the project later switches to cookie-based authentication or server-side
	sessions, we should add `csurf` middleware and a frontend token flow.

### Render deployment note / immediate fix

If your managed database uses a self-signed certificate (common in some
managed/test environments), set one of the following in the Render service
environment variables:

- Quick (less secure) workaround: `DB_SSL_REJECT_UNAUTHORIZED=false` — this
	disables server certificate verification and will stop the "self-signed
	certificate" errors.

- Recommended secure approach: provide the CA certificate used by the DB as
	`DB_CA_CERT`. Paste the PEM contents into the environment variable (use
	`\n` for newlines if the dashboard requires a single-line value). The
	server will use this CA to verify the DB certificate.

After setting either env var on Render, redeploy the service so the new
configuration is picked up.
