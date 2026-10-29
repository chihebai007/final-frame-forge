import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({ createUser: vi.fn(), updateUserById: vi.fn(), listUsers: vi.fn(), from: vi.fn(), rpc: vi.fn(), insert: vi.fn(), resetPasswordForEmail: vi.fn() }));
vi.mock('@tanstack/react-start/server', () => ({ getRequest: () => new Request('https://mitinan.example/admin') }));
vi.mock('@tanstack/react-start', () => ({ createServerFn: () => ({ middleware: () => ({ inputValidator: (parse: (input: unknown) => unknown) => ({ handler: (handler: (input: unknown) => unknown) => (input: { data: unknown; context: unknown }) => handler({ ...input, data: parse(input.data) }) }) }) }) }));
vi.mock('@/integrations/supabase/auth-middleware', () => ({ requireSupabaseAuth: {} }));
vi.mock('@/integrations/supabase/client.server', () => ({ supabaseAdmin: { from: mocks.from, auth: { resetPasswordForEmail: mocks.resetPasswordForEmail, admin: { createUser: mocks.createUser, updateUserById: mocks.updateUserById, listUsers: mocks.listUsers, getUserById: vi.fn() } } } }));
import { manageTeam } from '../lib/team.functions';

// The mocked builder exposes the handler context to exercise authorization.
const run = manageTeam as unknown as (args: { data: unknown; context: { userId: string; supabase: { rpc: typeof mocks.rpc } } }) => Promise<unknown>;
const context = { userId: 'admin-id', supabase: { rpc: mocks.rpc } };
const grant = { action: 'grant', email: 'manager@example.test', password: 'Private-test-Password9!' };
beforeEach(() => {
  vi.resetAllMocks();
  mocks.rpc.mockResolvedValue({ data: true });
  mocks.listUsers.mockResolvedValue({ data: { users: [] } });
  mocks.createUser.mockResolvedValue({ data: { user: { id: 'manager-id' } } });
  mocks.updateUserById.mockResolvedValue({ error: null });
  mocks.insert.mockResolvedValue({ error: null });
  mocks.resetPasswordForEmail.mockResolvedValue({ error: null });
  mocks.from.mockReturnValue({ select: () => ({ eq: (_key: string, value: string) => Promise.resolve({ data: value === 'manager' ? [] : [], error: null }) }), insert: mocks.insert });
});
describe('Manager credentials', () => {
  it('only the administrator can supply manager credentials', async () => {
    mocks.rpc.mockResolvedValue({ data: false });
    await expect(run({ data: grant, context })).rejects.toThrow('administrateur');
    expect(mocks.createUser).not.toHaveBeenCalled();
  });
  it('creates a directly usable account with the supplied credentials', async () => {
    expect(await run({ data: grant, context })).toEqual({ members: [], emailStatus: 'not_configured' });
    expect(mocks.createUser).toHaveBeenCalledWith({ email: grant.email, password: grant.password, email_confirm: true });
    expect(mocks.insert).toHaveBeenCalledWith({ user_id: 'manager-id', role: 'manager' });
  });
  it('requires explicit confirmation before replacing an existing password', async () => {
    mocks.listUsers.mockResolvedValue({ data: { users: [{ id: 'manager-id', email: grant.email }] } });
    await expect(run({ data: grant, context })).rejects.toThrow('Confirmez');
    expect(mocks.updateUserById).not.toHaveBeenCalled();
    expect(mocks.insert).not.toHaveBeenCalled();
    expect(mocks.resetPasswordForEmail).not.toHaveBeenCalled();
  });
  it('regrants access with newly supplied credentials after confirmation', async () => {
    mocks.listUsers.mockResolvedValue({ data: { users: [{ id: 'manager-id', email: grant.email }] } });
    await run({ data: { ...grant, replacePassword: true }, context });
    expect(mocks.updateUserById).toHaveBeenCalledWith('manager-id', { password: grant.password, email_confirm: true });
    expect(mocks.insert).toHaveBeenCalledWith({ user_id: 'manager-id', role: 'manager' });
  });
  it('never replaces an administrator password', async () => {
    mocks.listUsers.mockResolvedValue({ data: { users: [{ id: 'admin-id', email: grant.email }] } });
    mocks.from.mockReturnValue({ select: () => ({ eq: () => Promise.resolve({ data: [{ role: 'admin' }], error: null }) }) });
    await expect(run({ data: { ...grant, replacePassword: true }, context })).rejects.toThrow('déjà administrateur');
    expect(mocks.updateUserById).not.toHaveBeenCalled();
  });
  it('never sends password-reset emails when granting access', async () => {
    await run({ data: grant, context });
    await run({ data: grant, context });
    expect(mocks.resetPasswordForEmail).not.toHaveBeenCalled();
  });
  it('never sends password-reset emails when replacing a manager password', async () => {
    mocks.listUsers.mockResolvedValue({ data: { users: [{ id: 'manager-id', email: grant.email }] } });
    mocks.from.mockReturnValue({ select: () => ({ eq: (_key: string, value: string) => Promise.resolve({ data: value === 'manager' ? [] : [{ role: 'manager' }], error: null }) }), insert: mocks.insert });
    await run({ data: { ...grant, replacePassword: true }, context });
    expect(mocks.resetPasswordForEmail).not.toHaveBeenCalled();
    expect(mocks.insert).not.toHaveBeenCalled();
  });
  it('reports missing email setup without undoing granted access or returning the password', async () => {
    expect(await run({ data: grant, context })).toEqual({ members: [], emailStatus: 'not_configured' });
    expect(mocks.insert).toHaveBeenCalledWith({ user_id: 'manager-id', role: 'manager' });
  });
});