/** Chuẩn hóa URL để các đường dẫn /cases và /cases/ là như nhau. */
export function normalizeNavPath(pathname) {
  const value = typeof pathname === 'string' && pathname ? pathname : '/';
  return value.replace(/\/+$/, '') || '/';
}

/** Menu cha vẫn sáng khi mở trang con, nhưng / chỉ sáng ở trang chủ. */
export function isActiveNavPath(pathname, href) {
  const current = normalizeNavPath(pathname);
  const target = normalizeNavPath(href);
  return target === '/' ? current === '/' : current === target || current.startsWith(`${target}/`);
}
