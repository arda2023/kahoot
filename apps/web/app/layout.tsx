import type { Metadata } from 'next';
import { brand } from '@quiz/ui';
export const metadata: Metadata = {title:brand.name,description:brand.tagline};
export default function Layout({children}:{children:React.ReactNode}) { return <html lang="de"><body>{children}</body></html>; }
