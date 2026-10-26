import type { Metadata } from 'next';
import { brand } from '@quiz/ui';
import './globals.css';
export const metadata: Metadata = {title:brand.name,description:brand.tagline};
export default function Layout({children}:{children:React.ReactNode}) { return <html lang="de"><body style={{'--primary':brand.primary,'--ink':brand.ink,'--background':brand.background} as React.CSSProperties}><header><a className="logo" href="/"><span className="mark">{brand.mark}</span>{brand.name}</a><nav><a href="/">Mitspielen</a><a href="/library">Meine Quizze</a></nav></header>{children}<footer>{brand.name} · Wissen macht gemeinsam mehr Spaß.</footer></body></html>; }
