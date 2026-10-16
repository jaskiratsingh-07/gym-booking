# Gym Slot Booking

> **Status: incomplete submission.** I ran out of time, so only part of the
> challenge is built. This README lists exactly what works and what does not.

A booking system for a gym that runs one-hour sessions of 20 people each.
This repository contains the backend API and database schema. The frontend
was not started.

## Design note
- Stack: Node.js, Express, PostgreSQL (hosted on Neon), plain SQL through `pg`, so every query and transaction is visible.
- `sessions.starts_at` is a single TIMESTAMPTZ. A UNIQUE constraint allows one session per start time; a CHECK constraint forces the start to be on the hour.
- Seats remaining is computed (capacity minus confirmed bookings), never stored, so it cannot drift out of sync.
- A partial unique index (`WHERE status = 'confirmed'`) allows one active booking per member per session, while still allowing rebooking after a cancel.
- Cancelled bookings stay as rows with status `cancelled`, which keeps history and lets check-in reject them clearly.
- Waitlist order is `created_at`; `UNIQUE (session_id, user_id)` prevents joining twice.
- Passwords are hashed with bcrypt. Login returns a JWT. Roles are enforced by server middleware, not by the UI.
- Input is validated on the server with zod. All errors use one JSON shape, and a global error handler hides stack traces.

## What works
- Registration with name, email, password; email is unique (case-insensitive)
- Login returning a JWT; passwords stored only as bcrypt hashes
- Auth middleware (401 without a valid token) and admin middleware (403 for non-admins)
- Server-side validation with zod, consistent JSON errors, global error handler, JSON 404 for unknown routes
- Database schema for users, sessions, bookings and waitlist
- Admin creates a session with a date and start hour (keep only if tested)
- Logged-in users list sessions with seats remaining and an optional date filter (keep only if tested)

## Not built (ran out of time)
- Booking and cancelling sessions, including the last-seat concurrency handling
- Waitlist and automatic promotion
- Check-in codes and the admin check-in flow
- The whole frontend (login, sessions list, my bookings, admin page)
- Seed/test data

## Planned approach for the unfinished parts
- Booking: a transaction that locks the session row (`SELECT ... FOR UPDATE`), counts confirmed bookings, then inserts, so two people cannot take the last seat.
- Waitlist promotion: done in the same transaction as the cancellation, skipping sessions that have already started.
- Check-in codes: generated with Node's `crypto.randomBytes`, stored with a UNIQUE constraint, valid once and only during the session's hour.

## Assumptions
- Dates and hours are in the gym's timezone (`GYM_TIMEZONE`, default Asia/Kolkata) and stored as UTC timestamps.
- Capacity is always 20, set by the server and never accepted from the client.
- Admin accounts are created directly in the database, never through registration.
- Passwords must be at least 8 characters.
- Tokens expire after 7 days.

## API (implemented routes)
| Method | Path | Access | Purpose |
|---|---|---|---|
| GET | `/health` | public | server and database check |
| POST | `/api/auth/register` | public | create a member account |
| POST | `/api/auth/login` | public | log in, receive a token |
| POST | `/api/sessions` | admin | create a session (keep only if tested) |
| GET | `/api/sessions?date=YYYY-MM-DD` | logged in | list sessions with seats remaining (keep only if tested) |

Errors look like: `{ "error": { "code": "NOT_FOUND", "message": "..." } }`

## Run it locally
1. Install Node.js (LTS) and create a PostgreSQL database (for example a free Neon project).
2. `cd server && npm install`
3. Copy `server/.env.example` to `server/.env` and fill in `DATABASE_URL` and `JWT_SECRET`.
4. Run `server/schema.sql` against your database (for example in Neon's SQL Editor).
5. `npm run dev`, then open `http://localhost:4000/health`.

## Test credentials
No seed data was created. To get an admin account:
1. Register through `POST /api/auth/register`.
2. Promote it in the database: `UPDATE users SET role = 'admin' WHERE email = 'you@example.com';`
3. Log in again, because the role is stored inside the token.