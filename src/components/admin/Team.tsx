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
  return <section className="space-y-6"><h2 className="text-2xl font-semibold">Équipe boutique</h2>
    <form className="space-y-3 border-b pb-6" onSubmit={(e: FormEvent) => { e.preventDefault(); void run('grant'); }}>
      <Label htmlFor="manager-email">Email du manager</Label><div className="flex flex-col gap-3 sm:flex-row"><Input id="manager-email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} /><Button disabled={busy}>Donner accès</Button></div>
    </form>
    {list.length === 0 && <p className="text-muted-foreground">Aucun manager.</p>}
    {list.map((u) => <div key={u.id} className="flex flex-wrap items-center justify-between gap-3 border-b py-3"><span className="break-all">{u.email}</span><Button variant="destructive" disabled={busy} onClick={() => { if (confirm('Retirer cet accès manager ?')) void run('revoke', u.id); }}>Retirer l’accès</Button></div>)}
  </section>;
}