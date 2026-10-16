CREATE TABLE users (
  id            SERIAL PRIMARY KEY,
  name          TEXT NOT NULL,
  email         TEXT NOT NULL,
  password_hash TEXT NOT NULL,
  role          TEXT NOT NULL DEFAULT 'member' CHECK (role IN ('member','admin')),
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX users_email_unique ON users (lower(email));

CREATE TABLE sessions (
  id         SERIAL PRIMARY KEY,
  starts_at  TIMESTAMPTZ NOT NULL UNIQUE,
  capacity   INT NOT NULL DEFAULT 20 CHECK (capacity > 0),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CHECK (date_trunc('hour', starts_at) = starts_at)
);

CREATE TABLE bookings (
  id            SERIAL PRIMARY KEY,
  session_id    INT NOT NULL REFERENCES sessions(id),
  user_id       INT NOT NULL REFERENCES users(id),
  status        TEXT NOT NULL DEFAULT 'confirmed' CHECK (status IN ('confirmed','cancelled')),
  checkin_code  TEXT NOT NULL UNIQUE,
  checked_in_at TIMESTAMPTZ,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  cancelled_at  TIMESTAMPTZ
);
-- One ACTIVE booking per member per session; cancelled rows don't count.
CREATE UNIQUE INDEX one_active_booking
  ON bookings (session_id, user_id) WHERE status = 'confirmed';

CREATE TABLE waitlist (
  id         SERIAL PRIMARY KEY,
  session_id INT NOT NULL REFERENCES sessions(id),
  user_id    INT NOT NULL REFERENCES users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (session_id, user_id)
);