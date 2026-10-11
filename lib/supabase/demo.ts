import { createAdminClient } from '@/lib/supabase/admin';

let cachedDemoUserId: string | null = null;

export async function getDemoUserId(): Promise<string | null> {
  if (cachedDemoUserId) return cachedDemoUserId;
  try {
    const admin = createAdminClient();
    const { data } = await admin.auth.admin.listUsers({ page: 1, perPage: 20 });
    const demoUser = data?.users?.find(u => u.email === 'demo@rnd.internal') || data?.users?.[0];
    if (demoUser) {
      cachedDemoUserId = demoUser.id;
      return demoUser.id;
    }
    const created = await admin.auth.admin.createUser({
      email: 'demo@rnd.internal',
      password: 'RndPassword2026!',
      email_confirm: true,
    });
    if (created.data?.user) {
      cachedDemoUserId = created.data.user.id;
      return created.data.user.id;
    }
  } catch (err) {
    console.error('getDemoUserId error:', err);
  }
  return null;
}
