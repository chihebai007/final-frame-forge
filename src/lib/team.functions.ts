import { createServerFn } from '@tanstack/react-start';
import { z } from 'zod';
import { requireSupabaseAuth } from '@/integrations/supabase/auth-middleware';

export const manageTeam = createServerFn({ method: 'POST' })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => z.object({ action: z.enum(['list', 'grant', 'revoke']), email: z.string().email().optional(), id: z.string().uuid().optional() }).parse(input))
  .handler(async ({ data, context }) => {
    const { data: admin } = await context.supabase.rpc('has_role', { _user_id: context.userId, _role: 'admin' });
    if (admin !== true) throw new Error('Accès réservé à l’administrateur');
    const { supabaseAdmin } = await import('@/integrations/supabase/client.server');
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
      if (!userId) {
        const { data: invitation, error } = await supabaseAdmin.auth.admin.inviteUserByEmail(data.email, { redirectTo: `${new URL(context.request.url).origin}/reset-password` });
        if (error || !invitation.user) throw new Error('Invitation impossible. Réessayez ou utilisez un compte existant.');
        userId = invitation.user.id;
      }
      const { data: existing } = await supabaseAdmin.from('user_roles').select('role').eq('user_id', userId);
      if (existing?.some((r) => r.role === 'admin')) throw new Error('Ce compte est déjà administrateur');
      if (!existing?.some((r) => r.role === 'manager')) {
        const { error } = await supabaseAdmin.from('user_roles').insert({ user_id: userId, role: 'manager' });
        if (error) throw new Error('Attribution impossible');
      }
    }
    const { data: roles, error } = await supabaseAdmin.from('user_roles').select('user_id').eq('role', 'manager');
    if (error) throw new Error('Chargement impossible');
    return Promise.all((roles ?? []).map(async (r) => {
      const { data: u } = await supabaseAdmin.auth.admin.getUserById(r.user_id);
      return { id: r.user_id, email: u.user?.email ?? 'Compte' };
    }));
  });