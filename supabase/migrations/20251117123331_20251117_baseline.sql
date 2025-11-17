-- 2025-11-17: Baseline av befintligt schema för utegym-projektet.
-- Alla tidigare ändringar är gjorda manuellt i Dashboard.
-- Från och med nu ska schemaändringar göras via migrations.

create extension if not exists "citext" with schema "public" version '1.6';

create extension if not exists "postgis" with schema "public" version '3.3.7';

create sequence "public"."photos_id_seq";

create sequence "public"."photos_raw_id_seq";

create table "public"."exercise_equipment_map" (
    "exercise_key" text not null,
    "equipment_key" text not null
);


alter table "public"."exercise_equipment_map" enable row level security;

create table "public"."exercise_tags" (
    "exercise_key" text not null,
    "tag" text not null
);


create table "public"."exercise_variations" (
    "base_key" text not null,
    "easier_key" text,
    "harder_key" text
);


create table "public"."gym_equipment" (
    "gym_id" text not null,
    "equipment_key" text not null,
    "notes" text,
    "verified_by" uuid,
    "verified_at" timestamp with time zone,
    "source" text,
    "created_at" timestamp with time zone not null default now(),
    "updated_at" timestamp with time zone not null default now()
);


alter table "public"."gym_equipment" enable row level security;

create table "public"."gym_ratings" (
    "id" uuid not null default gen_random_uuid(),
    "gym_id" text not null,
    "user_id" uuid not null,
    "stars" integer not null,
    "comment" text,
    "created_at" timestamp with time zone not null default now()
);


create table "public"."gyms" (
    "id" text not null,
    "name" text not null,
    "lat" double precision not null,
    "lon" double precision not null,
    "city" text,
    "address" text,
    "website" text,
    "description" text,
    "image_url" text,
    "google_place_id" text,
    "google_rating" double precision,
    "google_user_ratings_total" integer,
    "created_at" timestamp with time zone default now(),
    "updated_at" timestamp with time zone default now(),
    "google_editorial_summary" text,
    "description_en" text
);


alter table "public"."gyms" enable row level security;

create table "public"."gyms_staging" (
    "id" text not null,
    "name" text,
    "lat" double precision,
    "lon" double precision,
    "city" text,
    "address" text,
    "website" text,
    "description" text,
    "image_url" text,
    "google_place_id" text,
    "google_rating" numeric,
    "google_user_ratings_total" numeric,
    "google_editorial_summary" text,
    "description_en" text
);


alter table "public"."gyms_staging" enable row level security;

create table "public"."gyms_staging_backup" (
    "id" text,
    "name" text,
    "lat" double precision,
    "lon" double precision,
    "city" text,
    "address" text,
    "website" text,
    "description" text,
    "image_url" text,
    "google_place_id" text,
    "google_rating" numeric,
    "google_user_ratings_total" numeric,
    "google_editorial_summary" text
);


alter table "public"."gyms_staging_backup" enable row level security;

create table "public"."import_status" (
    "source" text not null,
    "last_ingest_at" timestamp with time zone not null default now(),
    "file_name" text,
    "row_count" integer
);


alter table "public"."import_status" enable row level security;

create table "public"."method_exercise_map" (
    "method_key" text not null,
    "exercise_key" text not null,
    "params" jsonb
);


create table "public"."outdoor_equipment" (
    "key" text not null,
    "name" text not null,
    "category" text not null,
    "active" boolean not null default true,
    "created_at" timestamp with time zone not null default now(),
    "name_sv" text,
    "is_active" boolean default true
);


create table "public"."outdoor_exercises" (
    "key" text not null,
    "name" text not null,
    "name_sv" text not null,
    "focus" text not null,
    "modality" text not null,
    "bodyweight_ok" boolean not null default true,
    "difficulty" text not null default 'medium'::text,
    "demo_url" text,
    "created_at" timestamp with time zone not null default now(),
    "description_sv" text,
    "description_en" text
);


alter table "public"."outdoor_exercises" enable row level security;

create table "public"."outdoor_exercises_v2" (
    "key" text not null,
    "name" text not null,
    "name_sv" text not null,
    "focus" text,
    "modality" text,
    "difficulty" text,
    "bodyweight_ok" boolean default true,
    "equipment_keys" text[] default '{}'::text[],
    "description" text,
    "demo_url" text,
    "created_at" timestamp with time zone default now()
);


create table "public"."photos" (
    "id" bigint not null default nextval('photos_id_seq'::regclass),
    "gym_id" text,
    "place_id" text,
    "name" text,
    "widthPx" integer,
    "heightPx" integer,
    "authors" text,
    "attributions" jsonb,
    "created_at" timestamp with time zone default now()
);


alter table "public"."photos" enable row level security;

create table "public"."photos_raw" (
    "id" bigint not null default nextval('photos_raw_id_seq'::regclass),
    "gym_id" text,
    "place_id" text,
    "photo_name" text,
    "widthpx" integer,
    "heightpx" integer,
    "authors" text,
    "attributions" jsonb,
    "created_at" timestamp with time zone default now()
);


alter table "public"."photos_raw" enable row level security;

create table "public"."profiles" (
    "user_id" uuid not null,
    "alias" citext,
    "created_at" timestamp with time zone default now(),
    "updated_at" timestamp with time zone default now()
);


alter table "public"."profiles" enable row level security;

