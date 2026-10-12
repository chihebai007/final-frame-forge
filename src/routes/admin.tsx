import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState, type FormEvent } from "react";
import type { Session } from "@supabase/supabase-js";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import type { Tables } from "@/integrations/supabase/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Toaster } from "@/components/ui/sonner";
import { Shipping } from "@/components/admin/Shipping";

export const Route = createFileRoute("/admin")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Administration — MITINAN" },
      { name: "description", content: "Espace d’administration de la boutique MITINAN." },
      { name: "robots", content: "noindex" },
      { property: "og:title", content: "Administration — MITINAN" },
      { property: "og:description", content: "Espace d’administration de la boutique MITINAN." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: AdminPage,
});

const IMAGES = [
  "/images/IMG-20260706-WA0061.jpg",
  "/images/IMG-20260706-WA0062.jpg",
  "/images/IMG-20260706-WA0063.jpg",
  "/images/IMG-20260706-WA0064.jpg",
  "/images/IMG-20260706-WA0065.jpg",
] as const;
const money = (n: number) => new Intl.NumberFormat("fr-DZ").format(Number(n)) + " DA";
const date = (s: string) => new Date(s).toLocaleString("fr-FR");

function AdminPage() {
  const [session, setSession] = useState<Session | null>(null);
  const [ready, setReady] = useState(false);
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setReady(true);
    });
    const { data } = supabase.auth.onAuthStateChange((_e, s) => setSession(s));
    return () => data.subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (!session) return setIsAdmin(null);
    supabase.rpc("has_role", { _user_id: session.user.id, _role: "admin" }).then(({ data, error }) => setIsAdmin(!error && data === true));
  }, [session?.user.id]);

  return (
    <div className="min-h-screen bg-muted/40">
      <Toaster />
      <header className="border-b bg-primary text-primary-foreground">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-4">
          <a href="/" className="text-xl font-bold tracking-wide">MITINAN · Administration</a>
          {session && (
            <Button variant="secondary" size="sm" onClick={() => supabase.auth.signOut()}>
              Se déconnecter
            </Button>
          )}
        </div>
      </header>
      <main className="mx-auto max-w-6xl px-4 py-8">
        {!ready ? null : !session ? (
          <Login />
        ) : isAdmin === null ? (
          <p>Vérification…</p>
        ) : !isAdmin ? (
          <p className="rounded-md border bg-card p-6">Ce compte n’a pas accès à l’administration.</p>
        ) : (
          <Tabs defaultValue="stats">
            <TabsList className="mb-6 flex-wrap h-auto">
              <TabsTrigger value="stats">Statistiques</TabsTrigger>
              <TabsTrigger value="products">Produits</TabsTrigger>
              <TabsTrigger value="articles">Articles</TabsTrigger>
              <TabsTrigger value="texts">Textes du site</TabsTrigger>
              <TabsTrigger value="photos">Photos du site</TabsTrigger>
              <TabsTrigger value="awards">Distinctions</TabsTrigger>
              <TabsTrigger value="reviews">Avis clients</TabsTrigger>
              <TabsTrigger value="orders">Commandes</TabsTrigger>
              <TabsTrigger value="shipping">Livraison</TabsTrigger>
              <TabsTrigger value="messages">Messages</TabsTrigger>
            </TabsList>
            <TabsContent value="stats"><Stats /></TabsContent>
            <TabsContent value="products"><Products /></TabsContent>
            <TabsContent value="articles"><Articles /></TabsContent>
            <TabsContent value="texts"><Texts /></TabsContent>
            <TabsContent value="photos"><SitePhotos /></TabsContent>
            <TabsContent value="awards"><Awards /></TabsContent>
            <TabsContent value="reviews"><Reviews /></TabsContent>
            <TabsContent value="orders"><Orders /></TabsContent>
            <TabsContent value="shipping"><Shipping /></TabsContent>
            <TabsContent value="messages"><Messages /></TabsContent>
          </Tabs>
        )}
      </main>
    </div>
  );
}

