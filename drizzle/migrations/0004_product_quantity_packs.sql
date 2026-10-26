ALTER TABLE public.products ADD COLUMN packs_enabled boolean NOT NULL DEFAULT false;
ALTER TABLE public.products ADD COLUMN quantity_offers jsonb NOT NULL DEFAULT '[]'::jsonb;
CREATE OR REPLACE FUNCTION public.validate_product_quantity_offers() RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
DECLARE offer jsonb; seen text[] := '{}';
BEGIN
IF jsonb_typeof(NEW.quantity_offers) <> 'array' OR jsonb_array_length(NEW.quantity_offers) > 20 THEN RAISE EXCEPTION 'Maximum 20 packs par produit.'; END IF;
FOR offer IN SELECT value FROM jsonb_array_elements(NEW.quantity_offers) LOOP
IF jsonb_typeof(offer) <> 'object' OR coalesce(offer->>'id','') = '' OR (offer->>'id') = ANY(seen) OR length(offer->>'id') > 100 THEN RAISE EXCEPTION 'Identifiant de pack invalide.'; END IF;
seen := array_append(seen, offer->>'id');
IF jsonb_typeof(offer->'quantity') IS DISTINCT FROM 'number' OR (offer->>'quantity')::numeric <> trunc((offer->>'quantity')::numeric) OR (offer->>'quantity')::numeric NOT BETWEEN 2 AND 100 THEN RAISE EXCEPTION 'Quantité de pack invalide (2 à 100).'; END IF;
IF jsonb_typeof(offer->'price') IS DISTINCT FROM 'number' OR (offer->>'price')::numeric <= 0 OR (offer->>'price')::numeric > NEW.price * (offer->>'quantity')::numeric THEN RAISE EXCEPTION 'Prix du pack invalide ou supérieur au prix normal.'; END IF;
IF coalesce(length(offer->>'label'),0) > 100 OR coalesce(length(offer->>'label_en'),0) > 100 OR coalesce(length(offer->>'label_ar'),0) > 100 OR coalesce(length(offer->>'badge'),0) > 60 OR coalesce(length(offer->>'badge_en'),0) > 60 OR coalesce(length(offer->>'badge_ar'),0) > 60 OR jsonb_typeof(offer->'enabled') IS DISTINCT FROM 'boolean' THEN RAISE EXCEPTION 'Libellé ou activation du pack invalide.'; END IF;
END LOOP;
RETURN NEW;
END $$;
CREATE TRIGGER products_validate_quantity_offers BEFORE INSERT OR UPDATE ON public.products FOR EACH ROW EXECUTE FUNCTION public.validate_product_quantity_offers();
ALTER TABLE public.order_items ADD COLUMN pack_label text NOT NULL DEFAULT '';