create table "public"."workout_logs" (
    "id" uuid not null default gen_random_uuid(),
    "workout_id" uuid not null,
    "exercise_key" text not null,
    "sets" integer not null default 1,
    "reps" integer[] default '{}'::integer[],
    "load_kg" numeric[] default '{}'::numeric[],
    "rpe" numeric,
    "created_at" timestamp with time zone not null default now()
);


alter table "public"."workout_logs" enable row level security;

create table "public"."workout_methods" (
    "key" text not null,
    "name" text not null,
    "name_sv" text not null,
    "method_type" text not null,
    "scheme" jsonb not null,
    "recommended_duration_min" integer,
    "intensity" text,
    "created_at" timestamp with time zone not null default now()
);


create table "public"."workout_sessions" (
    "id" uuid not null default gen_random_uuid(),
    "user_id" uuid default auth.uid(),
    "created_at" timestamp with time zone default now(),
    "started_at" timestamp with time zone default now(),
    "plan" jsonb not null,
    "logs" jsonb not null,
    "finished_at" timestamp with time zone,
    "meta" jsonb,
    "gym_id" text
);


alter table "public"."workout_sessions" enable row level security;

create table "public"."workouts" (
    "id" uuid not null default gen_random_uuid(),
    "user_id" uuid not null,
    "gym_id" text,
    "started_at" timestamp with time zone not null default now(),
    "ended_at" timestamp with time zone,
    "notes" text,
    "meta" jsonb default '{}'::jsonb
);


alter table "public"."workouts" enable row level security;

alter sequence "public"."photos_id_seq" owned by "public"."photos"."id";

alter sequence "public"."photos_raw_id_seq" owned by "public"."photos_raw"."id";

CREATE UNIQUE INDEX exercise_equipment_map_pkey ON public.exercise_equipment_map USING btree (exercise_key, equipment_key);

CREATE UNIQUE INDEX exercise_tags_pkey ON public.exercise_tags USING btree (exercise_key, tag);

CREATE UNIQUE INDEX exercise_variations_pkey ON public.exercise_variations USING btree (base_key);

CREATE UNIQUE INDEX gym_equipment_pkey ON public.gym_equipment USING btree (gym_id, equipment_key);

CREATE UNIQUE INDEX gym_ratings_pkey ON public.gym_ratings USING btree (id);

CREATE UNIQUE INDEX gym_ratings_unique_per_user ON public.gym_ratings USING btree (gym_id, user_id);

CREATE UNIQUE INDEX gyms_google_place_id_uniq ON public.gyms USING btree (google_place_id) WHERE (google_place_id IS NOT NULL);

CREATE INDEX gyms_lon_lat_idx ON public.gyms USING btree (lon, lat);

CREATE UNIQUE INDEX gyms_pkey ON public.gyms USING btree (id);

CREATE UNIQUE INDEX gyms_staging_pkey ON public.gyms_staging USING btree (id);

CREATE INDEX idx_exeq_eq ON public.exercise_equipment_map USING btree (equipment_key);

CREATE INDEX idx_exeq_ex ON public.exercise_equipment_map USING btree (exercise_key);

CREATE INDEX idx_gym_equipment_eq ON public.gym_equipment USING btree (equipment_key);

CREATE INDEX idx_gym_equipment_gym ON public.gym_equipment USING btree (gym_id);

CREATE INDEX idx_gyms_google_place_id ON public.gyms USING btree (google_place_id);

CREATE INDEX idx_outdoor_ex_v2_difficulty ON public.outdoor_exercises_v2 USING btree (difficulty);

CREATE INDEX idx_outdoor_ex_v2_focus ON public.outdoor_exercises_v2 USING btree (focus);

CREATE INDEX idx_outdoor_ex_v2_modality ON public.outdoor_exercises_v2 USING btree (modality);

CREATE INDEX idx_photos_place_id ON public.photos USING btree (place_id);

CREATE UNIQUE INDEX import_status_pkey ON public.import_status USING btree (source);

CREATE INDEX ix_equipment_key ON public.outdoor_equipment USING btree (key);

CREATE INDEX ix_equipment_map_equipment ON public.exercise_equipment_map USING btree (equipment_key);

CREATE INDEX ix_equipment_map_exercise ON public.exercise_equipment_map USING btree (exercise_key);

CREATE INDEX ix_exercises_focus ON public.outdoor_exercises USING btree (focus);

CREATE INDEX ix_exercises_key ON public.outdoor_exercises USING btree (key);

CREATE INDEX ix_exercises_modality ON public.outdoor_exercises USING btree (modality);

CREATE INDEX ix_map_equipment ON public.exercise_equipment_map USING btree (equipment_key);

CREATE INDEX ix_map_exercise ON public.exercise_equipment_map USING btree (exercise_key);

CREATE UNIQUE INDEX method_exercise_map_pkey ON public.method_exercise_map USING btree (method_key, exercise_key);

CREATE UNIQUE INDEX outdoor_equipment_pkey ON public.outdoor_equipment USING btree (key);

CREATE UNIQUE INDEX outdoor_exercises_pkey ON public.outdoor_exercises USING btree (key);

CREATE UNIQUE INDEX outdoor_exercises_v2_pkey ON public.outdoor_exercises_v2 USING btree (key);

CREATE UNIQUE INDEX photos_pkey ON public.photos USING btree (id);

CREATE UNIQUE INDEX photos_raw_pkey ON public.photos_raw USING btree (id);

CREATE UNIQUE INDEX profiles_alias_key ON public.profiles USING btree (alias);

CREATE UNIQUE INDEX profiles_pkey ON public.profiles USING btree (user_id);

CREATE INDEX workout_logs_exercise_key_idx ON public.workout_logs USING btree (exercise_key);

