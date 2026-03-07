CREATE TABLE IF NOT EXISTS data (
  id          uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  domain      text        NOT NULL,
  creator     text        NOT NULL,
  connected   boolean     NOT NULL DEFAULT false,
  visits      jsonb       NOT NULL DEFAULT '{}'::jsonb,
  users       jsonb       NOT NULL DEFAULT '{}'::jsonb,
  created_at  timestamptz NOT NULL DEFAULT now()
);


CREATE INDEX IF NOT EXISTS idx_data_domain    ON data (domain);
CREATE INDEX IF NOT EXISTS idx_data_creator   ON data (creator);
CREATE INDEX IF NOT EXISTS idx_data_id_domain ON data (id, domain);


CREATE OR REPLACE FUNCTION upsert_visit(
  p_id         uuid,
  p_domain     text,
  p_session_id text,
  p_time_spent integer,
  p_location   text,
  p_start_time timestamptz DEFAULT now()
)
RETURNS void AS $$
BEGIN
  UPDATE data
  SET
    connected = true,
    visits = jsonb_set(
      COALESCE(visits, '{}'::jsonb),
      ARRAY[p_session_id],
      CASE
        WHEN visits ? p_session_id THEN
          jsonb_build_object(
            'date',      visits -> p_session_id -> 'date',
            'timeSpent', (COALESCE((visits -> p_session_id ->> 'timeSpent')::integer, 0)) + p_time_spent,
            'startTime', visits -> p_session_id -> 'startTime',
            'location',  visits -> p_session_id -> 'location'
          )
        ELSE
          jsonb_build_object(
            'date',      to_jsonb(now()::text),
            'timeSpent', p_time_spent,
            'startTime', to_jsonb(p_start_time::text),
            'location',  to_jsonb(p_location)
          )
      END
    )
  WHERE id = p_id
    AND domain = p_domain;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Tracker not found for id=% domain=%', p_id, p_domain;
  END IF;
END;
$$ LANGUAGE plpgsql;


CREATE OR REPLACE FUNCTION upsert_user(
  p_id         uuid,
  p_domain     text,
  p_user_id    text,
  p_session_id text,
  p_name       text DEFAULT null,
  p_email      text DEFAULT null
)
RETURNS void AS $$
DECLARE
  v_current_user jsonb;
  v_visit_ids    jsonb;
BEGIN
  SELECT COALESCE(users -> p_user_id, '{}'::jsonb)
  INTO v_current_user
  FROM data
  WHERE id = p_id
    AND domain = p_domain
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Tracker not found for id=% domain=%', p_id, p_domain;
  END IF;

  v_visit_ids := COALESCE(v_current_user -> 'visitIds', '[]'::jsonb);

  IF NOT v_visit_ids @> to_jsonb(p_session_id) THEN
    v_visit_ids := v_visit_ids || to_jsonb(p_session_id);
  END IF;

  UPDATE data
  SET users = jsonb_set(
    COALESCE(users, '{}'::jsonb),
    ARRAY[p_user_id],
    CASE
      WHEN users ? p_user_id THEN
        jsonb_build_object(
          'name',        COALESCE(to_jsonb(p_name), users -> p_user_id -> 'name'),
          'email',       COALESCE(to_jsonb(p_email), users -> p_user_id -> 'email'),
          'visitIds',    v_visit_ids,
          'dateCreated', users -> p_user_id -> 'dateCreated'
        )
      ELSE
        -- New user: insert all fields
        jsonb_build_object(
          'name',        to_jsonb(p_name),
          'email',       to_jsonb(p_email),
          'visitIds',    v_visit_ids,
          'dateCreated', to_jsonb(now()::text)
        )
    END
  )
  WHERE id = p_id
    AND domain = p_domain;
END;
$$ LANGUAGE plpgsql;

SELECT 'table' AS type, table_name AS name
FROM information_schema.tables
WHERE table_schema = 'public' AND table_name = 'data'

UNION ALL

SELECT 'function', routine_name
FROM information_schema.routines
WHERE routine_schema = 'public'
  AND routine_name IN ('upsert_visit', 'upsert_user')

UNION ALL

SELECT 'index', indexname
FROM pg_indexes
WHERE tablename = 'data';