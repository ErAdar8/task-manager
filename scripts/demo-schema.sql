-- ============================================================
-- Task Helper — demo project schema
-- Run this on a fresh Supabase project to set up the demo DB.
-- Safe to re-run: uses IF NOT EXISTS / CREATE OR REPLACE.
-- ============================================================

-- ─── projects ───────────────────────────────────────────────
create table if not exists projects (
  id              text primary key,
  user_id         text not null default 'local_user',
  name            text not null,
  description     text,
  repo_scan       text,
  total_tasks     int  not null default 0,
  completed_tasks int  not null default 0,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

-- ─── tasks ──────────────────────────────────────────────────
create table if not exists tasks (
  id                          text primary key,
  project_id                  text not null references projects(id) on delete cascade,
  user_id                     text not null default 'local_user',
  title                       text not null,
  raw_input                   text          not null default '',
  status                      text not null default 'draft'
                                check (status in ('draft','analyzing','ready','understanding',
                                                  'architecture_ready','in_progress','completed')),
  analysis_mode               text
                                check (analysis_mode in ('execute','understand','testing_understand',
                                                         'qa_kalk','qa_general')),
  last_analysis_kind          text
                                check (last_analysis_kind in ('execute','understand','testing_understand',
                                                              'qa_kalk','qa_general')),
  understanding               jsonb,
  understanding_approved      boolean not null default false,
  requested_clarifications    text[]  not null default '{}',
  user_edited_understanding   text,
  architecture                jsonb,
  task_notes                  text          not null default '',
  task_notes_images           jsonb         not null default '[]',
  card_description_images     jsonb         not null default '[]',
  cursor_repo_analysis        text          not null default '',
  cursor_repo_scan            text          not null default '',
  work_process                text          not null default '',
  main_problem                text          not null default '',
  key_concepts                jsonb         not null default '[]',
  issues                      jsonb         not null default '[]',
  canonical_execute_result    jsonb,
  canonical_understand_result jsonb,
  canonical_testing_result    jsonb,
  canonical_qa_result         jsonb,
  analysis_error              text,
  analysis_partial            boolean       not null default false,
  created_at                  timestamptz   not null default now(),
  updated_at                  timestamptz   not null default now(),
  completed_at                timestamptz
);

create index if not exists tasks_project_id_idx on tasks(project_id);
create index if not exists tasks_status_idx     on tasks(status);

-- ─── learnings ──────────────────────────────────────────────
create table if not exists learnings (
  id                   text primary key,
  user_id              text not null default 'local_user',
  title                text,
  content              text not null,
  category             text,
  attachments          jsonb not null default '[]',
  source_type          text not null check (source_type in ('task','general')),
  source_task_id       text references tasks(id)    on delete set null,
  source_task_title    text,
  source_project_id    text references projects(id) on delete set null,
  source_project_name  text,
  created_at           timestamptz not null default now(),
  updated_at           timestamptz not null default now()
);

create index if not exists learnings_source_task_id_idx    on learnings(source_task_id);
create index if not exists learnings_source_project_id_idx on learnings(source_project_id);

-- ─── notes ──────────────────────────────────────────────────
create table if not exists notes (
  id         text primary key,
  user_id    text not null default 'local_user',
  title      text not null,
  content    text not null,
  tags       text[] not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ─── updated_at trigger ─────────────────────────────────────
create or replace function set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_projects_updated_at  on projects;
drop trigger if exists trg_tasks_updated_at     on tasks;
drop trigger if exists trg_learnings_updated_at on learnings;
drop trigger if exists trg_notes_updated_at     on notes;

create trigger trg_projects_updated_at
  before update on projects for each row execute function set_updated_at();
create trigger trg_tasks_updated_at
  before update on tasks    for each row execute function set_updated_at();
create trigger trg_learnings_updated_at
  before update on learnings for each row execute function set_updated_at();
create trigger trg_notes_updated_at
  before update on notes     for each row execute function set_updated_at();