function Login() {
  const [mode, setMode] = useState<"in" | "forgot">("in");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  async function submit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    if (mode === "forgot") {
      const { error } = await supabase.auth.resetPasswordForEmail(email, { redirectTo: `${window.location.origin}/reset-password` });
      setBusy(false);
      if (error) return toast.error(error.message);
      toast.success("Si ce compte existe, un email de réinitialisation vient d’être envoyé.");
      setMode("in");
      return;
    }
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setBusy(false);
    if (error) toast.error("Email ou mot de passe incorrect.");
    return;
  }
  return (
    <form onSubmit={submit} className="mx-auto max-w-sm space-y-4 rounded-lg border bg-card p-6 shadow-sm">
      <h1 className="text-2xl font-bold">{mode === "in" ? "Connexion" : "Mot de passe oublié"}</h1>
      <div className="space-y-2"><Label>Email</Label><Input type="email" required autoComplete="username" value={email} onChange={(e) => setEmail(e.target.value)} /></div>
      {mode === "in" && <div className="space-y-2"><Label>Mot de passe</Label><Input type="password" required autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} /></div>}
      <Button className="w-full" disabled={busy}>{mode === "in" ? "Se connecter" : "Recevoir le lien de réinitialisation"}</Button>
      <button type="button" className="w-full text-sm text-muted-foreground underline" onClick={() => setMode(mode === "in" ? "forgot" : "in")}>
        {mode === "in" ? "Mot de passe oublié ?" : "Retour à la connexion"}
      </button>
    </form>
  );
}

async function fileToDataUrl(file: File): Promise<string> {
  const url = URL.createObjectURL(file);
  try {
    const img = await new Promise<HTMLImageElement>((res, rej) => {
      const i = new Image(); i.onload = () => res(i); i.onerror = rej; i.src = url;
    });
    const max = 1000;
    const scale = Math.min(1, max / Math.max(img.width, img.height));
    const c = document.createElement("canvas");
    c.width = Math.round(img.width * scale); c.height = Math.round(img.height * scale);
    const context = c.getContext("2d");
    if (!context) throw new Error("Impossible de préparer l’image");
    context.drawImage(img, 0, 0, c.width, c.height);
    return c.toDataURL("image/jpeg", 0.8);
  } finally { URL.revokeObjectURL(url); }
}

