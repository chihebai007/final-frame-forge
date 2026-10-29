import { useEffect, useState, type FormEvent } from 'react';
import { useServerFn } from '@tanstack/react-start';
import { manageTeam } from '@/lib/team.functions';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { Checkbox } from '@/components/ui/checkbox';
import { Copy, Eye, EyeOff, RefreshCw } from 'lucide-react';
export function Team() {
  const call = useServerFn(manageTeam);
  const [list, setList] = useState<{ id: string; email: string }[]>([]);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [replacePassword, setReplacePassword] = useState(false);
  const [credentials, setCredentials] = useState<{ email: string; password: string } | null>(null);
  const [loginUrl, setLoginUrl] = useState('/admin');
  const [busy, setBusy] = useState(false);
  async function run(action: 'list' | 'grant' | 'revoke', id?: string) {
    setBusy(true);
    try {
      const data = action === 'grant' ? { action, email, password, replacePassword } : action === 'revoke' && id ? { action, id } : { action: 'list' as const };
      setList(await call({ data }));
      if (action === 'grant') { setCredentials({ email: email.trim(), password }); setPassword(''); setEmail(''); setReplacePassword(false); setShowPassword(false); }
      if (action === 'revoke') setCredentials(null);
      if (action !== 'list') toast.success(action === 'grant' ? 'Accès accordé : transmettez les identifiants au manager' : 'Accès manager retiré');
    }
    catch (e) { toast.error(e instanceof Error ? e.message : 'Opération impossible'); }
    finally { setBusy(false); }
  }
  useEffect(() => { setLoginUrl(`${window.location.origin}/admin`); void run('list'); }, []);
  async function copyCredentials() {
    if (!credentials) return;
    try {
      await navigator.clipboard.writeText(`Connexion à la boutique MITINAN\nLien : ${loginUrl}\nUtilisez votre email personnel habituel.\nMot de passe pour la boutique : ${credentials.password}\nCe mot de passe concerne uniquement la boutique, pas votre messagerie. Ne le partagez pas.`);
      toast.success('Identifiants copiés : transmettez-les en privé');
    } catch { toast.error('Copie impossible : transmettez les informations affichées en privé.'); }
  }
  function generatePassword() {
    const random = crypto.getRandomValues(new Uint32Array(4));
    setPassword(`M!${Array.from(random, (n) => n.toString(36)).join('')}9a`);
  }
  return <section className="space-y-6"><h2 className="text-2xl font-semibold">Équipe boutique</h2>
    <div className="space-y-2 rounded-md border bg-muted/40 p-4 text-sm">
      <p className="font-semibold">Connexion du manager</p>
      <ol className="list-decimal space-y-1 ps-5">
        <li>Le manager garde son email personnel. Vous saisissez cet email ici et choisissez son mot de passe d’accès à la boutique.</li>
        <li>Vous lui transmettez uniquement ce mot de passe et le lien en privé ; aucun email d’invitation n’est nécessaire.</li>
        <li>Il se connecte ensuite ici avec son email et ce mot de passe : <span className="break-all font-medium">{loginUrl}</span></li>
        <li>Il peut gérer commandes, produits, avis, livraison et messages. Si vous retirez l’accès, il ne peut plus rien gérer jusqu’à ce que vous lui redonniez accès.</li>
      </ol>
    </div>
    <form className="space-y-3 border-b pb-6" onSubmit={(e: FormEvent) => { e.preventDefault(); void run('grant'); }}>
      <Label htmlFor="manager-email">Email personnel du manager</Label>
      <Input id="manager-email" type="email" autoComplete="off" required value={email} onChange={(e) => { setCredentials(null); setEmail(e.target.value); }} />
      <Label htmlFor="manager-password">Mot de passe d’accès à la boutique</Label>
      <div className="flex gap-2"><Input id="manager-password" type={showPassword ? 'text' : 'password'} autoComplete="new-password" minLength={12} maxLength={128} required value={password} onChange={(e) => setPassword(e.target.value)} /><Button type="button" variant="outline" size="icon" title={showPassword ? 'Masquer le mot de passe' : 'Afficher le mot de passe'} aria-label={showPassword ? 'Masquer le mot de passe' : 'Afficher le mot de passe'} onClick={() => setShowPassword(!showPassword)}>{showPassword ? <EyeOff /> : <Eye />}</Button><Button type="button" variant="outline" size="icon" title="Générer un mot de passe" aria-label="Générer un mot de passe" onClick={generatePassword}><RefreshCw /></Button></div>
      <p className="text-sm text-muted-foreground">Au moins 12 caractères. Ce mot de passe concerne seulement la boutique, pas sa messagerie. Il ne sera pas consultable plus tard.</p>
      <div className="flex items-start gap-2"><Checkbox id="replace-manager-password" checked={replacePassword} onCheckedChange={(v) => setReplacePassword(v === true)} /><Label htmlFor="replace-manager-password" className="leading-normal">Si ce compte existe déjà dans la boutique, je confirme le remplacement de son mot de passe d’accès par celui saisi.</Label></div>
      <Button disabled={busy}>{busy ? 'Veuillez patienter…' : 'Donner accès'}</Button>
    </form>
    {credentials && <div className="space-y-3 border-b pb-6"><h3 className="font-semibold">Identifiants à transmettre en privé</h3><dl className="grid gap-2 text-sm"><div><dt className="text-muted-foreground">Lien de connexion</dt><dd className="break-all">{loginUrl}</dd></div><div><dt className="text-muted-foreground">Email</dt><dd className="break-all">{credentials.email}</dd></div><div><dt className="text-muted-foreground">Mot de passe</dt><dd className="break-all font-mono">{credentials.password}</dd></div></dl><div className="flex flex-wrap gap-2"><Button variant="outline" onClick={() => void copyCredentials()}><Copy />Copier les identifiants</Button><Button variant="ghost" onClick={() => setCredentials(null)}>Masquer les identifiants</Button></div></div>}
    {list.length === 0 && <p className="text-muted-foreground">Aucun manager.</p>}
    {list.map((u) => <div key={u.id} className="flex flex-wrap items-center justify-between gap-3 border-b py-3"><span className="break-all">{u.email}</span><Button variant="destructive" disabled={busy} onClick={() => { if (confirm('Retirer cet accès manager ?')) void run('revoke', u.id); }}>Retirer l’accès</Button></div>)}
  </section>;
}