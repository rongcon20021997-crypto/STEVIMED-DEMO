import type {Metadata} from 'next';
import './globals.css';
export const metadata:Metadata={title:'R&D AI Assistant | Tra cứu cấu hình',description:'Đối chiếu BOM, TDS và đề xuất mã sản phẩm theo quy trình R&D.'};
export default function RootLayout({children}:{children:React.ReactNode}){
  return <html lang="vi"><body>{children}</body></html>;
}
