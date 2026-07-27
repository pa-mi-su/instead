create table if not exists public.routines (
  id uuid primary key default gen_random_uuid(),
  slug text unique not null,
  title text not null,
  prompt text not null,
  category text not null,
  icon text not null default '○',
  answer text not null,
  answer_tone text not null check (answer_tone in ('yes', 'depends', 'no')),
  summary text not null,
  essentials jsonb not null default '[]'::jsonb,
  skip_note text not null,
  avoid jsonb not null default '[]'::jsonb,
  options jsonb not null default '[]'::jsonb,
  evidence text not null check (evidence in ('Strong', 'Moderate', 'Limited')),
  evidence_note text not null,
  updated_at_label text not null,
  featured boolean not null default false,
  published boolean not null default false,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.routines enable row level security;

create policy "Published routines are publicly readable"
on public.routines for select
using (published = true);

create index if not exists routines_published_sort_idx
on public.routines (published, sort_order);