CREATE UNIQUE INDEX workout_logs_pkey ON public.workout_logs USING btree (id);

CREATE INDEX workout_logs_workout_idx ON public.workout_logs USING btree (workout_id);

CREATE UNIQUE INDEX workout_methods_pkey ON public.workout_methods USING btree (key);

CREATE INDEX workout_sessions_finished_at_idx ON public.workout_sessions USING btree (finished_at DESC);

CREATE INDEX workout_sessions_gym_id_idx ON public.workout_sessions USING btree (gym_id);

CREATE UNIQUE INDEX workout_sessions_pkey ON public.workout_sessions USING btree (id);

CREATE INDEX workout_sessions_user_started_idx ON public.workout_sessions USING btree (user_id, started_at DESC);

CREATE UNIQUE INDEX workouts_pkey ON public.workouts USING btree (id);

CREATE INDEX workouts_user_started_idx ON public.workouts USING btree (user_id, started_at DESC);

alter table "public"."exercise_equipment_map" add constraint "exercise_equipment_map_pkey" PRIMARY KEY using index "exercise_equipment_map_pkey";

alter table "public"."exercise_tags" add constraint "exercise_tags_pkey" PRIMARY KEY using index "exercise_tags_pkey";

alter table "public"."exercise_variations" add constraint "exercise_variations_pkey" PRIMARY KEY using index "exercise_variations_pkey";

alter table "public"."gym_equipment" add constraint "gym_equipment_pkey" PRIMARY KEY using index "gym_equipment_pkey";

alter table "public"."gym_ratings" add constraint "gym_ratings_pkey" PRIMARY KEY using index "gym_ratings_pkey";

alter table "public"."gyms" add constraint "gyms_pkey" PRIMARY KEY using index "gyms_pkey";

alter table "public"."gyms_staging" add constraint "gyms_staging_pkey" PRIMARY KEY using index "gyms_staging_pkey";

alter table "public"."import_status" add constraint "import_status_pkey" PRIMARY KEY using index "import_status_pkey";

alter table "public"."method_exercise_map" add constraint "method_exercise_map_pkey" PRIMARY KEY using index "method_exercise_map_pkey";

alter table "public"."outdoor_equipment" add constraint "outdoor_equipment_pkey" PRIMARY KEY using index "outdoor_equipment_pkey";

alter table "public"."outdoor_exercises" add constraint "outdoor_exercises_pkey" PRIMARY KEY using index "outdoor_exercises_pkey";

alter table "public"."outdoor_exercises_v2" add constraint "outdoor_exercises_v2_pkey" PRIMARY KEY using index "outdoor_exercises_v2_pkey";

alter table "public"."photos" add constraint "photos_pkey" PRIMARY KEY using index "photos_pkey";

alter table "public"."photos_raw" add constraint "photos_raw_pkey" PRIMARY KEY using index "photos_raw_pkey";

alter table "public"."profiles" add constraint "profiles_pkey" PRIMARY KEY using index "profiles_pkey";

alter table "public"."workout_logs" add constraint "workout_logs_pkey" PRIMARY KEY using index "workout_logs_pkey";

alter table "public"."workout_methods" add constraint "workout_methods_pkey" PRIMARY KEY using index "workout_methods_pkey";

alter table "public"."workout_sessions" add constraint "workout_sessions_pkey" PRIMARY KEY using index "workout_sessions_pkey";

alter table "public"."workouts" add constraint "workouts_pkey" PRIMARY KEY using index "workouts_pkey";

alter table "public"."exercise_equipment_map" add constraint "exercise_equipment_map_equipment_key_fkey" FOREIGN KEY (equipment_key) REFERENCES outdoor_equipment(key) ON DELETE RESTRICT not valid;

alter table "public"."exercise_equipment_map" validate constraint "exercise_equipment_map_equipment_key_fkey";

alter table "public"."exercise_equipment_map" add constraint "exercise_equipment_map_exercise_key_fkey" FOREIGN KEY (exercise_key) REFERENCES outdoor_exercises(key) ON DELETE CASCADE not valid;

alter table "public"."exercise_equipment_map" validate constraint "exercise_equipment_map_exercise_key_fkey";

alter table "public"."exercise_tags" add constraint "exercise_tags_exercise_key_fkey" FOREIGN KEY (exercise_key) REFERENCES outdoor_exercises(key) ON DELETE CASCADE not valid;

alter table "public"."exercise_tags" validate constraint "exercise_tags_exercise_key_fkey";

alter table "public"."exercise_variations" add constraint "exercise_variations_base_key_fkey" FOREIGN KEY (base_key) REFERENCES outdoor_exercises(key) ON DELETE CASCADE not valid;

alter table "public"."exercise_variations" validate constraint "exercise_variations_base_key_fkey";

alter table "public"."exercise_variations" add constraint "exercise_variations_easier_key_fkey" FOREIGN KEY (easier_key) REFERENCES outdoor_exercises(key) not valid;

alter table "public"."exercise_variations" validate constraint "exercise_variations_easier_key_fkey";

alter table "public"."exercise_variations" add constraint "exercise_variations_harder_key_fkey" FOREIGN KEY (harder_key) REFERENCES outdoor_exercises(key) not valid;

alter table "public"."exercise_variations" validate constraint "exercise_variations_harder_key_fkey";

alter table "public"."gym_equipment" add constraint "gym_equipment_equipment_key_fkey" FOREIGN KEY (equipment_key) REFERENCES outdoor_equipment(key) ON DELETE RESTRICT not valid;

