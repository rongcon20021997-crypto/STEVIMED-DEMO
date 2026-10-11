"use client";

import Link from 'next/link';
import {usePathname} from 'next/navigation';
import {LayoutDashboard, Search, Boxes, History, FilePlus2, ClipboardList} from 'lucide-react';
import {isActiveNavPath} from '@/lib/navigation.mjs';

const menu = [
  {href:'/', label:'Tổng quan', icon:LayoutDashboard},
  {href:'/analyze', label:'Phân tích cấu hình', icon:Search},
  {href:'/catalog', label:'Danh mục BTP / NVL', icon:Boxes},
  {href:'/history', label:'Lịch sử đối chiếu', icon:History},
  {href:'/proposals', label:'Phiếu đề xuất cũ', icon:FilePlus2},
  {href:'/cases', label:'Hồ sơ R&D / Phát hành', icon:ClipboardList},
];

export default function PortalMenu() {
  // usePathname() theo dõi điều hướng client-side, kể cả Back/Forward.
  const pathname = usePathname();
  return (
    <nav aria-label="Menu chính" className="nav-links">
      {menu.map(({href, label, icon: Icon}) => {
        const active = isActiveNavPath(pathname, href);
        return (
          <Link
            key={href}
            href={href}
            className={active ? 'active' : undefined}
            aria-current={active ? 'page' : undefined}
          >
            <Icon size={19}/>{label}
          </Link>
        );
      })}
    </nav>
  );
}
