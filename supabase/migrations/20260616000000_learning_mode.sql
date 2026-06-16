-- ============================================================
-- Learning Mode — courses, subtopics, and extended learnings
-- ============================================================

-- ─── courses ───────────────────────────────────────────────
create table if not exists courses (
  id              text primary key,
  user_id         text not null default 'local_user',
  name            text not null,
  description     text,
  total_subtopics int  not null default 0,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

-- ─── subtopics ─────────────────────────────────────────────
create table if not exists subtopics (
  id          text primary key,
  course_id   text not null references courses(id) on delete cascade,
  user_id     text not null default 'local_user',
  title       text not null,
  description text,
  sort_order  int not null default 0,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create index if not exists subtopics_course_id_idx on subtopics(course_id);

-- ─── extend learnings with card_type and subtopic source ───
alter table learnings
  add column if not exists card_type text not null default 'note'
    check (card_type in ('note','learning','flow','image'));

alter table learnings
  add column if not exists source_subtopic_id text references subtopics(id) on delete set null;

alter table learnings
  add column if not exists source_subtopic_title text;

alter table learnings
  add column if not exists source_course_id text references courses(id) on delete set null;

alter table learnings
  add column if not exists source_course_name text;

-- allow subtopic as a source_type
alter table learnings drop constraint if exists learnings_source_type_check;
alter table learnings add constraint learnings_source_type_check
  check (source_type in ('task','general','subtopic'));

create index if not exists learnings_source_subtopic_id_idx on learnings(source_subtopic_id);
create index if not exists learnings_source_course_id_idx on learnings(source_course_id);

-- ─── auto-updated_at triggers ──────────────────────────────
create trigger trg_courses_updated_at
  before update on courses
  for each row execute function set_updated_at();

create trigger trg_subtopics_updated_at
  before update on subtopics
  for each row execute function set_updated_at();
