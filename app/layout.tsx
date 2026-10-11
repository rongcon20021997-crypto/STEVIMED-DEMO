import type {Metadata} from 'next';
import './globals.css';
export const metadata:Metadata={title:'DEMO STEVIMED | R&D Assistant',description:'Đối chiếu BOM, TDS và đề xuất mã sản phẩm theo quy trình R&D.'};
export default function RootLayout({children}:{children:React.ReactNode}){
  return <html lang="vi"><body>{children}</body></html>;
}
