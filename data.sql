
CREATE TABLE IF NOT EXISTS trackers (
  id         uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  domain     text        NOT NULL,
  creator    text        NOT NULL,
  connected  boolean     NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS visits (
  id           uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  tracker_id   uuid        NOT NULL REFERENCES trackers(id) ON DELETE CASCADE,
  session_id   text        NOT NULL,
  location     text,
  time_spent   integer     NOT NULL DEFAULT 0,
  start_time   timestamptz NOT NULL DEFAULT now(),
  date         timestamptz NOT NULL DEFAULT now(),
  city         text,
  region       text,
  country      text,
  country_code text,
  latitude     numeric,
  longitude    numeric,
  timezone     text,
  ip           text,
  UNIQUE (tracker_id, session_id, location)
);

CREATE TABLE IF NOT EXISTS users (
  id           uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  tracker_id   uuid        NOT NULL REFERENCES trackers(id) ON DELETE CASCADE,
  user_id      text        NOT NULL,
  name         text,
  email        text,
  date_created timestamptz NOT NULL DEFAULT now(),
  UNIQUE (tracker_id, user_id)
);

CREATE TABLE IF NOT EXISTS user_visits (
  user_id  uuid NOT NULL REFERENCES users(id)  ON DELETE CASCADE,
  visit_id uuid NOT NULL REFERENCES visits(id) ON DELETE CASCADE,
  PRIMARY KEY (user_id, visit_id)
);

CREATE INDEX IF NOT EXISTS idx_visits_tracker_id  ON visits      (tracker_id);
CREATE INDEX IF NOT EXISTS idx_visits_session_id  ON visits      (session_id);
CREATE INDEX IF NOT EXISTS idx_visits_location    ON visits      (location);
CREATE INDEX IF NOT EXISTS idx_visits_country     ON visits      (country_code);
CREATE INDEX IF NOT EXISTS idx_users_tracker_id   ON users       (tracker_id);
CREATE INDEX IF NOT EXISTS idx_users_email        ON users       (email);
CREATE INDEX IF NOT EXISTS idx_user_visits_user   ON user_visits (user_id);
CREATE INDEX IF NOT EXISTS idx_user_visits_visit  ON user_visits (visit_id);


CREATE OR REPLACE FUNCTION upsert_visit_and_user(
  p_tracker_id   uuid,
  p_session_id   text,
  p_time_spent   integer,
  p_location     text,
  p_start_time   timestamptz,
  p_user_id      text    DEFAULT null,
  p_name         text    DEFAULT null,
  p_email        text    DEFAULT null,
  p_city         text    DEFAULT null,
  p_region       text    DEFAULT null,
  p_country      text    DEFAULT null,
  p_country_code text    DEFAULT null,
  p_latitude     numeric DEFAULT null,
  p_longitude    numeric DEFAULT null,
  p_timezone     text    DEFAULT null,
  p_ip           text    DEFAULT null
)
RETURNS void AS $$
DECLARE
  v_visit_id uuid;
  v_user_id  uuid;
BEGIN

  IF NOT EXISTS (SELECT 1 FROM trackers WHERE id = p_tracker_id) THEN
    RAISE EXCEPTION 'Tracker not found: %', p_tracker_id;
  END IF;

  INSERT INTO visits (
    tracker_id, session_id, location, time_spent, start_time, date,
    city, region, country, country_code, latitude, longitude, timezone, ip
  )
  VALUES (
    p_tracker_id, p_session_id, p_location, p_time_spent, p_start_time, now(),
    p_city, p_region, p_country, p_country_code, p_latitude, p_longitude, p_timezone, p_ip
  )
  ON CONFLICT (tracker_id, session_id, location)
  DO UPDATE SET
    time_spent = visits.time_spent + EXCLUDED.time_spent
  RETURNING id INTO v_visit_id;

  UPDATE trackers SET connected = true WHERE id = p_tracker_id;

  IF p_user_id IS NOT NULL THEN
    INSERT INTO users (tracker_id, user_id, name, email)
    VALUES (p_tracker_id, p_user_id, p_name, p_email)
    ON CONFLICT (tracker_id, user_id)
    DO UPDATE SET
      name  = COALESCE(EXCLUDED.name,  users.name),
      email = COALESCE(EXCLUDED.email, users.email)
    RETURNING id INTO v_user_id;

    IF v_visit_id IS NOT NULL THEN
      INSERT INTO user_visits (user_id, visit_id)
      VALUES (v_user_id, v_visit_id)
      ON CONFLICT DO NOTHING;
    END IF;
  END IF;

END;
$$ LANGUAGE plpgsql;



SELECT 'table'    AS type, table_name    AS name FROM information_schema.tables
WHERE  table_schema = 'public'
AND    table_name IN ('trackers','visits','users','user_visits')

UNION ALL

SELECT 'function', routine_name FROM information_schema.routines
WHERE  routine_schema = 'public'
AND    routine_name = 'upsert_visit_and_user'

UNION ALL

SELECT 'index', indexname FROM pg_indexes
WHERE  tablename IN ('trackers','visits','users','user_visits');