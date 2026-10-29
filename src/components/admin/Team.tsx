import { useEffect, useState, type FormEvent } from 'react';
import { useServerFn } from '@tanstack/react-start';
import { manageTeam } from '@/lib/team.functions';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
export function Team() {
  const call = useServerFn(manageTeam);
  const [list, setList] = useState<{ id: string; email: string }[]>([]);
  const [email, setEmail] = useState('');
  const [busy, setBusy] = useState(false);
  async function run(action: 'list' | 'grant' | 'revoke', id?: string) {
    setBusy(true);
    try { setList(await call({ data: { action, email: action === 'grant' ? email : undefined, id } })); if (action !== 'list') toast.success(action === 'grant' ? 'Accès manager accordé' : 'Accès manager retiré'); }
    catch (e) { toast.error(e instanceof Error ? e.message : 'Opération impossible'); }
    finally { setBusy(false); }
  }
  useEffect(() => { void run('list'); }, []);
  const loginUrl = typeof window !== 'undefined' ? `${window.location.origin}/admin` : '/admin';
  return <section className="space-y-6"><h2 className="text-2xl font-semibold">Équipe boutique</h2>
    <div className="space-y-2 rounded-md border bg-muted/40 p-4 text-sm">
      <p className="font-semibold">Informations à donner au manager</p>
      <ol className="list-decimal space-y-1 ps-5">
        <li>Il reçoit un email « Créer / réinitialiser le mot de passe » à chaque fois que vous lui donnez accès.</li>
        <li>Il clique sur le lien, choisit son mot de passe.</li>
        <li>Il se connecte ensuite ici avec son email et ce mot de passe : <span className="break-all font-medium">{loginUrl}</span></li>
        <li>Il peut gérer commandes, produits, avis, livraison et messages. Si vous retirez l’accès, il ne peut plus rien gérer jusqu’à ce que vous lui redonniez accès.</li>
      </ol>
      <Button type="button" variant="outline" size="sm" onClick={() => { void navigator.clipboard.writeText(`Bonjour, vous avez accès à la gestion de la boutique MITINAN.\n1. Ouvrez l’email reçu et choisissez votre mot de passe.\n2. Connectez-vous ici : ${loginUrl}\n   avec votre email et ce mot de passe.`); toast.success('Instructions copiées'); }}>Copier les instructions</Button>
    </div>
    <form className="space-y-3 border-b pb-6" onSubmit={(e: FormEvent) => { e.preventDefault(); void run('grant'); }}>
      <Label htmlFor="manager-email">Email du manager</Label><div className="flex flex-col gap-3 sm:flex-row"><Input id="manager-email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} /><Button disabled={busy}>Donner accès</Button></div>
    </form>
    {list.length === 0 && <p className="text-muted-foreground">Aucun manager.</p>}
    {list.map((u) => <div key={u.id} className="flex flex-wrap items-center justify-between gap-3 border-b py-3"><span className="break-all">{u.email}</span><Button variant="destructive" disabled={busy} onClick={() => { if (confirm('Retirer cet accès manager ?')) void run('revoke', u.id); }}>Retirer l’accès</Button></div>)}
  </section>;
}