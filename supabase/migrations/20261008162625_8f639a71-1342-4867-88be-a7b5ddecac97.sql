alter table public.products
  add column name_ar text not null default '', add column name_en text not null default '',
  add column description_ar text not null default '', add column description_en text not null default '';

drop function if exists public.claim_first_admin();

drop policy if exists "public read approved reviews" on public.reviews;
create policy "anon read approved reviews" on public.reviews for select to anon using (approved);
create policy "auth read reviews" on public.reviews for select to authenticated using (approved or public.has_role(auth.uid(),'admin'));
drop policy if exists "public read awards" on public.awards;
create policy "anon read awards" on public.awards for select to anon using (published);
create policy "auth read awards" on public.awards for select to authenticated using (published or public.has_role(auth.uid(),'admin'));

revoke execute on function public.has_role(uuid, public.app_role) from public, anon;
grant execute on function public.has_role(uuid, public.app_role) to authenticated, service_role;

alter table public.reviews add constraint reviews_rating_range check (rating between 1 and 5);
alter table public.orders add constraint orders_status_valid check (status in ('nouvelle','confirmée','expédiée','livrée','annulée'));