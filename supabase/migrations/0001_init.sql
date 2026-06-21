-- =====================================================================
-- Stacks — initial schema
-- A personal library + reading-habit app. One library per account.
--
-- Design notes:
--  * Everything is owned by exactly one user. RLS is owner-only: every
--    row carries user_id and policies require user_id = auth.uid(). A user
--    can NEVER see another user's data.
--  * `books` is the catalog (one row per owned/wishlisted book). It holds
--    every classification + reading-state field directly.
--  * Many-axis classification: `tags` (kind = genre/mood/theme/tag) joined
--    via `book_tags`, plus user `collections` (shelves) via `collection_books`,
--    plus structured Dewey/genre fields on the book itself.
--  * `reading_sessions` is the habit log (pages + optional minutes per day);
--    it powers the charts, streaks, and reading-speed trend.
--  * Join tables denormalize user_id so RLS stays simple + fast.
-- =====================================================================

create extension if not exists "pgcrypto";   -- gen_random_uuid()

-- keep updated_at fresh (shared trigger fn)
create or replace function set_updated_at() returns trigger
language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end; $$;

-- ---------------------------------------------------------------------
-- profiles — one row per auth user. Holds reading goals + timezone.
-- ---------------------------------------------------------------------
create table if not exists profiles (
  id                   uuid primary key references auth.users on delete cascade,
  email                text,
  full_name            text,
  timezone             text not null default 'UTC',
  goal_books_per_year  int  not null default 24,
  goal_pages_per_day   int  not null default 25,
  goal_minutes_per_day int  not null default 20,
  created_at           timestamptz not null default now()
);

-- ---------------------------------------------------------------------
-- locations — where a book physically lives, nested (Room › Shelf › Row).
-- ---------------------------------------------------------------------
create table if not exists locations (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users on delete cascade,
  name        text not null,
  parent_id   uuid references locations on delete set null,
  created_at  timestamptz not null default now()
);
create index if not exists idx_locations_user on locations(user_id);

-- ---------------------------------------------------------------------
-- tags — the many-axis classifier. kind separates genres from moods,
-- themes, and free-form tags so they can be filtered independently.
-- ---------------------------------------------------------------------
create table if not exists tags (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users on delete cascade,
  name        text not null,
  kind        text not null default 'tag'
              check (kind in ('genre','mood','theme','tag')),
  color       text not null default 'slate',
  created_at  timestamptz not null default now(),
  unique (user_id, kind, name)
);
create index if not exists idx_tags_user on tags(user_id);

-- ---------------------------------------------------------------------
-- collections — user-defined shelves ("Favorites", "Signed", "To lend").
-- ---------------------------------------------------------------------
create table if not exists collections (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users on delete cascade,
  name        text not null,
  description text,
  color       text not null default 'blue',
  sort_order  int  not null default 0,
  created_at  timestamptz not null default now()
);
create index if not exists idx_collections_user on collections(user_id);

