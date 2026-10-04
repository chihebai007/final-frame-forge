create type public.app_role as enum ('admin','user');
create table public.user_roles (id uuid primary key default gen_random_uuid(), user_id uuid not null references auth.users(id) on delete cascade, role app_role not null, unique(user_id, role));
grant select on public.user_roles to authenticated;
grant all on public.user_roles to service_role;
alter table public.user_roles enable row level security;
create policy "own roles" on public.user_roles for select to authenticated using (user_id = auth.uid());

create or replace function public.has_role(_user_id uuid, _role app_role) returns boolean language sql stable security definer set search_path = public as $$ select exists (select 1 from public.user_roles where user_id=_user_id and role=_role) $$;

-- The very first signed-in account can claim admin; afterwards nobody else can.
create or replace function public.claim_first_admin() returns boolean language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is null then return false; end if;
  if exists (select 1 from public.user_roles where role='admin') then
    return public.has_role(auth.uid(),'admin');
  end if;
  insert into public.user_roles(user_id, role) values (auth.uid(), 'admin');
  return true;
end $$;
revoke execute on function public.claim_first_admin() from public, anon;
grant execute on function public.claim_first_admin() to authenticated;

create or replace function public.touch_updated_at() returns trigger language plpgsql set search_path = public as $$ begin new.updated_at = now(); return new; end $$;

