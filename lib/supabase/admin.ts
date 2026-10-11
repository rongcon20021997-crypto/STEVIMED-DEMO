import { createClient } from '@supabase/supabase-js';
// NEVER call in a browser or import into Client Components.
export function createAdminClient() {
  if(process.env.NODE_ENV==='production' && process.env.RND_ALLOW_PUBLIC_ACCESS!=='true')
    throw new Error('Chế độ không đăng nhập đang khóa trên production. Xem README: RND_ALLOW_PUBLIC_ACCESS.');
  const url=process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key=process.env.SUPABASE_SERVICE_ROLE_KEY;
  if(!url||!key) throw new Error('Missing Supabase server credentials');
  return createClient(url,key,{auth:{persistSession:false,autoRefreshToken:false}});
}
