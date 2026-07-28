create table if not exists public.guides (
  id uuid primary key default gen_random_uuid(),
  slug text unique not null,
  title text not null,
  prompt text not null,
  category text not null,
  icon text not null default '○',
  answer text not null,
  answer_tone text not null check (answer_tone in ('yes', 'depends', 'no')),
  summary text not null,
  time text not null,
  estimated_cost text not null,
  estimated_savings text not null,
  difficulty text not null check (difficulty in ('Easy', 'Moderate', 'Advanced')),
  supplies jsonb not null default '[]'::jsonb,
  essentials jsonb not null default '[]'::jsonb,
  skip_note text not null,
  avoid jsonb not null default '[]'::jsonb,
  options jsonb not null default '[]'::jsonb,
  safety_note text not null,
  professional_help jsonb not null default '[]'::jsonb,
  evidence text not null check (evidence in ('Strong', 'Moderate', 'Limited')),
  evidence_note text not null,
  updated_at_label text not null,
  featured boolean not null default false,
  published boolean not null default false,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.guides enable row level security;

drop policy if exists "Published guides are publicly readable" on public.guides;
create policy "Published guides are publicly readable"
on public.guides for select
using (published = true);

grant select on table public.guides to anon, authenticated;
revoke insert, update, delete on table public.guides from anon, authenticated;

create index if not exists guides_published_sort_idx
on public.guides (published, sort_order);
