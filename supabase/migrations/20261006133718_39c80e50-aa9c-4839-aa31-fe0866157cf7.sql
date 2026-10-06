alter table public.orders add column destination text not null default 'algerie', add column country text not null default '';

create table public.reviews (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products(id) on delete cascade,
  name text not null,
  rating integer not null,
  comment text not null default '',
  approved boolean not null default false,
  created_at timestamptz not null default now()
);
grant select on public.reviews to anon;
grant select, insert, update, delete on public.reviews to authenticated;
grant all on public.reviews to service_role;
alter table public.reviews enable row level security;
create policy "public read approved reviews" on public.reviews for select to anon, authenticated using (approved or public.has_role(auth.uid(),'admin'));
create policy "admin manage reviews" on public.reviews for all to authenticated using (public.has_role(auth.uid(),'admin')) with check (public.has_role(auth.uid(),'admin'));

create table public.awards (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  year text not null default '',
  description text not null default '',
  image_url text not null default '',
  published boolean not null default true,
  sort_order integer not null default 0,
  created_at timestamptz not null default now()
);
grant select on public.awards to anon;
grant select, insert, update, delete on public.awards to authenticated;
grant all on public.awards to service_role;
alter table public.awards enable row level security;
create policy "public read awards" on public.awards for select to anon, authenticated using (published or public.has_role(auth.uid(),'admin'));
create policy "admin manage awards" on public.awards for all to authenticated using (public.has_role(auth.uid(),'admin')) with check (public.has_role(auth.uid(),'admin'));