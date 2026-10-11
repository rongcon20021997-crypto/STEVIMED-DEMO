import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const config=readFileSync(new URL('../next.config.ts',import.meta.url),'utf8');
const printer=readFileSync(new URL('../lib/pdf-dossier.mjs',import.meta.url),'utf8');
const route=readFileSync(new URL('../app/api/cases/[id]/export/route.ts',import.meta.url),'utf8');
const pkg=JSON.parse(readFileSync(new URL('../package.json',import.meta.url),'utf8'));
test('pdfmake and fontkit are exempt from Turbopack server bundling',()=>{
 assert.match(config,/serverExternalPackages/);
 for(const pkg of ['pdfmake','@foliojs-fork/pdfkit','@foliojs-fork/fontkit'])assert.ok(config.includes(`"${pkg}"`),pkg);
 assert.ok(config.includes('data.trie'));
 assert.ok(config.includes('vfs_fonts.js'));
});
test('PDF uses native Node require, not bundled dynamic import',()=>{
 assert.ok(printer.includes("createRequire"));
 assert.ok(printer.includes("nodeRequire('pdfmake')"));
 assert.ok(printer.includes("nodeRequire('pdfmake/build/vfs_fonts.js')"));
 assert.ok(!printer.includes("import('pdfmake')"));
 assert.ok(!printer.includes("import('pdfmake/build/vfs_fonts.js')"));
});
test('PDF routes run on Node, with real runtime smoke command',()=>{
 assert.match(route,/runtime='nodejs'/);
 assert.equal(pkg.scripts['verify:pdf'],'node scripts/verify-pdf-runtime.mjs');
});