alter table "public"."gym_equipment" validate constraint "gym_equipment_equipment_key_fkey";

alter table "public"."gym_equipment" add constraint "gym_equipment_gym_id_fkey" FOREIGN KEY (gym_id) REFERENCES gyms(id) ON DELETE CASCADE not valid;

alter table "public"."gym_equipment" validate constraint "gym_equipment_gym_id_fkey";

alter table "public"."gym_ratings" add constraint "gym_ratings_gym_id_fkey" FOREIGN KEY (gym_id) REFERENCES gyms(id) ON DELETE CASCADE not valid;

alter table "public"."gym_ratings" validate constraint "gym_ratings_gym_id_fkey";

alter table "public"."gym_ratings" add constraint "gym_ratings_stars_check" CHECK (((stars >= 1) AND (stars <= 5))) not valid;

alter table "public"."gym_ratings" validate constraint "gym_ratings_stars_check";

alter table "public"."gym_ratings" add constraint "gym_ratings_user_id_fkey" FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE not valid;

alter table "public"."gym_ratings" validate constraint "gym_ratings_user_id_fkey";

alter table "public"."method_exercise_map" add constraint "method_exercise_map_exercise_key_fkey" FOREIGN KEY (exercise_key) REFERENCES outdoor_exercises(key) ON DELETE CASCADE not valid;

alter table "public"."method_exercise_map" validate constraint "method_exercise_map_exercise_key_fkey";

alter table "public"."method_exercise_map" add constraint "method_exercise_map_method_key_fkey" FOREIGN KEY (method_key) REFERENCES workout_methods(key) ON DELETE CASCADE not valid;

alter table "public"."method_exercise_map" validate constraint "method_exercise_map_method_key_fkey";

alter table "public"."outdoor_exercises" add constraint "outdoor_exercises_focus_check" CHECK ((focus = ANY (ARRAY['upper'::text, 'lower'::text, 'full'::text, 'core'::text, 'cardio'::text]))) not valid;

alter table "public"."outdoor_exercises" validate constraint "outdoor_exercises_focus_check";

alter table "public"."outdoor_exercises" add constraint "outdoor_exercises_modality_check" CHECK ((modality = ANY (ARRAY['strength'::text, 'mobility'::text, 'conditioning'::text, 'skill'::text]))) not valid;

alter table "public"."outdoor_exercises" validate constraint "outdoor_exercises_modality_check";

alter table "public"."outdoor_exercises_v2" add constraint "outdoor_exercises_v2_difficulty_check" CHECK ((difficulty = ANY (ARRAY['easy'::text, 'medium'::text, 'hard'::text]))) not valid;

alter table "public"."outdoor_exercises_v2" validate constraint "outdoor_exercises_v2_difficulty_check";

alter table "public"."outdoor_exercises_v2" add constraint "outdoor_exercises_v2_focus_check" CHECK ((focus = ANY (ARRAY['upper'::text, 'lower'::text, 'core'::text, 'full'::text, 'cardio'::text]))) not valid;

alter table "public"."outdoor_exercises_v2" validate constraint "outdoor_exercises_v2_focus_check";

alter table "public"."outdoor_exercises_v2" add constraint "outdoor_exercises_v2_modality_check" CHECK ((modality = ANY (ARRAY['strength'::text, 'mobility'::text, 'conditioning'::text, 'calisthenics'::text]))) not valid;

alter table "public"."outdoor_exercises_v2" validate constraint "outdoor_exercises_v2_modality_check";

alter table "public"."profiles" add constraint "profiles_alias_format_chk" CHECK (((alias IS NULL) OR (alias ~ '^[a-z0-9_]{2,30}$'::citext))) not valid;

alter table "public"."profiles" validate constraint "profiles_alias_format_chk";

alter table "public"."profiles" add constraint "profiles_alias_key" UNIQUE using index "profiles_alias_key";

alter table "public"."profiles" add constraint "profiles_user_id_fkey" FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE not valid;

alter table "public"."profiles" validate constraint "profiles_user_id_fkey";

alter table "public"."workout_logs" add constraint "workout_logs_exercise_key_fkey" FOREIGN KEY (exercise_key) REFERENCES outdoor_exercises(key) not valid;

alter table "public"."workout_logs" validate constraint "workout_logs_exercise_key_fkey";

alter table "public"."workout_logs" add constraint "workout_logs_workout_id_fkey" FOREIGN KEY (workout_id) REFERENCES workouts(id) ON DELETE CASCADE not valid;

alter table "public"."workout_logs" validate constraint "workout_logs_workout_id_fkey";

alter table "public"."workout_methods" add constraint "workout_methods_intensity_check" CHECK ((intensity = ANY (ARRAY['easy'::text, 'medium'::text, 'hard'::text]))) not valid;

alter table "public"."workout_methods" validate constraint "workout_methods_intensity_check";

alter table "public"."workout_methods" add constraint "workout_methods_method_type_check" CHECK ((method_type = ANY (ARRAY['EMOM'::text, 'AMRAP'::text, 'ForTime'::text, 'Intervals'::text, 'Ladder'::text, 'Tempo'::text, 'Circuit'::text]))) not valid;

alter table "public"."workout_methods" validate constraint "workout_methods_method_type_check";

alter table "public"."workout_sessions" add constraint "workout_sessions_gym_fkey" FOREIGN KEY (gym_id) REFERENCES gyms(id) ON DELETE SET NULL not valid;

alter table "public"."workout_sessions" validate constraint "workout_sessions_gym_fkey";