function ImagePicker({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const custom = value && !(IMAGES as readonly string[]).includes(value) ? value : "";
  async function upload(f?: File): Promise<void> {
    if (!f) return;
    if (!f.type.startsWith("image/")) { toast.error("Choisissez un fichier image"); return; }
    try { onChange(await fileToDataUrl(f)); toast.success("Image ajoutée"); }
    catch { toast.error("Impossible de lire cette image"); }
  }
  const Thumb = ({ src }: { src: string }) => (
    <div className="relative h-16 w-16">
      <Button type="button" variant="ghost" aria-label="Sélectionner cette image" onClick={() => onChange(src)}
        className={`h-full w-full overflow-hidden rounded border-2 p-0 ${value === src ? "border-primary" : "border-transparent"}`}>
        <img src={src} alt="" className="h-full w-full object-cover" />
      </Button>
      {value === src && (
        <Button type="button" variant="destructive" aria-label="Retirer l’image" onClick={() => onChange("")}
          className="absolute -right-2 -top-2 flex h-5 w-5 items-center justify-center rounded-full p-0 text-xs font-bold shadow">×</Button>
      )}
    </div>
  );
  return (
    <div className="space-y-2">
      <Label>Image</Label>
      <div className="flex flex-wrap gap-3 pt-2">
        {custom && <Thumb src={custom} />}
        {IMAGES.map((src) => <Thumb key={src} src={src} />)}
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <label className="inline-flex h-9 cursor-pointer items-center rounded-md border bg-background px-3 text-sm hover:bg-accent">
          📷 Ajouter une image depuis mon appareil
          <input type="file" accept="image/*" className="hidden" onChange={(e) => { upload(e.target.files?.[0]); e.target.value = ""; }} />
        </label>
        {!value && <span className="text-sm text-muted-foreground">Aucune image sélectionnée</span>}
      </div>
      <Input placeholder="ou collez un lien d’image (https://…)" value={value.startsWith("data:") ? "" : value} onChange={(e) => onChange(e.target.value)} />
    </div>
  );
}

const CATEGORIES = [{ v: "extra-vierge", l: "Extra Vierge" }, { v: "vierge", l: "Vierge" }];
function CategoryField({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const known = CATEGORIES.some((c) => c.v === value);
  const [other, setOther] = useState(!known);
  return (
    <div className="space-y-2"><Label>Catégorie</Label>
      <select className="h-9 w-full rounded-md border bg-background px-2" value={other ? "__autre" : value}
        onChange={(e) => { if (e.target.value === "__autre") { setOther(true); onChange(""); } else { setOther(false); onChange(e.target.value); } }}>
        {CATEGORIES.map((c) => <option key={c.v} value={c.v}>{c.l}</option>)}
        <option value="__autre">Autre…</option>
      </select>
      {other && <Input required placeholder="Nom de la catégorie" value={value} onChange={(e) => onChange(e.target.value)} />}
    </div>
  );
}

type Product = Tables<"products">;
const emptyProduct = { name: "", description: "", name_en: "", name_ar: "", description_en: "", description_ar: "", price: 0, stock: 0, size: "1 L", category: "extra-vierge", image_url: IMAGES[3], active: true, sort_order: 0 };

function Products() {
  const [list, setList] = useState<Product[]>([]);
  const [edit, setEdit] = useState<Partial<Product> | null>(null);
  const load = () => supabase.from("products").select("*").order("sort_order").then(({ data }) => setList(data ?? []));
  useEffect(() => { load(); }, []);

  async function save(e: FormEvent) {
    e.preventDefault();
    if (!edit) return;
    const { id, created_at: _c, updated_at: _u, ...row } = edit as Product;
    const payload = { ...row, name: row.name.trim(), price: Number(row.price), stock: Math.max(0, Math.floor(Number(row.stock))) };
    const { error } = id ? await supabase.from("products").update(payload).eq("id", id) : await supabase.from("products").insert(payload);
    if (error) return toast.error(error.message);
    toast.success("Produit enregistré");
    setEdit(null);
    load();
    return;
  }
  async function toggle(p: Product) {
    await supabase.from("products").update({ active: !p.active }).eq("id", p.id);
    load();
  }
  async function remove(p: Product) {
    if (!confirm(`Supprimer définitivement « ${p.name} » ?`)) return;
    const { error } = await supabase.from("products").delete().eq("id", p.id);
    if (error) toast.error(error.message); else load();
  }

  if (edit) return (
    <form onSubmit={save} className="space-y-4 rounded-lg border bg-card p-6">
      <h2 className="text-xl font-semibold">{edit.id ? "Modifier le produit" : "Nouveau produit"}</h2>
      <div className="space-y-2"><Label>Nom</Label><Input required value={edit.name ?? ""} onChange={(e) => setEdit({ ...edit, name: e.target.value })} /></div>
      <div className="space-y-2"><Label>Description</Label><Textarea value={edit.description ?? ""} onChange={(e) => setEdit({ ...edit, description: e.target.value })} /></div>
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2"><Label>Nom en anglais</Label><Input value={edit.name_en ?? ""} onChange={(e) => setEdit({ ...edit, name_en: e.target.value })} /></div>
        <div className="space-y-2"><Label>Nom en arabe</Label><Input dir="rtl" value={edit.name_ar ?? ""} onChange={(e) => setEdit({ ...edit, name_ar: e.target.value })} /></div>
        <div className="space-y-2"><Label>Description en anglais</Label><Textarea value={edit.description_en ?? ""} onChange={(e) => setEdit({ ...edit, description_en: e.target.value })} /></div>
        <div className="space-y-2"><Label>Description en arabe</Label><Textarea dir="rtl" value={edit.description_ar ?? ""} onChange={(e) => setEdit({ ...edit, description_ar: e.target.value })} /></div>
      </div>
      <div className="grid gap-4 sm:grid-cols-4">
        <div className="space-y-2"><Label>Prix (DA)</Label><Input type="number" min={0} step="1" required value={edit.price ?? 0} onChange={(e) => setEdit({ ...edit, price: Number(e.target.value) })} /></div>
        <div className="space-y-2"><Label>Stock</Label><Input type="number" min={0} required value={edit.stock ?? 0} onChange={(e) => setEdit({ ...edit, stock: Number(e.target.value) })} /></div>
        <div className="space-y-2"><Label>Contenance</Label><Input value={edit.size ?? ""} onChange={(e) => setEdit({ ...edit, size: e.target.value })} /></div>
        <CategoryField value={edit.category ?? ""} onChange={(v) => setEdit({ ...edit, category: v })} />
      </div>
      <ImagePicker value={edit.image_url ?? ""} onChange={(v) => setEdit({ ...edit, image_url: v })} />
      <div className="flex items-center gap-2"><Switch checked={!!edit.active} onCheckedChange={(v) => setEdit({ ...edit, active: v })} /><Label>En vente sur le site</Label></div>
      <div className="flex gap-2"><Button>Enregistrer</Button><Button type="button" variant="outline" onClick={() => setEdit(null)}>Annuler</Button></div>
    </form>
  );

  return (
    <div className="space-y-4">
      <Button onClick={() => setEdit({ ...emptyProduct, sort_order: list.length + 1 })}>+ Ajouter un produit</Button>
      {list.map((p) => (
        <div key={p.id} className="flex flex-wrap items-center gap-4 rounded-lg border bg-card p-4">
          <img src={p.image_url} alt="" className="h-16 w-16 rounded object-cover" />
          <div className="min-w-48 flex-1">
            <p className="font-semibold">{p.name}</p>
            <p className="text-sm text-muted-foreground">{money(p.price)} · {p.size} · stock {p.stock}</p>
          </div>
          <span className={`rounded px-2 py-1 text-xs ${p.active ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"}`}>{p.active ? "En vente" : "Retiré"}</span>
          <Button size="sm" variant="outline" onClick={() => setEdit(p)}>Modifier</Button>
          <Button size="sm" variant="outline" onClick={() => toggle(p)}>{p.active ? "Retirer de la vente" : "Remettre en vente"}</Button>
          <Button size="sm" variant="destructive" onClick={() => remove(p)}>Supprimer</Button>
        </div>
      ))}
    </div>
  );
}

type Article = Tables<"articles">;
function Articles() {
  const [list, setList] = useState<Article[]>([]);
  const [edit, setEdit] = useState<Partial<Article> | null>(null);
  const load = () => supabase.from("articles").select("*").order("created_at", { ascending: false }).then(({ data }) => setList(data ?? []));
  useEffect(() => { load(); }, []);

  async function save(e: FormEvent) {
    e.preventDefault();
    if (!edit) return;
    const { id, created_at: _c, updated_at: _u, ...row } = edit as Article;
    const { error } = id ? await supabase.from("articles").update(row).eq("id", id) : await supabase.from("articles").insert(row);
    if (error) return toast.error(error.message);
    toast.success("Article enregistré");
    setEdit(null);
    load();
    return;
  }
  async function remove(a: Article) {
    if (!confirm(`Supprimer « ${a.title} » ?`)) return;
    await supabase.from("articles").delete().eq("id", a.id);
    load();
  }

  if (edit) return (
    <form onSubmit={save} className="space-y-4 rounded-lg border bg-card p-6">
      <h2 className="text-xl font-semibold">{edit.id ? "Modifier l’article" : "Nouvel article"}</h2>
      <div className="space-y-2"><Label>Titre</Label><Input required value={edit.title ?? ""} onChange={(e) => setEdit({ ...edit, title: e.target.value })} /></div>
      <div className="space-y-2"><Label>Résumé</Label><Textarea value={edit.excerpt ?? ""} onChange={(e) => setEdit({ ...edit, excerpt: e.target.value })} /></div>
      <ImagePicker value={edit.image_url ?? ""} onChange={(v) => setEdit({ ...edit, image_url: v })} />
      <div className="flex items-center gap-2"><Switch checked={!!edit.published} onCheckedChange={(v) => setEdit({ ...edit, published: v })} /><Label>Publié sur le site</Label></div>
      <div className="flex gap-2"><Button>Enregistrer</Button><Button type="button" variant="outline" onClick={() => setEdit(null)}>Annuler</Button></div>
    </form>
  );

  return (
    <div className="space-y-4">
      <Button onClick={() => setEdit({ title: "", excerpt: "", image_url: IMAGES[1], published: true })}>+ Ajouter un article</Button>
      {list.map((a) => (
        <div key={a.id} className="flex flex-wrap items-center gap-4 rounded-lg border bg-card p-4">
          <img src={a.image_url} alt="" className="h-16 w-16 rounded object-cover" />
          <div className="min-w-48 flex-1"><p className="font-semibold">{a.title}</p><p className="line-clamp-1 text-sm text-muted-foreground">{a.excerpt}</p></div>
          <span className="text-xs text-muted-foreground">{a.published ? "Publié" : "Brouillon"}</span>
          <Button size="sm" variant="outline" onClick={() => setEdit(a)}>Modifier</Button>
          <Button size="sm" variant="destructive" onClick={() => remove(a)}>Supprimer</Button>
        </div>
      ))}
    </div>
  );
}

function SitePhotos() {
  const [list, setList] = useState<Tables<"site_texts">[]>([]);
  const [draft, setDraft] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);
  const [loaded, setLoaded] = useState(false);
  useEffect(() => {
    supabase.from("site_texts").select("*").like("key", "image_%").order("sort_order").then(({ data, error }) => {
      if (error) {
        toast.error("Impossible de charger les photos");
        return;
      }
      setList(data ?? []);
      setDraft(Object.fromEntries((data ?? []).map((row) => [row.key, row.value])));
      setLoaded(true);
    });
  }, []);
  async function save() {
    setBusy(true);
    try {
      for (const row of list.filter((row) => row.value !== draft[row.key])) {
        const { data, error } = await supabase.from("site_texts").update({ value: draft[row.key] ?? "" }).eq("key", row.key).select("key");
        if (error || !data?.length) throw new Error("Impossible d’enregistrer les photos");
      }
      setList(list.map((row) => ({ ...row, value: draft[row.key] ?? row.value })));
      toast.success("Photos enregistrées");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Impossible d’enregistrer les photos");
    } finally { setBusy(false); }
  }
  return <div className="space-y-6">
    <h2 className="text-xl font-semibold">Photos du site</h2>
    {!loaded && <p>Chargement des photos…</p>}
    <div className="grid gap-6 md:grid-cols-2">
      {list.map((row) => <section key={row.key} aria-label={row.label} className="space-y-3 border-b pb-6">
        <h3 className="font-semibold">{row.label}</h3>
        <ImagePicker value={draft[row.key] ?? ""} onChange={(value) => setDraft((previous) => ({ ...previous, [row.key]: value }))} />
      </section>)}
    </div>
    <Button disabled={busy || !loaded} onClick={save}>{busy ? "Enregistrement…" : "Enregistrer les photos"}</Button>
  </div>;
}

function Texts() {
  const [list, setList] = useState<Tables<"site_texts">[]>([]);
  const [draft, setDraft] = useState<Record<string, string>>({});
  useEffect(() => {
    supabase.from("site_texts").select("*").order("sort_order").then(({ data }) => {
      const texts = (data ?? []).filter((row) => !row.key.startsWith("image_"));
      setList(texts);
      setDraft(Object.fromEntries(texts.map((t) => [t.key, t.value])));
    });
  }, []);
  async function save() {
    const changed = list.filter((t) => draft[t.key] !== t.value);
    for (const t of changed) {
      const { error } = await supabase.from("site_texts").update({ value: draft[t.key] ?? "" }).eq("key", t.key);
      if (error) return toast.error(error.message);
    }
    setList(list.map((t) => ({ ...t, value: draft[t.key] ?? t.value })));
    toast.success(changed.length ? `${changed.length} texte(s) enregistré(s)` : "Aucun changement");
    return;
  }
  return (
    <div className="space-y-4 rounded-lg border bg-card p-6">
      {list.map((t) => (
        <div key={t.key} className="space-y-1">
          <Label>{t.label}</Label>
          {t.value.length > 60
            ? <Textarea value={draft[t.key] ?? ""} onChange={(e) => setDraft({ ...draft, [t.key]: e.target.value })} />
            : <Input value={draft[t.key] ?? ""} onChange={(e) => setDraft({ ...draft, [t.key]: e.target.value })} />}
        </div>
      ))}
      <Button onClick={save} className="sticky bottom-4">Enregistrer les textes</Button>
    </div>
  );
}

type Order = Tables<"orders"> & { order_items: Tables<"order_items">[] };
const STATUSES = ["nouvelle", "confirmée", "expédiée", "livrée", "annulée"];
function Orders() {
  const [list, setList] = useState<Order[]>([]);
  const [filter, setFilter] = useState("à traiter");
  const load = () => supabase.from("orders").select("*, order_items(*)").order("created_at", { ascending: false }).then(({ data }) => setList((data as Order[]) ?? []));
  useEffect(() => { load(); }, []);
  async function setStatus(id: string, status: string) {
    const { error } = await supabase.from("orders").update({ status }).eq("id", id);
    if (error) toast.error(error.message); else load();
  }
  if (!list.length) return <p className="text-muted-foreground">Aucune commande pour le moment.</p>;
  const shown = list.filter((o) => filter === "toutes" || (filter === "à traiter" ? ["nouvelle", "confirmée"].includes(o.status) : o.status === filter));
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2">
        {["à traiter", "toutes", ...STATUSES].map((f) => (
          <Button key={f} size="sm" variant={filter === f ? "default" : "outline"} onClick={() => setFilter(f)}>
            {f} ({f === "toutes" ? list.length : f === "à traiter" ? list.filter((o) => ["nouvelle", "confirmée"].includes(o.status)).length : list.filter((o) => o.status === f).length})
          </Button>
        ))}
        <Button size="sm" variant="ghost" onClick={load}>Actualiser</Button>
      </div>
      {!shown.length && <p className="text-muted-foreground">Aucune commande dans cette catégorie.</p>}
      {shown.map((o) => (
        <div key={o.id} className="space-y-2 rounded-lg border bg-card p-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="font-semibold">#MIT-{String(o.order_number).padStart(6, "0")} · {money(o.total)}</p>
            <div className="flex flex-wrap items-center gap-2">
            {o.status === "nouvelle" && <Button size="sm" onClick={() => setStatus(o.id, "confirmée")}>Confirmer</Button>}
            {o.status === "confirmée" && <Button size="sm" onClick={() => setStatus(o.id, "expédiée")}>Marquer comme envoyée</Button>}
            {o.status === "expédiée" && <Button size="sm" onClick={() => setStatus(o.id, "livrée")}>Marquer comme livrée</Button>}
            <select className="h-9 rounded-md border bg-background px-2" value={o.status} onChange={(e) => setStatus(o.id, e.target.value)}>
              {STATUSES.map((s) => <option key={s}>{s}</option>)}
            </select>
            </div>
          </div>
          <p className="text-sm">{o.first_name} {o.last_name} · <a className="underline" href={`tel:${o.phone}`}>{o.phone}</a>{o.email && ` · ${o.email}`}</p>
          <p className="text-sm text-muted-foreground">{o.destination === "international" ? <b>International (devis) · {o.country} · </b> : null}{o.address}, {o.commune}, {o.wilaya} · {date(o.created_at)}</p>
          <ul className="text-sm">
            {o.order_items.map((i) => <li key={i.id}>{i.quantity} × {i.product_name} ({money(i.unit_price)})</li>)}
            {o.destination !== "international" && <li>Livraison {o.delivery_type === "bureau" ? "au bureau" : "à domicile"} : {money(o.shipping_fee)}</li>}
          </ul>
        </div>
      ))}
    </div>
  );
}

