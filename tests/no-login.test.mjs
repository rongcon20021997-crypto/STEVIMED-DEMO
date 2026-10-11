import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,existsSync} from 'node:fs';
const read=(p)=>readFileSync(new URL('../'+p,import.meta.url),'utf8');
test('Dashboard does not redirect to login or access Supabase Auth',()=>{
 const shell=read('app/(portal)/layout.tsx');
 assert.doesNotMatch(shell,/auth\.getUser\(|redirect\('\/login'\)|SignOut/);
 assert.match(shell,/className="app-shell"/);
 assert.match(read('app/login/page.tsx'),/redirect\('\/'\)/);
});
test('All API routes use server service-role and no auth.getUser guard',()=>{
 const paths=['analyze','parse','proposals','documents','cases','cases/[id]','cases/[id]/action','cases/[id]/export'];
 for(const path of paths){const route=read(`app/api/${path}/route.ts`);
  assert.match(route,/createAdminClient/);
  assert.doesNotMatch(route,/auth\.getUser\(|from ['"]@\/lib\/supabase\/server/);
 }
});
test('SQL migration permits guest records and requires service_role for mutation RPCs',()=>{
 const migration=read('db/migration_no_login.sql');
 for(const name of ['analysis_runs','change_proposals','rnd_cases','rnd_case_events','rnd_released_dossiers'])
  assert.match(migration,new RegExp(`alter table public\\.${name} .* drop not null`));
 for(const fn of ['rnd_save_case','rnd_submit_case','rnd_review_case','rnd_publish_case']){
  assert.match(migration,new RegExp(`function public\\.${fn}\\(`));
 }
 assert.match(migration,/auth\.role\(\)\) <> 'service_role'/);
 assert.match(migration,/p_reviewer_name/);
 assert.match(migration,/grant execute on function public\.rnd_publish_case\(uuid\) to service_role/);
});
test('Production guest mode defaults to disabled; role secret is used only in server client',()=>{
 assert.match(read('lib/supabase/admin.ts'),/RND_ALLOW_PUBLIC_ACCESS.*!=='true'/);
 assert.match(read('lib/supabase/admin.ts'),/SUPABASE_SERVICE_ROLE_KEY/);
 assert.doesNotMatch(read('app/(portal)/layout.tsx'),/SUPABASE_SERVICE_ROLE_KEY/);
 assert.match(read('README_NO_LOGIN.md'),/CẢNH BÁO BẢO MẬT/);
});

test('Legacy auth middleware cannot be shipped in the No Login project',()=>{
 for(const path of ['middleware.ts','middleware.js','src/middleware.ts','src/middleware.js',
  'lib/supabase/server.ts','lib/supabase/client.ts','components/sign-out.tsx']){
  assert.equal(existsSync(new URL('../'+path,import.meta.url)),false, `Lỗi: còn file Auth cũ ${path}`);
 }
 const pkg=JSON.parse(read('package.json'));
 assert.equal(pkg.dependencies?.['@supabase/ssr'],undefined);
 assert.equal(pkg.scripts['fix:legacy'],'node scripts/cleanup-legacy.mjs');
});
