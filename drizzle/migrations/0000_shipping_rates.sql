CREATE TABLE public.shipping_rates (
  wilaya_code integer PRIMARY KEY CHECK (wilaya_code BETWEEN 1 AND 69),
  wilaya text NOT NULL,
  home_price numeric NOT NULL DEFAULT 0 CHECK (home_price >= 0),
  desk_price numeric NOT NULL DEFAULT 0 CHECK (desk_price >= 0),
  available boolean NOT NULL DEFAULT true,
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.shipping_rates TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.shipping_rates TO authenticated;
GRANT ALL ON public.shipping_rates TO service_role;
ALTER TABLE public.shipping_rates ENABLE ROW LEVEL SECURITY;
CREATE POLICY "public read rates" ON public.shipping_rates FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "admin manage rates" ON public.shipping_rates FOR ALL TO authenticated USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));
CREATE TRIGGER shipping_rates_touch BEFORE UPDATE ON public.shipping_rates FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();
ALTER TABLE public.orders ADD COLUMN shipping_fee numeric NOT NULL DEFAULT 0, ADD COLUMN delivery_type text NOT NULL DEFAULT 'domicile';
ALTER TABLE public.orders ADD CONSTRAINT orders_delivery_type_valid CHECK (delivery_type IN ('domicile','bureau'));