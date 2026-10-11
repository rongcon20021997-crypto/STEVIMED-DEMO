import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {isActiveNavPath,normalizeNavPath} from '../lib/navigation.mjs';

const items = ['/', '/analyze', '/catalog', '/history', '/proposals', '/cases'];
const read = (path) => readFileSync(new URL('../'+path, import.meta.url), 'utf8');

test('Menu chỉ tô đúng mục hiện tại trên sáu trang chính', () => {
  for (const path of items) {
    assert.deepEqual(items.filter((item)=>isActiveNavPath(path,item)),[path],path);
  }
});

test('Trang chi tiết vẫn active menu cha và không active Tổng quan', () => {
  for (const path of ['/cases/123', '/cases/123/edit', '/cases/123/']) {
    assert.deepEqual(items.filter((item)=>isActiveNavPath(path,item)),['/cases']);
  }
});

test('Không nhận nhầm URL cùng tiền tố, xử lý dấu / cuối', () => {
  assert.equal(isActiveNavPath('/cases-old', '/cases'),false);
  assert.equal(isActiveNavPath('/analysis', '/analyze'),false);
  assert.equal(isActiveNavPath('/cases/','/cases'),true);
  assert.equal(normalizeNavPath(null),'/');
});

test('Client navigation lắng nghe pathname, set aria-current và style active động', () => {
  const menu=read('components/portal-menu.tsx');
  const layout=read('app/(portal)/layout.tsx');
  const css=read('app/globals.css');
  assert.match(menu,/"use client"/);
  assert.match(menu,/usePathname\(\)/);
  assert.match(menu,/isActiveNavPath\(pathname, href\)/);
  assert.match(menu,/className=\{active \? 'active'/);
  assert.match(menu,/aria-current=\{active \? 'page'/);
  assert.match(layout,/<PortalMenu\/>/);
  assert.match(css,/\.nav-links a\.active\{/);
  assert.doesNotMatch(css,/\.nav-links a:first-child\{/);
});