function Messages() {
  const [list, setList] = useState<Tables<"contact_messages">[]>([]);
  const load = () => supabase.from("contact_messages").select("*").order("created_at", { ascending: false }).then(({ data }) => setList(data ?? []));
  useEffect(() => { load(); }, []);
  async function remove(id: string) {
    if (!confirm("Supprimer ce message ?")) return;
    await supabase.from("contact_messages").delete().eq("id", id);
    load();
  }
  if (!list.length) return <p className="text-muted-foreground">Aucun message pour le moment.</p>;
  return (
    <div className="space-y-4">
      {list.map((m) => (
        <div key={m.id} className="space-y-1 rounded-lg border bg-card p-4">
          <div className="flex items-center justify-between gap-2">
            <p className="font-semibold">{m.name} · <a className="underline" href={`mailto:${m.email}`}>{m.email}</a></p>
            <Button size="sm" variant="outline" onClick={() => remove(m.id)}>Supprimer</Button>
          </div>
          <p className="text-xs text-muted-foreground">{date(m.created_at)}</p>
          <p className="whitespace-pre-wrap text-sm">{m.message}</p>
        </div>
      ))}
    </div>
  );
}

type Award = Tables<"awards">;
function Awards() {
  const [list, setList] = useState<Award[]>([]);
  const [edit, setEdit] = useState<Partial<Award> | null>(null);
  const load = () => supabase.from("awards").select("*").order("sort_order").then(({ data }) => setList(data ?? []));
  useEffect(() => { load(); }, []);
  async function save(e: FormEvent) {
    e.preventDefault();
    if (!edit) return;
    const { id, created_at: _c, ...row } = edit as Award;
    const payload = { ...row, title: row.title.trim() };
    const { error } = id ? await supabase.from("awards").update(payload).eq("id", id) : await supabase.from("awards").insert(payload);
    if (error) return toast.error(error.message);
    toast.success("Distinction enregistrée");
    setEdit(null);
    load();
    return;
  }
  async function remove(a: Award) {
    if (!confirm(`Supprimer « ${a.title} » ?`)) return;
    await supabase.from("awards").delete().eq("id", a.id);
    load();
  }
  if (edit) return (
    <form onSubmit={save} className="space-y-4 rounded-lg border bg-card p-6">
      <h2 className="text-xl font-semibold">{edit.id ? "Modifier la distinction" : "Nouvelle médaille / trophée"}</h2>
      <div className="grid gap-4 sm:grid-cols-[1fr_160px]">
        <div className="space-y-2"><Label>Titre (ex. Médaille d’or — Concours …)</Label><Input required value={edit.title ?? ""} onChange={(e) => setEdit({ ...edit, title: e.target.value })} /></div>
        <div className="space-y-2"><Label>Année</Label><Input value={edit.year ?? ""} onChange={(e) => setEdit({ ...edit, year: e.target.value })} /></div>
      </div>
      <div className="space-y-2"><Label>Description</Label><Textarea value={edit.description ?? ""} onChange={(e) => setEdit({ ...edit, description: e.target.value })} /></div>
      <ImagePicker value={edit.image_url ?? ""} onChange={(v) => setEdit({ ...edit, image_url: v })} />
      <div className="flex items-center gap-2"><Switch checked={!!edit.published} onCheckedChange={(v) => setEdit({ ...edit, published: v })} /><Label>Afficher sur le site</Label></div>
      <div className="flex gap-2"><Button>Enregistrer</Button><Button type="button" variant="outline" onClick={() => setEdit(null)}>Annuler</Button></div>
    </form>
  );
  return (
    <div className="space-y-4">
      <Button onClick={() => setEdit({ title: "", year: "", description: "", image_url: "", published: true, sort_order: list.length + 1 })}>+ Ajouter une médaille / un trophée</Button>
      {!list.length && <p className="text-muted-foreground">Aucune distinction pour le moment.</p>}
      {list.map((a) => (
        <div key={a.id} className="flex flex-wrap items-center gap-4 rounded-lg border bg-card p-4">
          {a.image_url ? <img src={a.image_url} alt="" className="h-16 w-16 rounded object-cover" /> : <div className="grid h-16 w-16 place-items-center text-3xl">🏅</div>}
          <div className="min-w-48 flex-1"><p className="font-semibold">{a.title}</p><p className="text-sm text-muted-foreground">{a.year}</p></div>
          <span className="text-xs text-muted-foreground">{a.published ? "Affichée" : "Masquée"}</span>
          <Button size="sm" variant="outline" onClick={() => setEdit(a)}>Modifier</Button>
          <Button size="sm" variant="destructive" onClick={() => remove(a)}>Supprimer</Button>
        </div>
      ))}
    </div>
  );
}

