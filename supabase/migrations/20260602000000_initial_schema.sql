-- ============================================================
-- Task Helper — initial schema
-- ============================================================

-- ─── projects ───────────────────────────────────────────────
create table projects (
  id          text primary key,
  user_id     text not null default 'local_user',
  name        text not null,
  description text,
  repo_scan   text,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

-- ─── tasks ──────────────────────────────────────────────────
create table tasks (
  id                          text primary key,
  project_id                  text not null references projects(id) on delete cascade,
  user_id                     text not null default 'local_user',
  title                       text not null,
  raw_input                   text,
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
  task_notes                  text,
  cursor_repo_analysis        text,
  cursor_repo_scan            text,
  work_process                text,
  main_problem                text,
  key_concepts                jsonb   not null default '[]',
  issues                      jsonb   not null default '[]',
  canonical_execute_result    jsonb,
  canonical_understand_result jsonb,
  canonical_testing_result    jsonb,
  canonical_qa_result         jsonb,
  analysis_error              text,
  analysis_partial            boolean not null default false,
  created_at                  timestamptz not null default now(),
  updated_at                  timestamptz not null default now(),
  completed_at                timestamptz
);

create index tasks_project_id_idx on tasks(project_id);
create index tasks_status_idx     on tasks(status);

-- ─── task_images ────────────────────────────────────────────
-- Replaces card_description_images[] and task_notes_images[] data URLs.
-- Actual files live in Supabase Storage bucket "task-images".
create table task_images (
  id           text primary key,
  task_id      text not null references tasks(id) on delete cascade,
  kind         text not null check (kind in ('card','notes')),
  storage_path text not null,
  created_at   timestamptz not null default now()
);

create index task_images_task_id_idx on task_images(task_id);

-- ─── learnings ──────────────────────────────────────────────
create table learnings (
  id                text primary key,
  user_id           text not null default 'local_user',
  title             text,
  content           text not null,
  category          text,
  source_type       text not null check (source_type in ('task','general')),
  source_task_id    text references tasks(id)    on delete set null,
  source_project_id text references projects(id) on delete set null,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);

create index learnings_source_task_id_idx    on learnings(source_task_id);
create index learnings_source_project_id_idx on learnings(source_project_id);
create index learnings_source_type_idx       on learnings(source_type);

-- ─── learning_attachments ───────────────────────────────────
-- Replaces Learning.attachments[] data URLs.
-- Actual files live in Supabase Storage bucket "learning-attachments".
create table learning_attachments (
  id           text primary key,
  learning_id  text not null references learnings(id) on delete cascade,
  storage_path text not null,
  created_at   timestamptz not null default now()
);

create index learning_attachments_learning_id_idx on learning_attachments(learning_id);

-- ─── notes ──────────────────────────────────────────────────
create table notes (
  id         text primary key,
  user_id    text not null default 'local_user',
  title      text not null,
  content    text not null,
  tags       text[] not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index notes_user_id_idx on notes(user_id);

-- ─── updated_at auto-refresh trigger ────────────────────────
create or replace function set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger trg_projects_updated_at
  before update on projects
  for each row execute function set_updated_at();

create trigger trg_tasks_updated_at
  before update on tasks
  for each row execute function set_updated_at();

create trigger trg_learnings_updated_at
  before update on learnings
  for each row execute function set_updated_at();

create trigger trg_notes_updated_at
  before update on notes
  for each row execute function set_updated_at();

-- ─── computed project stats view ────────────────────────────
create view project_stats as
select
  p.id,
  p.name,
  count(t.id)                                        as total_tasks,
  count(t.id) filter (where t.status = 'completed')  as completed_tasks
from projects p
left join tasks t on t.project_id = p.id
group by p.id, p.name;
