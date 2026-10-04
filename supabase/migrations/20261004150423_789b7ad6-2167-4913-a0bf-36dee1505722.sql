revoke execute on function public.has_role(uuid, app_role) from public, anon;
grant execute on function public.has_role(uuid, app_role) to authenticated;
drop policy "public read active products" on public.products;
create policy "anon read active products" on public.products for select to anon using (active);
create policy "auth read products" on public.products for select to authenticated using (active or public.has_role(auth.uid(),'admin'));
drop policy "public read published articles" on public.articles;
create policy "anon read published articles" on public.articles for select to anon using (published);
create policy "auth read articles" on public.articles for select to authenticated using (published or public.has_role(auth.uid(),'admin'));