type Review = Tables<"reviews"> & { products: { name: string } | null };
function Reviews() {
  const [list, setList] = useState<Review[]>([]);
  const load = () => supabase.from("reviews").select("*, products(name)").order("created_at", { ascending: false }).then(({ data }) => setList((data as Review[]) ?? []));
  useEffect(() => { load(); }, []);
  async function toggle(r: Review) {
    const { error } = await supabase.from("reviews").update({ approved: !r.approved }).eq("id", r.id);
    if (error) toast.error(error.message); else load();
  }
  async function remove(r: Review) {
    if (!confirm("Supprimer cet avis ?")) return;
    await supabase.from("reviews").delete().eq("id", r.id);
    load();
  }
  if (!list.length) return <p className="text-muted-foreground">Aucun avis pour le moment.</p>;
  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">Les nouveaux avis n’apparaissent sur le site qu’après votre validation.</p>
      {list.map((r) => (
        <div key={r.id} className="space-y-1 rounded-lg border bg-card p-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="font-semibold">{r.name} · <span className="text-yellow-600">{"★".repeat(r.rating)}{"☆".repeat(5 - r.rating)}</span> · {r.products?.name ?? "Produit supprimé"}</p>
            <div className="flex gap-2">
              <Button size="sm" variant={r.approved ? "outline" : "default"} onClick={() => toggle(r)}>{r.approved ? "Masquer" : "Valider"}</Button>
              <Button size="sm" variant="destructive" onClick={() => remove(r)}>Supprimer</Button>
            </div>
          </div>
          <p className="text-xs text-muted-foreground">{date(r.created_at)} · {r.approved ? "Publié" : "En attente"}</p>
          <p className="whitespace-pre-wrap text-sm">{r.comment}</p>
        </div>
      ))}
    </div>
  );
}

