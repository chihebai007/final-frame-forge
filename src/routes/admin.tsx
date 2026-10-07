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
    supabase.rpc("claim_first_admin").then(({ data, error }) => setIsAdmin(!error && data === true));
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
          <Tabs defaultValue="products">
            <TabsList className="mb-6 flex-wrap h-auto">
              <TabsTrigger value="products">Produits</TabsTrigger>
              <TabsTrigger value="articles">Articles</TabsTrigger>
              <TabsTrigger value="texts">Textes du site</TabsTrigger>
              <TabsTrigger value="awards">Distinctions</TabsTrigger>
              <TabsTrigger value="reviews">Avis clients</TabsTrigger>
              <TabsTrigger value="orders">Commandes</TabsTrigger>
              <TabsTrigger value="messages">Messages</TabsTrigger>
            </TabsList>
            <TabsContent value="products"><Products /></TabsContent>
            <TabsContent value="articles"><Articles /></TabsContent>
            <TabsContent value="texts"><Texts /></TabsContent>
            <TabsContent value="awards"><Awards /></TabsContent>
            <TabsContent value="reviews"><Reviews /></TabsContent>
            <TabsContent value="orders"><Orders /></TabsContent>
            <TabsContent value="messages"><Messages /></TabsContent>
          </Tabs>
        )}
      </main>
    </div>
  );
}

function Login() {
  const [mode, setMode] = useState<"in" | "up">("in");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  async function submit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    const { data, error } =
      mode === "in"
        ? await supabase.auth.signInWithPassword({ email, password })
        : await supabase.auth.signUp({ email, password, options: { emailRedirectTo: `${window.location.origin}/admin` } });
    setBusy(false);
    if (error) return toast.error(error.message);
    if (mode === "up" && !data.session) toast.success("Compte créé. Confirmez votre email puis connectez-vous.");
    return;
  }
  return (
    <form onSubmit={submit} className="mx-auto max-w-sm space-y-4 rounded-lg border bg-card p-6 shadow-sm">
      <h1 className="text-2xl font-bold">{mode === "in" ? "Connexion" : "Créer le compte administrateur"}</h1>
      <div className="space-y-2"><Label>Email</Label><Input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} /></div>
      <div className="space-y-2"><Label>Mot de passe</Label><Input type="password" required minLength={8} value={password} onChange={(e) => setPassword(e.target.value)} /></div>
      <Button className="w-full" disabled={busy}>{mode === "in" ? "Se connecter" : "Créer le compte"}</Button>
      <button type="button" className="w-full text-sm text-muted-foreground underline" onClick={() => setMode(mode === "in" ? "up" : "in")}>
        {mode === "in" ? "Première utilisation ? Créer le compte" : "J’ai déjà un compte"}
      </button>
    </form>
  );
}

function ImagePicker({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  return (
    <div className="space-y-2">
      <Label>Image</Label>
      <div className="flex flex-wrap gap-2">
        {IMAGES.map((src) => (
          <button type="button" key={src} onClick={() => onChange(src)}
            className={`h-16 w-16 overflow-hidden rounded border-2 ${value === src ? "border-primary" : "border-transparent"}`}>
            <img src={src} alt="" className="h-full w-full object-cover" />
          </button>
        ))}
      </div>
      <Input placeholder="ou collez un lien d’image (https://…)" value={value} onChange={(e) => onChange(e.target.value)} />
    </div>
  );
}

type Product = Tables<"products">;
const emptyProduct = { name: "", description: "", price: 0, stock: 0, size: "1 L", category: "extra-vierge", image_url: IMAGES[3], active: true, sort_order: 0 };

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
      <div className="grid gap-4 sm:grid-cols-4">
        <div className="space-y-2"><Label>Prix (DA)</Label><Input type="number" min={0} step="1" required value={edit.price ?? 0} onChange={(e) => setEdit({ ...edit, price: Number(e.target.value) })} /></div>
        <div className="space-y-2"><Label>Stock</Label><Input type="number" min={0} required value={edit.stock ?? 0} onChange={(e) => setEdit({ ...edit, stock: Number(e.target.value) })} /></div>
        <div className="space-y-2"><Label>Contenance</Label><Input value={edit.size ?? ""} onChange={(e) => setEdit({ ...edit, size: e.target.value })} /></div>
        <div className="space-y-2"><Label>Catégorie</Label>
          <select className="h-9 w-full rounded-md border bg-background px-2" value={edit.category} onChange={(e) => setEdit({ ...edit, category: e.target.value })}>
            <option value="extra-vierge">Extra Vierge</option><option value="vierge">Vierge</option>
          </select>
        </div>
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

function Texts() {
  const [list, setList] = useState<Tables<"site_texts">[]>([]);
  const [draft, setDraft] = useState<Record<string, string>>({});
  useEffect(() => {
    supabase.from("site_texts").select("*").order("sort_order").then(({ data }) => {
      setList(data ?? []);
      setDraft(Object.fromEntries((data ?? []).map((t) => [t.key, t.value])));
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
  const load = () => supabase.from("orders").select("*, order_items(*)").order("created_at", { ascending: false }).then(({ data }) => setList((data as Order[]) ?? []));
  useEffect(() => { load(); }, []);
  async function setStatus(id: string, status: string) {
    const { error } = await supabase.from("orders").update({ status }).eq("id", id);
    if (error) toast.error(error.message); else load();
  }
  if (!list.length) return <p className="text-muted-foreground">Aucune commande pour le moment.</p>;
  return (
    <div className="space-y-4">
      {list.map((o) => (
        <div key={o.id} className="space-y-2 rounded-lg border bg-card p-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="font-semibold">#MIT-{String(o.order_number).padStart(6, "0")} · {money(o.total)}</p>
            <select className="h-9 rounded-md border bg-background px-2" value={o.status} onChange={(e) => setStatus(o.id, e.target.value)}>
              {STATUSES.map((s) => <option key={s}>{s}</option>)}
            </select>
          </div>
          <p className="text-sm">{o.first_name} {o.last_name} · <a className="underline" href={`tel:${o.phone}`}>{o.phone}</a>{o.email && ` · ${o.email}`}</p>
          <p className="text-sm text-muted-foreground">{o.destination === "international" ? <b>International (devis) · {o.country} · </b> : null}{o.address}, {o.commune}, {o.wilaya} · {date(o.created_at)}</p>
          <ul className="text-sm">
            {o.order_items.map((i) => <li key={i.id}>{i.quantity} × {i.product_name} ({money(i.unit_price)})</li>)}
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
