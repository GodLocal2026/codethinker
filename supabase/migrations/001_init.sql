-- CodeThinker chat persistence schema
-- Run this in your Supabase SQL editor

create table if not exists sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade,
  mode text not null default 'vibe',
  provider text not null default 'groq',
  title text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists messages (
  id uuid primary key default gen_random_uuid(),
  session_id uuid references sessions(id) on delete cascade not null,
  role text not null check (role in ('user', 'assistant', 'system')),
  content text not null,
  thinking text,
  created_at timestamptz default now()
);

-- Indexes for performance
create index if not exists idx_messages_session_id on messages(session_id);
create index if not exists idx_sessions_updated_at on sessions(updated_at desc);

-- Enable Row Level Security (optional but recommended)
alter table sessions enable row level security;
alter table messages enable row level security;

-- Allow all operations without auth (public mode)
create policy "allow all" on sessions for all using (true) with check (true);
create policy "allow all" on messages for all using (true) with check (true);
