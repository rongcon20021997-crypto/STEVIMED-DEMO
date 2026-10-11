import {DemoWorkflow} from '@/components/demo-workflow';
import {notFound} from 'next/navigation';
export const metadata={title:'Demo đối chiếu R&D · TDS thực tế'};
export default function DemoPage(){
  // The supplied customer specification/TDS is confidential; never enable publicly by default.
  if(process.env.NODE_ENV==='production'&&process.env.ALLOW_PUBLIC_RND_DEMO!=='true')notFound();
  return <DemoWorkflow/>;
}
