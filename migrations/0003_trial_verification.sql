-- Trial + post-trial email NIP verification (app-owned; Better Auth keeps emailVerified).
-- New users get a 15-day trial; after it ends they must enter a NIP emailed here.

create table if not exists user_trials (
  user_id text primary key,
  trial_started_at timestamptz not null default now(),
  trial_ends_at timestamptz not null,
  verified_at timestamptz,
  nip_hash text,
  nip_expires_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists user_trials_trial_ends_at_idx on user_trials (trial_ends_at);
