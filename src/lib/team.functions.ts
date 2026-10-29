import { createServerFn } from '@tanstack/react-start';
import { z } from 'zod';
import { requireSupabaseAuth } from '@/integrations/supabase/auth-middleware';

export const manageTeam = createServerFn({ method: 'POST' })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => z.discriminatedUnion('action', [
    z.object({ action: z.literal('list') }),
    z.object({ action: z.literal('revoke'), id: z.string().uuid() }),
    z.object({ action: z.literal('grant'), email: z.string().trim().email(), password: z.string().min(12, 'Utilisez au moins 12 caractères').max(128), replacePassword: z.boolean().default(false) }),
  ]).parse(input))
  .handler(async ({ data, context }) => {
    const { data: admin } = await context.supabase.rpc('has_role', { _user_id: context.userId, _role: 'admin' });
    if (admin !== true) throw new Error('Accès réservé à l’administrateur');
    const { supabaseAdmin } = await import('@/integrations/supabase/client.server');
    let emailStatus: 'not_configured' | null = null;
    if (data.action === 'revoke') {
      if (!data.id || data.id === context.userId) throw new Error('Compte invalide');
      const { error } = await supabaseAdmin.from('user_roles').delete().eq('user_id', data.id).eq('role', 'manager');
      if (error) throw new Error('Retrait impossible');
    }
    if (data.action === 'grant') {
      if (!data.email) throw new Error('Email obligatoire');
      let userId: string | undefined;
      for (let page = 1; page <= 100; page++) {
        const { data: result, error } = await supabaseAdmin.auth.admin.listUsers({ page, perPage: 100 });
        if (error) throw new Error('Recherche du compte impossible');
        userId = result.users.find((u) => u.email?.toLowerCase() === data.email?.toLowerCase())?.id;
        if (userId || result.users.length < 100) break;
      }
      const foundExistingUser = Boolean(userId);
      if (!userId) {
        const { data: created, error } = await supabaseAdmin.auth.admin.createUser({ email: data.email, password: data.password, email_confirm: true });
        if (error || !created.user) throw new Error('Création impossible. Vérifiez l’email et utilisez un mot de passe suffisamment fort.');
        userId = created.user.id;
      }
      const { data: existing, error: roleError } = await supabaseAdmin.from('user_roles').select('role').eq('user_id', userId);
      if (roleError) throw new Error('Vérification des accès impossible');
      if (existing?.some((r) => r.role === 'admin')) throw new Error('Ce compte est déjà administrateur');
      if (foundExistingUser) {
        if (!data.replacePassword) throw new Error('Ce compte existe déjà. Confirmez le remplacement de son mot de passe pour lui fournir les nouveaux identifiants.');
        const { error } = await supabaseAdmin.auth.admin.updateUserById(userId, { password: data.password, email_confirm: true });
        if (error) throw new Error('Modification du mot de passe impossible. Utilisez un mot de passe suffisamment fort.');
      }
      if (!existing?.some((r) => r.role === 'manager')) {
        const { error } = await supabaseAdmin.from('user_roles').insert({ user_id: userId, role: 'manager' });
        if (error) throw new Error('Attribution impossible');
      }
      // Access notices are app emails, not auth recovery emails. Sending is blocked
      // until an owned sender domain and the managed app-email helper are configured.
      // Never send the administrator-supplied password in an email.
      emailStatus = 'not_configured';
    }
    const { data: roles, error } = await supabaseAdmin.from('user_roles').select('user_id').eq('role', 'manager');
    if (error) throw new Error('Chargement impossible');
    const members = await Promise.all((roles ?? []).map(async (r) => {
      const { data: u } = await supabaseAdmin.auth.admin.getUserById(r.user_id);
      return { id: r.user_id, email: u.user?.email ?? 'Compte' };
    }));
    return { members, emailStatus };
  });