-- ---------------------------------------------------------------------
-- books — the catalog. Every classification + reading-state field lives
-- here directly for fast filtering.
-- ---------------------------------------------------------------------
create table if not exists books (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null references auth.users on delete cascade,
  -- identity
  title         text not null,
  subtitle      text,
  authors       text[] not null default '{}',
  isbn10        text,
  isbn13        text,
  cover_url     text,
  publisher     text,
  published_year int,
  page_count    int,
  language      text,
  description   text,
  -- classification
  format        text check (format in ('hardcover','paperback','ebook','audiobook','other')),
  series_name   text,
  series_index  numeric,
  classification_system text check (classification_system in ('genre','dewey','custom')),
  classification        text,
  classification_code   text,
  -- ownership / physical
  ownership     text not null default 'owned'
                check (ownership in ('owned','wishlist','borrowed','lent_out')),
  condition     text,
  acquired_on   date,
  source        text,
  location_id   uuid references locations on delete set null,
  -- reading state
  read_status   text not null default 'unread'
                check (read_status in ('unread','reading','read')),
  times_read    int not null default 0,
  rating        numeric check (rating >= 0 and rating <= 5),
  favorite      boolean not null default false,
  current_page  int,                 -- the bookmark (where you left off)
  review        text,
  started_on    date,
  finished_on   date,
  queue_position int,                 -- null = not in the to-read queue
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

create index if not exists idx_books_user        on books(user_id);
create index if not exists idx_books_status       on books(user_id, read_status);
create index if not exists idx_books_queue        on books(user_id, queue_position);
create index if not exists idx_books_location     on books(user_id, location_id);

drop trigger if exists trg_books_updated on books;
create trigger trg_books_updated before update on books
  for each row execute function set_updated_at();

-- ---------------------------------------------------------------------
-- join tables (user_id denormalized for RLS)
-- ---------------------------------------------------------------------
create table if not exists book_tags (
  book_id  uuid not null references books on delete cascade,
  tag_id   uuid not null references tags on delete cascade,
  user_id  uuid not null references auth.users on delete cascade,
  primary key (book_id, tag_id)
);
create index if not exists idx_book_tags_user on book_tags(user_id);
create index if not exists idx_book_tags_tag  on book_tags(tag_id);

create table if not exists collection_books (
  collection_id uuid not null references collections on delete cascade,
  book_id       uuid not null references books on delete cascade,
  user_id       uuid not null references auth.users on delete cascade,
  primary key (collection_id, book_id)
);
create index if not exists idx_collection_books_user on collection_books(user_id);
create index if not exists idx_collection_books_book on collection_books(book_id);

-- ---------------------------------------------------------------------
-- reading_sessions — the habit log.
-- ---------------------------------------------------------------------
create table if not exists reading_sessions (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users on delete cascade,
  book_id     uuid not null references books on delete cascade,
  happened_on date not null default current_date,
  pages_read  int not null default 0,
  minutes     int,                  -- optional; enables reading-speed trend
  end_page    int,                  -- optional; auto-advances the bookmark
  note        text,
  created_at  timestamptz not null default now()
);
create index if not exists idx_sessions_user on reading_sessions(user_id, happened_on desc);
create index if not exists idx_sessions_book on reading_sessions(book_id);

-- =====================================================================
-- Row Level Security — strictly owner-only on every table.
-- =====================================================================
alter table profiles         enable row level security;
alter table locations        enable row level security;
alter table tags             enable row level security;
alter table collections      enable row level security;
alter table books            enable row level security;
alter table book_tags        enable row level security;
alter table collection_books enable row level security;
alter table reading_sessions enable row level security;

drop policy if exists profiles_owner on profiles;
create policy profiles_owner on profiles
  for all using (id = auth.uid()) with check (id = auth.uid());

drop policy if exists locations_owner on locations;
create policy locations_owner on locations
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());

drop policy if exists tags_owner on tags;
create policy tags_owner on tags
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());

drop policy if exists collections_owner on collections;
create policy collections_owner on collections
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());

drop policy if exists books_owner on books;
create policy books_owner on books
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());

drop policy if exists book_tags_owner on book_tags;
create policy book_tags_owner on book_tags
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());

drop policy if exists collection_books_owner on collection_books;
create policy collection_books_owner on collection_books
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());

drop policy if exists reading_sessions_owner on reading_sessions;
create policy reading_sessions_owner on reading_sessions
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());

-- =====================================================================
-- New-user bootstrap: profile + a starter location, a "Favorites"
-- collection, and a handful of common genre tags so the first screen is
-- useful immediately.
-- =====================================================================
create or replace function handle_new_user()
returns trigger
language plpgsql security definer
set search_path = public as $$
begin
  insert into profiles (id, email, full_name)
  values (new.id, new.email,
          coalesce(new.raw_user_meta_data->>'full_name', new.email))
  on conflict (id) do nothing;

  insert into locations (user_id, name) values (new.id, 'Home');

  insert into collections (user_id, name, color, sort_order) values
    (new.id, 'Favorites', 'pink', 0),
    (new.id, 'To lend', 'yellow', 1);

  insert into tags (user_id, name, kind, color) values
    (new.id, 'Fiction',         'genre', 'blue'),
    (new.id, 'Non-fiction',     'genre', 'orange'),
    (new.id, 'Science Fiction', 'genre', 'purple'),
    (new.id, 'Fantasy',         'genre', 'purple'),
    (new.id, 'Mystery',         'genre', 'slate'),
    (new.id, 'Biography',       'genre', 'orange'),
    (new.id, 'History',         'genre', 'yellow'),
    (new.id, 'Poetry',          'genre', 'pink'),
    (new.id, 'Classic',         'genre', 'slate'),
    (new.id, 'Comfort read',    'mood',  'pink');

  return new;
end; $$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function handle_new_user();
