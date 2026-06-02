-- Columns not in the initial schema that the app needs

-- project task counts (maintained by syncProjectTaskCounts)
alter table projects
  add column if not exists total_tasks     int not null default 0,
  add column if not exists completed_tasks int not null default 0;

-- image data-urls stored directly on the task row (Storage migration is a later step)
alter table tasks
  add column if not exists card_description_images jsonb not null default '[]',
  add column if not exists task_notes_images       jsonb not null default '[]';

-- learning attachment data-urls + source display names
alter table learnings
  add column if not exists attachments         jsonb not null default '[]',
  add column if not exists source_task_title   text,
  add column if not exists source_project_name text;
