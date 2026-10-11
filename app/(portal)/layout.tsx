import Link from 'next/link';
import Image from 'next/image';
import {ShieldAlert} from 'lucide-react';
import PortalMenu from '@/components/portal-menu';
export default function PortalLayout({children}:{children:React.ReactNode}){
  return <div className="app-shell"><aside className="sidebar">
    <Link href="/" className="brand">
      <span className="brand-mark" style={{ background: '#ffffff', padding: '4px' }}>
        <Image src="/logo.png" alt="STEVIMED Logo" width={36} height={20} style={{ objectFit: 'contain' }} priority />
      </span>
      <span><strong>DEMO STEVIMED</strong></span>
    </Link>
    <div className="nav-label">KHÔNG GIAN LÀM VIỆC</div>
    <PortalMenu/>
    <div className="sidebar-bottom"><div className="secure"><ShieldAlert size={18}/><span>Chế độ truy cập trực tiếp · Không xác thực người dùng</span></div></div>
  </aside><div className="workspace"><header className="topbar"><div className="mobile-brand" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}><Image src="/logo.png" alt="STEVIMED Logo" width={28} height={16} style={{ objectFit: 'contain' }} /> DEMO STEVIMED</div><span className="top-note"><span className="live-dot"/> R&D · BOM / TDS / SOP / Duyệt</span><span className="top-email">Không cần đăng nhập</span></header><main className="main-content">{children}</main></div></div>;
}