create table public.products (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  description text not null default '',
  price numeric(10,2) not null default 0 check (price >= 0),
  stock integer not null default 0 check (stock >= 0),
  size text not null default '',
  category text not null default 'extra-vierge',
  image_url text not null default '',
  active boolean not null default true,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
grant select on public.products to anon, authenticated;
grant insert, update, delete on public.products to authenticated;
grant all on public.products to service_role;
alter table public.products enable row level security;
create policy "public read active products" on public.products for select to anon, authenticated using (active or public.has_role(auth.uid(),'admin'));
create policy "admin manage products" on public.products for all to authenticated using (public.has_role(auth.uid(),'admin')) with check (public.has_role(auth.uid(),'admin'));
create trigger products_touch before update on public.products for each row execute function public.touch_updated_at();

create table public.articles (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  excerpt text not null default '',
  content text not null default '',
  image_url text not null default '',
  published boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
grant select on public.articles to anon, authenticated;
grant insert, update, delete on public.articles to authenticated;
grant all on public.articles to service_role;
alter table public.articles enable row level security;
create policy "public read published articles" on public.articles for select to anon, authenticated using (published or public.has_role(auth.uid(),'admin'));
create policy "admin manage articles" on public.articles for all to authenticated using (public.has_role(auth.uid(),'admin')) with check (public.has_role(auth.uid(),'admin'));
create trigger articles_touch before update on public.articles for each row execute function public.touch_updated_at();

create table public.site_texts (
  key text primary key,
  label text not null default '',
  value text not null default '',
  sort_order integer not null default 0,
  updated_at timestamptz not null default now()
);
grant select on public.site_texts to anon, authenticated;
grant insert, update, delete on public.site_texts to authenticated;
grant all on public.site_texts to service_role;
alter table public.site_texts enable row level security;
create policy "public read texts" on public.site_texts for select to anon, authenticated using (true);
create policy "admin manage texts" on public.site_texts for all to authenticated using (public.has_role(auth.uid(),'admin')) with check (public.has_role(auth.uid(),'admin'));
create trigger texts_touch before update on public.site_texts for each row execute function public.touch_updated_at();

create table public.orders (
  id uuid primary key default gen_random_uuid(),
  order_number serial unique,
  first_name text not null, last_name text not null, phone text not null,
  email text not null default '', wilaya text not null, commune text not null, address text not null,
  total numeric(10,2) not null default 0,
  status text not null default 'nouvelle',
  created_at timestamptz not null default now()
);
create table public.order_items (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id) on delete cascade,
  product_id uuid references public.products(id) on delete set null,
  product_name text not null,
  quantity integer not null check (quantity > 0),
  unit_price numeric(10,2) not null
);
grant select, update, delete on public.orders, public.order_items to authenticated;
grant all on public.orders, public.order_items to service_role;
grant usage on sequence public.orders_order_number_seq to service_role;
alter table public.orders enable row level security;
alter table public.order_items enable row level security;
create policy "admin orders" on public.orders for all to authenticated using (public.has_role(auth.uid(),'admin')) with check (public.has_role(auth.uid(),'admin'));
create policy "admin order items" on public.order_items for all to authenticated using (public.has_role(auth.uid(),'admin')) with check (public.has_role(auth.uid(),'admin'));

create table public.contact_messages (
  id uuid primary key default gen_random_uuid(),
  name text not null, email text not null, message text not null,
  created_at timestamptz not null default now()
);
grant select, delete on public.contact_messages to authenticated;
grant all on public.contact_messages to service_role;
alter table public.contact_messages enable row level security;
create policy "admin messages" on public.contact_messages for all to authenticated using (public.has_role(auth.uid(),'admin')) with check (public.has_role(auth.uid(),'admin'));

insert into public.products (name, description, price, stock, size, category, image_url, sort_order) values
('Huile d’olive Extra Vierge MITINAN','Huile d’olive extra vierge issue du terroir de Kabylie.',1800,50,'1 L','extra-vierge','/images/IMG-20260706-WA0064.jpg',1),
('Huile d’olive Vierge MITINAN','Une huile authentique, naturelle et enracinée dans la tradition.',1500,50,'1 L','vierge','/images/IMG-20260706-WA0063.jpg',2);

insert into public.articles (title, excerpt, image_url) values
('La récolte des olives en Kabylie','Découvrez comment nos olives sont récoltées à la main dans les montagnes de Mitinan.','/images/IMG-20260706-WA0062.jpg'),
('L’extraction à froid','Un procédé qui préserve tous les arômes et les bienfaits de l’huile.','/images/IMG-20260706-WA0061.jpg'),
('Notre terroir','Souk El Khamis, Bouira : une terre d’oliviers centenaires.','/images/IMG-20260706-WA0065.jpg');

insert into public.site_texts (key, label, value, sort_order) values
('hero_eyebrow','Accueil — petit titre','HUILE D’OLIVE VIERGE & VIERGE EXTRA',1),
('hero_title','Accueil — grand titre','MITINAN',2),
('hero_tagline','Accueil — slogan','Oil from the mountains of Mitinan',3),
('hero_text','Accueil — texte','Une huile d’olive authentique, directement des montagnes de Kabylie. Extraction à froid, 100% naturelle.',4),
('hero_button','Accueil — bouton','Découvrir nos produits →',5),
('products_title','Nos produits — titre','Nos produits',10),
('products_text','Nos produits — texte','Une gamme d’huiles d’olive enracinée dans un savoir-faire traditionnel.',11),
('extra_title','Carte Extra Vierge — titre','Extra Vierge',12),
('extra_text','Carte Extra Vierge — texte','Goût intense, arômes naturels, qualité supérieure.',13),
('virgin_title','Carte Vierge — titre','Vierge',14),
('virgin_text','Carte Vierge — texte','Une saveur authentique, à la fois douce et fruitée.',15),
('story_title','Notre histoire — titre','Une tradition familiale au cœur de la Kabylie',20),
('story_text','Notre histoire — texte','MITINAN est née d’une passion : celle de notre terre, de nos oliviers et de notre héritage. Notre ambition est de partager une huile authentique, naturelle et profondément liée aux montagnes de Kabylie.',21),
('shop_title','Boutique — titre','Nos huiles',30),
('cta_title','Bandeau pro — titre','Vous cherchez une production spécifique ?',40),
('cta_text','Bandeau pro — texte','Contactez MITINAN pour vos demandes professionnelles et vos besoins en volume.',41),
('articles_title','Actualités — titre','Nos actualités',50),
('articles_text','Actualités — texte','Terroir, récolte, huile d’olive et vie de la marque.',51),
('contact_title','Contact — titre','Parlons de MITINAN',60),
('contact_text','Contact — texte','Pour les particuliers, revendeurs, grossistes et partenaires.',61),
('contact_email','Contact — email','huileriemitinan@gmail.com',62),
('contact_address','Contact — adresse','Souk El Khamis, (W) Bouira, Algérie',63),
('contact_phone_sales','Contact — tél. commercial','+33 6 23 80 68 01',64),
('contact_phone_consumer','Contact — tél. consommateurs','+213 550 133 025',65),
('footer_copyright','Pied de page — copyright','© 2026 MITINAN. Tous droits réservés.',70);