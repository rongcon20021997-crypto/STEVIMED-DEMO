// Removes obsolete authentication files left behind when a newer ZIP is
// extracted OVER an older Full/V2 project. It never touches .env.local,
// imported data or user-managed files.
import { existsSync, rmSync } from 'node:fs';
import { dirname, resolve, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const oldAuthFiles = [
  'middleware.ts',
  'middleware.js',
  'src/middleware.ts',
  'src/middleware.js',
  'lib/supabase/server.ts',
  'lib/supabase/client.ts',
  'src/lib/supabase/server.ts',
  'src/lib/supabase/client.ts',
  'components/sign-out.tsx',
  'src/components/sign-out.tsx',

];

const automatic = process.argv.includes('--auto');
const staleAuth = oldAuthFiles.some(rel => existsSync(resolve(root, rel)));
// Keep Next.js build caches intact unless stale auth files actually exist.
const targets = automatic && !staleAuth ? [] : [...oldAuthFiles, '.next'];

for (const rel of targets) {
  const target = resolve(root, rel);
  if (relative(root, target).startsWith('..')) throw new Error('Unsafe path');
  if (existsSync(target)) {
    rmSync(target, { recursive: true, force: true });
    console.log(`Đã xóa file/cache cũ: ${rel}`);
  }
}
if (targets.length) console.log('Đã dọn xong các file Auth đời cũ. Tiếp tục: npm install && npm run dev');