alter table "public"."workout_sessions" add constraint "workout_sessions_user_id_fkey" FOREIGN KEY (user_id) REFERENCES auth.users(id) not valid;

alter table "public"."workout_sessions" validate constraint "workout_sessions_user_id_fkey";

alter table "public"."workouts" add constraint "workouts_gym_id_fkey" FOREIGN KEY (gym_id) REFERENCES gyms(id) ON DELETE SET NULL not valid;

alter table "public"."workouts" validate constraint "workouts_gym_id_fkey";

alter table "public"."workouts" add constraint "workouts_user_id_fkey" FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE not valid;

alter table "public"."workouts" validate constraint "workouts_user_id_fkey";

set check_function_bodies = off;

CREATE OR REPLACE FUNCTION public.api_current_streak(p_user uuid, p_tz text DEFAULT 'UTC'::text)
 RETURNS integer
 LANGUAGE sql
 STABLE
AS $function$
  with workout_days as (
    -- Distinkta träningsdagar i vald tidszon
    select distinct (coalesce(w.finished_at, w.started_at) at time zone p_tz)::date as d
    from workout_sessions w
    where w.user_id = p_user
  ),
  anchor as (
    select max(d) as last_day
    from workout_days
  ),
  -- ✅ Börja räkna från "senaste av (igår, senaste träningsdag)"
  start_day as (
    select case
             when (select last_day from anchor) is null then null
             else greatest(
               (now() at time zone p_tz)::date - interval '1 day',
               (select last_day from anchor)
             )
           end as d
  ),
  -- Generera dag-följd bakåt (max 365 dagar för prestanda)
  day_series as (
    select gs::date as d
    from start_day,
         generate_series(
           (select d from start_day),
           (select d from start_day) - interval '365 days',
           interval '-1 day'
         ) gs
    where (select d from start_day) is not null
  ),
  mark as (
    select
      s.d,
      (wd.d is not null) as has_workout,
      -- Första missen bryter streaken; vi summerar missar uppifrån och ned
      sum(case when wd.d is null then 1 else 0 end)
        over (order by s.d desc rows between unbounded preceding and current row) as miss_cum
    from day_series s
    left join workout_days wd on wd.d = s.d
  )
  select coalesce(count(*), 0)::int
  from mark
  where has_workout and miss_cum = 0;
$function$
;

CREATE OR REPLACE FUNCTION public.api_log_workout(p_started timestamp with time zone, p_finished timestamp with time zone, p_plan jsonb, p_logs jsonb, p_meta jsonb DEFAULT '{}'::jsonb)
 RETURNS uuid
 LANGUAGE sql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  insert into workout_sessions(
    user_id, started_at, finished_at, plan, logs, meta, gym_id
  )
  values (
    auth.uid(),
    p_started,
    p_finished,
    p_plan,
    p_logs,
    coalesce(p_meta, '{}'::jsonb),
    nullif(p_plan->'gym'->>'id', '')
  )
  returning id;
$function$
;

CREATE OR REPLACE FUNCTION public.api_profile_stats(p_user uuid)
 RETURNS TABLE(total_workouts integer, total_seconds integer, favorite_gym text)
 LANGUAGE sql
 STABLE
AS $function$
  with base as (
    select *
    from workout_sessions w
    where w.user_id = p_user
  ),
  totals as (
    select
      count(*)::int as total_workouts,
      coalesce(sum(extract(epoch from coalesce(finished_at, now()) - started_at))::int, 0) as total_seconds
    from base
  ),
  fav as (
    select coalesce(g.name, w.plan->'gym'->>'name') as gym_name, count(*) as c
    from base w
    left join gyms g on g.id = (w.plan->'gym'->>'id')
    group by 1
    order by c desc nulls last
    limit 1
  )
  select
    totals.total_workouts,
    totals.total_seconds,
    fav.gym_name as favorite_gym
  from totals, fav;
$function$
;

