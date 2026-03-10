# Supabase Schema

CodeThinker uses Supabase for chat persistence (optional).

## Tables

### sessions
| Column | Type | Notes |
|--------|------|-------|
| id | uuid | primary key (localStorage session ID) |
| user_id | uuid | nullable |
| mode | text | current thinking mode |
| provider | text | ai/cloud/local |
| title | text | auto-generated from first message |
| created_at | timestamptz | |
| updated_at | timestamptz | |

### messages
| Column | Type | Notes |
|--------|------|-------|
| id | uuid | primary key |
| session_id | uuid | FK to sessions |
| role | text | user / assistant / system |
| content | text | message content |
| thinking | text | chain-of-thought steps |
| created_at | timestamptz | |

## Setup

1. Create a Supabase project at https://supabase.com
2. Run the SQL from `migrations/001_init.sql`
3. Add your keys to `.env.local`:
```
NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
```

Chat persistence is optional — CodeThinker works without it.
