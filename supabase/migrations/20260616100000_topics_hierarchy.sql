-- ============================================================
-- Migration: Add Topics level (Course → Topic → Subtopic)
-- Run this on your private Supabase project via the SQL editor.
-- ============================================================

-- 1. Create topics table
create table if not exists topics (
  id              text primary key,
  course_id       text not null references courses(id) on delete cascade,
  user_id         text not null default 'local_user',
  title           text not null,
  description     text,
  sort_order      int  not null default 0,
  total_subtopics int  not null default 0,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

create index if not exists topics_course_id_idx on topics(course_id);

-- 2. Add topic_id to subtopics (nullable — filled by migration below)
alter table subtopics add column if not exists topic_id text references topics(id) on delete cascade;

-- 3. Add topic columns to learnings
alter table learnings add column if not exists source_topic_id    text;
alter table learnings add column if not exists source_topic_title text;

-- 4. Trigger on topics
drop trigger if exists trg_topics_updated_at on topics;
create trigger trg_topics_updated_at
  before update on topics for each row execute function set_updated_at();

-- 5. Data migration:
--    For every existing subtopic that has no topic_id,
--    promote it to a Topic, create a "General" subtopic under it,
--    and move its learnings to the new subtopic.
do $$
declare
  old_sub       record;
  new_topic_id  text;
  new_sub_id    text;
  ts_ms         bigint;
begin
  for old_sub in select * from subtopics where topic_id is null loop
    ts_ms := floor(extract(epoch from clock_timestamp()) * 1000)::bigint;

    -- new ids
    new_topic_id := 'topic_'   || ts_ms || '_' || substr(md5(old_sub.id),        1, 7);
    new_sub_id   := 'subtopic_'|| ts_ms || '_' || substr(md5(old_sub.id||'gen'), 1, 7);

    -- create topic from old subtopic
    insert into topics (id, course_id, user_id, title, description, sort_order, total_subtopics, created_at, updated_at)
    values (new_topic_id, old_sub.course_id, old_sub.user_id,
            old_sub.title, old_sub.description, old_sub.sort_order,
            1, old_sub.created_at, clock_timestamp());

    -- create a "General" leaf subtopic under the new topic
    insert into subtopics (id, course_id, topic_id, user_id, title, sort_order, created_at, updated_at)
    values (new_sub_id, old_sub.course_id, new_topic_id, old_sub.user_id,
            'General', 0, clock_timestamp(), clock_timestamp());

    -- move learnings: point to new subtopic + set topic fields
    update learnings
    set source_subtopic_id    = new_sub_id,
        source_subtopic_title = 'General',
        source_topic_id       = new_topic_id,
        source_topic_title    = old_sub.title,
        updated_at            = clock_timestamp()
    where source_subtopic_id = old_sub.id;

    -- delete old promoted subtopic
    delete from subtopics where id = old_sub.id;

    -- small sleep to avoid identical ts_ms on fast machines
    perform pg_sleep(0.001);
  end loop;
end $$;

-- 6. Add FK from learnings.source_topic_id → topics.id
do $$ begin
  if not exists (
    select 1 from information_schema.table_constraints
    where constraint_name = 'learnings_source_topic_id_fkey'
  ) then
    alter table learnings
      add constraint learnings_source_topic_id_fkey
      foreign key (source_topic_id) references topics(id) on delete set null;
  end if;
end $$;