CREATE OR REPLACE FUNCTION public.api_profile_stats(p_user uuid, p_tz text DEFAULT 'UTC'::text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  v_total     int := 0;
  v_minutes   int := 0;
  v_fav_gym   text := null;
  v_streak    int := 0;
  v_today     date := (now() at time zone p_tz)::date;
  i           int;
begin
  -- Totala pass (färdigställda)
  select count(*)::int
    into v_total
    from public.workout_sessions ws
   where ws.user_id = p_user
     and ws.finished_at is not null;

  -- Total tid i minuter
  select coalesce(sum(extract(epoch from (ws.finished_at - ws.started_at)) / 60)::int, 0)
    into v_minutes
    from public.workout_sessions ws
   where ws.user_id = p_user
     and ws.finished_at is not null
     and ws.started_at is not null
     and ws.finished_at > ws.started_at;

  -- Favoritgym (flest pass)
  select g.name
    into v_fav_gym
    from public.workout_sessions ws
    join public.gyms g on g.id = ws.gym_id
   where ws.user_id = p_user
   group by g.name
   order by count(*) desc, max(ws.finished_at) desc
   limit 1;

  -- Streak: räkna konsekutiva dagar från idag bakåt med minst ett pass
  v_streak := 0;
  for i in 0..365 loop
    if exists (
      select 1
        from public.workout_sessions ws
       where ws.user_id = p_user
         and ws.finished_at is not null
         and (ws.finished_at at time zone p_tz)::date = (v_today - i)
    ) then
      v_streak := v_streak + 1;
    else
      exit; -- första miss → sluta räkna
    end if;
  end loop;

  return jsonb_build_object(
    'total_workouts', v_total,
    'total_time_minutes', v_minutes,
    'favorite_gym_name', v_fav_gym,
    'current_streak', v_streak
  );
end;
$function$
;

CREATE OR REPLACE FUNCTION public.api_recent_activity(p_user uuid, p_limit integer DEFAULT 20)
 RETURNS TABLE(id uuid, started_at timestamp with time zone, finished_at timestamp with time zone, title text, gym_name text, rating integer, duration_seconds integer)
 LANGUAGE sql
 STABLE
AS $function$
  select
    w.id,
    w.started_at,
    w.finished_at,
    coalesce(
      w.plan->'method'->>'name_sv',
      w.plan->'method'->>'name',
      'Träningspass'
    ) as title,
    coalesce(g.name, w.plan->'gym'->>'name') as gym_name,
    nullif((w.meta->>'rating')::int, 0) as rating,
    greatest(
      0,
      round(extract(epoch from coalesce(w.finished_at, now()) - w.started_at))
    )::int as duration_seconds
  from workout_sessions w
  left join gyms g
    on g.id = (w.plan->'gym'->>'id')
  where w.user_id = p_user
  order by coalesce(w.finished_at, w.started_at) desc
  limit p_limit;
$function$
;

CREATE OR REPLACE FUNCTION public.api_recent_workouts(p_user uuid, p_tz text, p_limit integer DEFAULT 10)
 RETURNS TABLE(id uuid, title text, gym_name text, when_iso timestamp with time zone)
 LANGUAGE sql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  select
    ws.id,
    coalesce(ws.plan->>'title', 'Träningspass') as title,
    g.name as gym_name,
    coalesce(ws.finished_at, ws.started_at)     as when_iso
  from workout_sessions ws
  left join gyms g on g.id = ws.gym_id
  where ws.user_id = p_user
  order by coalesce(ws.finished_at, ws.started_at) desc
  limit greatest(p_limit, 1);
$function$
;

CREATE OR REPLACE FUNCTION public.exercises_for_equipment(p_equipment text[] DEFAULT NULL::text[], p_focus text DEFAULT NULL::text)
 RETURNS TABLE(key text, name text, name_sv text, focus text, modality text, difficulty text, bodyweight_ok boolean)
 LANGUAGE sql
 STABLE
AS $function$
  select distinct e.key, e.name, e.name_sv, e.focus, e.modality, e.difficulty, e.bodyweight_ok
  from public.outdoor_exercises e
  left join public.exercise_equipment_map m on m.exercise_key = e.key
  where
    -- utrustningsmatch: om ingen utrustning skickas, tillåt bodyweight_ok
    (
      p_equipment is null
      or m.equipment_key = any(p_equipment)
      or e.bodyweight_ok = true
    )
    and
    -- fokusmatch: tillåt alltid 'full', annars matcha exakt eller låt null passera
    (
      p_focus is null
      or e.focus = p_focus
      or e.focus = 'full'
    );
$function$
;

create type "public"."geometry_dump" as ("path" integer[], "geom" geometry);

create or replace view "public"."gym_preview" as  SELECT id,
    name,
    city,
    address,
    website,
    google_rating,
    lat,
    lon,
    image_url,
    ( SELECT p.name
           FROM photos p
          WHERE ((p.gym_id = g.id) OR ((g.google_place_id IS NOT NULL) AND (p.place_id = g.google_place_id)))
          ORDER BY COALESCE(p."widthPx", 0) DESC NULLS LAST
         LIMIT 1) AS photo_key
   FROM gyms g;


create or replace view "public"."gym_with_equipment" as  SELECT g.id AS gym_id,
    g.name,
    g.city,
    g.address,
    g.image_url,
    COALESCE(array_agg(ge.equipment_key ORDER BY ge.equipment_key) FILTER (WHERE (ge.equipment_key IS NOT NULL)), '{}'::text[]) AS equipment_keys,
    COALESCE(json_agg(json_build_object('key', oe.key, 'name', oe.name, 'category', oe.category) ORDER BY oe.key) FILTER (WHERE (oe.key IS NOT NULL)), '[]'::json) AS equipment
   FROM ((gyms g
     LEFT JOIN gym_equipment ge ON ((ge.gym_id = g.id)))
     LEFT JOIN outdoor_equipment oe ON ((oe.key = ge.equipment_key)))
  GROUP BY g.id, g.name, g.city, g.address, g.image_url;


create or replace view "public"."photos_with_gym" as  SELECT p.id,
    p.gym_id,
    p.place_id,
    p.name,
    p."widthPx",
    p."heightPx",
    p.authors,
    p.attributions,
    p.created_at,
    g.id AS resolved_gym_id,
    g.name AS gym_name
   FROM (photos p
     LEFT JOIN gyms g ON ((btrim(p.place_id) = btrim(g.google_place_id))));


CREATE OR REPLACE FUNCTION public.reset_gyms_staging()
 RETURNS void
 LANGUAGE sql
 SECURITY DEFINER
AS $function$
  truncate table public.gyms_staging;
$function$
;

CREATE OR REPLACE FUNCTION public.set_alias(p_alias text)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
declare
  v_clean text := lower(regexp_replace(trim(leading '@' from coalesce(p_alias,'')), '\s+', '', 'g'));
begin
  if length(v_clean) < 2 or length(v_clean) > 30 or v_clean !~ '^[a-z0-9_]+$' then
    raise exception 'Invalid alias';
  end if;

  insert into public.profiles (user_id, alias)
  values (auth.uid(), v_clean)
  on conflict (user_id)
  do update set alias = excluded.alias;
end $function$
;

CREATE OR REPLACE FUNCTION public.set_gym_equipment(p_gym_id text, p_keys text[], p_verified_by uuid DEFAULT NULL::uuid, p_source text DEFAULT 'admin'::text)
 RETURNS void
 LANGUAGE plpgsql
AS $function$
begin
  -- Lägg till/uppdatera de som ska finnas
  insert into public.gym_equipment (gym_id, equipment_key, verified_by, verified_at, source)
  select p_gym_id, k, p_verified_by, now(), p_source
  from unnest(p_keys) as k
  on conflict (gym_id, equipment_key) do update
    set verified_by = excluded.verified_by,
        verified_at = excluded.verified_at,
        source      = excluded.source;

  -- Ta bort de som inte längre ska finnas
  delete from public.gym_equipment ge
  where ge.gym_id = p_gym_id
    and (p_keys is null or ge.equipment_key <> all(p_keys));
end;
$function$
;

CREATE OR REPLACE FUNCTION public.set_updated_at()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
begin
  new.updated_at = now();
  return new;
end $function$
;

CREATE OR REPLACE FUNCTION public.sync_gyms_from_staging()
 RETURNS void
 LANGUAGE sql
 SECURITY DEFINER
AS $function$
  insert into public.gyms (
    id, name, lat, lon, city, address, website, description,
    image_url, google_place_id, google_rating,
    google_user_ratings_total, google_editorial_summary
  )
  select
    id, name, lat, lon, city, address, website, description,
    image_url, google_place_id, google_rating,
    google_user_ratings_total, google_editorial_summary
  from public.gyms_staging
  on conflict (id) do update set
    name  = excluded.name,
    lat   = excluded.lat,
    lon   = excluded.lon,
    city  = excluded.city,
    address = excluded.address,
    website = excluded.website,
    description = excluded.description,
    image_url = excluded.image_url,
    google_place_id = excluded.google_place_id,
    google_rating   = excluded.google_rating,
    google_user_ratings_total = excluded.google_user_ratings_total,
    google_editorial_summary   = excluded.google_editorial_summary,
    updated_at = now();

  -- rensa bort poster som inte längre finns i staging
  delete from public.gyms g
  where not exists (select 1 from public.gyms_staging s where s.id = g.id);
$function$
;

CREATE OR REPLACE FUNCTION public.touch_updated_at()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
begin
  new.updated_at = now();
  return new;
end $function$
;

create or replace view "public"."v_photos" as  SELECT id,
    gym_id,
    place_id,
    name AS photo_name,
    "widthPx" AS widthpx,
    "heightPx" AS heightpx,
    created_at
   FROM photos;


create type "public"."valid_detail" as ("valid" boolean, "reason" character varying, "location" geometry);

create or replace view "public"."workout_sessions_v" as  SELECT ws.id,
    ws.user_id,
    ws.created_at,
    ws.started_at,
    ws.finished_at,
    ws.plan,
    COALESCE(ws.meta, '{}'::jsonb) AS meta,
    g.name AS gym_name,
    g.image_url AS gym_image_url
   FROM (workout_sessions ws
     LEFT JOIN gyms g ON ((g.id = ((ws.plan -> 'gym'::text) ->> 'id'::text))));


create or replace view "public"."workout_sessions_v2" as  SELECT ws.id,
    ws.user_id,
    ws.started_at AS created_at,
    ws.finished_at,
    ((ws.plan -> 'gym'::text) ->> 'id'::text) AS gym_id,
    g.name AS gym_name,
    g.image_url AS gym_image_url,
    ((ws.meta ->> 'rating'::text))::integer AS rating,
    ws.plan,
    ws.logs,
    ws.meta
   FROM (workout_sessions ws
     LEFT JOIN gyms g ON ((g.id = ((ws.plan -> 'gym'::text) ->> 'id'::text))));


create policy "exeq_select_all"
on "public"."exercise_equipment_map"
as permissive
for select
to public
using (true);


create policy "exeq_write_auth"
on "public"."exercise_equipment_map"
as permissive
for all
to authenticated
using (true)
with check (true);


create policy "ge_select_all"
on "public"."gym_equipment"
as permissive
for select
to public
using (true);


create policy "ge_upsert_auth"
on "public"."gym_equipment"
as permissive
for all
to authenticated
using (true)
with check (true);


create policy "Public read gyms"
on "public"."gyms"
as permissive
for select
to public
using (true);


create policy "gym_preview_select_public"
on "public"."gyms"
as permissive
for select
to anon, authenticated
using (true);


create policy "gyms read"
on "public"."gyms"
as permissive
for select
to anon, authenticated
using (true);


create policy "gyms_public_read"
on "public"."gyms"
as permissive
for select
to anon, authenticated
using (true);


create policy "read gyms"
on "public"."gyms"
as permissive
for select
to authenticated
using (true);


create policy "Public read outdoor_exercises"
on "public"."outdoor_exercises"
as permissive
for select
to public
using (true);


create policy "ex_select_all"
on "public"."outdoor_exercises"
as permissive
for select
to public
using (true);


create policy "ex_write_auth"
on "public"."outdoor_exercises"
as permissive
for all
to authenticated
using (true)
with check (true);


create policy "Public read photos"
on "public"."photos"
as permissive
for select
to public
using (true);


create policy "photos read"
on "public"."photos"
as permissive
for select
to anon, authenticated
using (true);


create policy "photos_select_public"
on "public"."photos"
as permissive
for select
to public
using (true);


create policy "profiles delete own"
on "public"."profiles"
as permissive
for delete
to public
using ((auth.uid() = user_id));


create policy "profiles read all"
on "public"."profiles"
as permissive
for select
to public
using (true);


create policy "profiles update own"
on "public"."profiles"
as permissive
for update
to public
using ((auth.uid() = user_id))
with check ((auth.uid() = user_id));


create policy "profiles upsert own"
on "public"."profiles"
as permissive
for insert
to public
with check ((auth.uid() = user_id));


create policy "logs_insert_own"
on "public"."workout_logs"
as permissive
for insert
to public
with check ((EXISTS ( SELECT 1
   FROM workouts w
  WHERE ((w.id = workout_logs.workout_id) AND (w.user_id = auth.uid())))));


create policy "logs_select_own"
on "public"."workout_logs"
as permissive
for select
to public
using ((EXISTS ( SELECT 1
   FROM workouts w
  WHERE ((w.id = workout_logs.workout_id) AND (w.user_id = auth.uid())))));


create policy "logs_update_own"
on "public"."workout_logs"
as permissive
for update
to public
using ((EXISTS ( SELECT 1
   FROM workouts w
  WHERE ((w.id = workout_logs.workout_id) AND (w.user_id = auth.uid())))));


create policy "Users delete own workout_sessions"
on "public"."workout_sessions"
as permissive
for delete
to public
using (((auth.role() = 'authenticated'::text) AND (user_id = auth.uid())));


create policy "Users insert own workout_sessions"
on "public"."workout_sessions"
as permissive
for insert
to public
with check (((auth.role() = 'authenticated'::text) AND (user_id = auth.uid())));


create policy "Users select own workout_sessions"
on "public"."workout_sessions"
as permissive
for select
to public
using (((auth.role() = 'authenticated'::text) AND (user_id = auth.uid())));


create policy "Users update own workout_sessions"
on "public"."workout_sessions"
as permissive
for update
to public
using (((auth.role() = 'authenticated'::text) AND (user_id = auth.uid())))
with check ((user_id = auth.uid()));


create policy "insert own sessions"
on "public"."workout_sessions"
as permissive
for insert
to authenticated
with check ((user_id = auth.uid()));


create policy "insert own"
on "public"."workout_sessions"
as permissive
for insert
to authenticated
with check ((user_id = auth.uid()));


create policy "public_select_finished_sessions"
on "public"."workout_sessions"
as permissive
for select
to public
using ((finished_at IS NOT NULL));


create policy "read own workout_sessions"
on "public"."workout_sessions"
as permissive
for select
to authenticated
using ((auth.uid() = user_id));


create policy "select all"
on "public"."workout_sessions"
as permissive
for select
to public
using (true);


create policy "select own sessions"
on "public"."workout_sessions"
as permissive
for select
to authenticated
using ((user_id = auth.uid()));


create policy "select own workouts"
on "public"."workout_sessions"
as permissive
for select
to authenticated
using ((user_id = auth.uid()));


create policy "update own sessions"
on "public"."workout_sessions"
as permissive
for update
to authenticated
using ((user_id = auth.uid()))
with check ((user_id = auth.uid()));


create policy "update own workouts"
on "public"."workout_sessions"
as permissive
for update
to authenticated
using ((user_id = auth.uid()))
with check ((user_id = auth.uid()));


create policy "update own"
on "public"."workout_sessions"
as permissive
for update
to authenticated
using ((user_id = auth.uid()));


create policy "ws insert for anon"
on "public"."workout_sessions"
as permissive
for insert
to anon
with check (true);


create policy "ws select for anon"
on "public"."workout_sessions"
as permissive
for select
to anon
using (true);


create policy "ws update for anon"
on "public"."workout_sessions"
as permissive
for update
to anon
using (true)
with check (true);


create policy "ws_delete_self"
on "public"."workout_sessions"
as permissive
for delete
to authenticated
using ((user_id = auth.uid()));


create policy "ws_insert_self"
on "public"."workout_sessions"
as permissive
for insert
to authenticated
with check ((user_id = auth.uid()));


create policy "ws_select"
on "public"."workout_sessions"
as permissive
for select
to public
using (true);


create policy "ws_select_owner_or_shared"
on "public"."workout_sessions"
as permissive
for select
to authenticated, anon
using (((user_id = auth.uid()) OR (COALESCE(((meta ->> 'share'::text))::boolean, true) = true)));


create policy "ws_update"
on "public"."workout_sessions"
as permissive
for update
to public
using (((user_id IS NULL) OR (auth.uid() = user_id)))
with check (((user_id IS NULL) OR (auth.uid() = user_id)));


create policy "ws_update_self"
on "public"."workout_sessions"
as permissive
for update
to authenticated
using ((user_id = auth.uid()))
with check ((user_id = auth.uid()));


create policy "workouts_insert_own"
on "public"."workouts"
as permissive
for insert
to public
with check ((auth.uid() = user_id));


create policy "workouts_select_own"
on "public"."workouts"
as permissive
for select
to public
using ((auth.uid() = user_id));


create policy "workouts_update_own"
on "public"."workouts"
as permissive
for update
to public
using ((auth.uid() = user_id));


CREATE TRIGGER trg_gym_equipment_updated_at BEFORE UPDATE ON public.gym_equipment FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER gyms_touch BEFORE UPDATE ON public.gyms FOR EACH ROW EXECUTE FUNCTION touch_updated_at();

CREATE TRIGGER trg_profiles_updated_at BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION set_updated_at();


