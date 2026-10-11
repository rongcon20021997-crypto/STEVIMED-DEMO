import Link from 'next/link';
import {FlaskConical,ShieldAlert} from 'lucide-react';
import PortalMenu from '@/components/portal-menu';
export default function PortalLayout({children}:{children:React.ReactNode}){
  return <div className="app-shell"><aside className="sidebar">
    <Link href="/" className="brand"><span className="brand-mark"><FlaskConical size={23}/></span><span><strong>R&D Intelligence</strong><small>PRODUCT ENGINEERING</small></span></Link>
    <div className="nav-label">KHÔNG GIAN LÀM VIỆC</div>
    <PortalMenu/>
    <div className="sidebar-bottom"><div className="secure"><ShieldAlert size={18}/><span>Chế độ truy cập trực tiếp · Không xác thực người dùng</span></div></div>
  </aside><div className="workspace"><header className="topbar"><div className="mobile-brand"><FlaskConical size={20}/> R&D Intelligence</div><span className="top-note"><span className="live-dot"/> R&D · BOM / TDS / SOP / Duyệt</span><span className="top-email">Không cần đăng nhập</span></header><main className="main-content">{children}</main></div></div>;
}