function Stats() {
  type O = { id: string; total: number; status: string; wilaya: string; destination: string; created_at: string; order_items: { product_name: string; quantity: number; unit_price: number }[] };
  const [orders, setOrders] = useState<O[] | null>(null);
  const [products, setProducts] = useState<Tables<"products">[]>([]);
  const [reviews, setReviews] = useState<Tables<"reviews">[]>([]);
  const [messages, setMessages] = useState(0);
  useEffect(() => {
    supabase.from("orders").select("id,total,status,wilaya,destination,created_at,order_items(product_name,quantity,unit_price)").then(({ data }) => setOrders((data as O[]) ?? []));
    supabase.from("products").select("*").then(({ data }) => setProducts(data ?? []));
    supabase.from("reviews").select("*").then(({ data }) => setReviews(data ?? []));
    supabase.from("contact_messages").select("id", { count: "exact", head: true }).then(({ count }) => setMessages(count ?? 0));
  }, []);
  if (!orders) return <p className="text-muted-foreground">Chargement…</p>;

  const valid = orders.filter((o) => o.status !== "annulée");
  const revenue = valid.reduce((s, o) => s + Number(o.total), 0);
  const delivered = orders.filter((o) => o.status === "livrée").reduce((s, o) => s + Number(o.total), 0);
  const since = (d: number) => valid.filter((o) => Date.now() - new Date(o.created_at).getTime() < d * 864e5);
  const m30 = since(30);
  const byStatus = ["nouvelle", "confirmée", "expédiée", "livrée", "annulée"].map((s) => [s, orders.filter((o) => o.status === s).length] as const);
  const count = (keyOf: (o: O) => [string, number][]) => {
    const m = new Map<string, number>();
    valid.forEach((o) => keyOf(o).forEach(([k, n]) => m.set(k, (m.get(k) ?? 0) + n)));
    return [...m].sort((a, b) => b[1] - a[1]).slice(0, 8);
  };
  const topProducts = count((o) => o.order_items.map((i) => [i.product_name, i.quantity]));
  const topWilayas = count((o) => [[o.destination === "international" ? "International" : o.wilaya, 1]]);
  const approved = reviews.filter((r) => r.approved);
  const avg = approved.length ? approved.reduce((s, r) => s + r.rating, 0) / approved.length : 0;
  const lowStock = products.filter((p) => p.active && p.stock <= 5);

  const days = Array.from({ length: 14 }, (_, i) => {
    const d = new Date(); d.setHours(0, 0, 0, 0); d.setDate(d.getDate() - 13 + i);
    const n = valid.filter((o) => new Date(o.created_at).toDateString() === d.toDateString());
    return { label: d.toLocaleDateString("fr-FR", { day: "2-digit", month: "2-digit" }), n: n.length, total: n.reduce((s, o) => s + Number(o.total), 0) };
  });
  const maxDay = Math.max(1, ...days.map((d) => d.total));

  const Card = ({ t, v, s }: { t: string; v: string | number; s?: string }) => (
    <div className="rounded-lg border bg-card p-4"><p className="text-sm text-muted-foreground">{t}</p><p className="mt-1 text-2xl font-bold">{v}</p>{s && <p className="text-xs text-muted-foreground">{s}</p>}</div>
  );
  const List = ({ title, rows, empty }: { title: string; rows: readonly (readonly [string, number])[]; empty: string }) => {
    const max = Math.max(1, ...rows.map((r) => r[1]));
    return (
      <div className="rounded-lg border bg-card p-4"><h3 className="mb-3 font-semibold">{title}</h3>
        {rows.length ? rows.map(([k, n]) => (
          <div key={k} className="mb-2"><div className="flex justify-between text-sm"><span>{k}</span><span className="font-medium">{n}</span></div>
            <div className="h-2 rounded bg-muted"><div className="h-2 rounded bg-primary" style={{ width: `${(n / max) * 100}%` }} /></div></div>
        )) : <p className="text-sm text-muted-foreground">{empty}</p>}
      </div>
    );
  };

  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card t="Chiffre d’affaires (hors annulées)" v={money(revenue)} s={`dont livré : ${money(delivered)}`} />
        <Card t="Commandes" v={orders.length} s={`${m30.length} sur les 30 derniers jours`} />
        <Card t="Panier moyen" v={money(valid.length ? Math.round(revenue / valid.length) : 0)} />
        <Card t="À traiter" v={orders.filter((o) => o.status === "nouvelle" || o.status === "confirmée").length} s="nouvelles + confirmées" />
        <Card t="Produits en vente" v={`${products.filter((p) => p.active).length} / ${products.length}`} />
        <Card t="Note moyenne des avis" v={approved.length ? `${avg.toFixed(1)} / 5` : "—"} s={`${approved.length} publiés · ${reviews.length - approved.length} en attente`} />
        <Card t="Messages reçus" v={messages} />
        <Card t="CA 30 derniers jours" v={money(m30.reduce((s, o) => s + Number(o.total), 0))} />
      </div>
      <div className="rounded-lg border bg-card p-4">
        <h3 className="mb-3 font-semibold">Ventes des 14 derniers jours</h3>
        <div className="flex h-40 items-end gap-1">
          {days.map((d) => (
            <div key={d.label} className="flex flex-1 flex-col items-center gap-1" title={`${d.n} commande(s) · ${money(d.total)}`}>
              <div className="w-full rounded-t bg-primary" style={{ height: `${(d.total / maxDay) * 120}px`, minHeight: d.total ? 4 : 1 }} />
              <span className="text-[10px] text-muted-foreground">{d.label}</span>
            </div>
          ))}
        </div>
      </div>
      <div className="grid gap-4 md:grid-cols-3">
        <List title="Produits les plus vendus (quantité)" rows={topProducts} empty="Aucune vente" />
        <List title="Wilayas les plus actives" rows={topWilayas} empty="Aucune commande" />
        <List title="Commandes par statut" rows={byStatus} empty="—" />
      </div>
      {lowStock.length > 0 && (
        <div className="rounded-lg border border-destructive bg-card p-4"><h3 className="mb-2 font-semibold text-destructive">Stock faible (≤ 5)</h3>
          {lowStock.map((p) => <p key={p.id} className="text-sm">{p.name} : {p.stock} restant(s)</p>)}</div>
      )}
    </div>
  );
}
