import Link from 'next/link';
import { benutzerOderLogin } from '@/lib/auth';
import { logoutAction } from '../actions';

const NAV = [
  { href: '/', label: 'Übersicht' },
  { href: '/leads', label: 'Neue Leads' },
  { href: '/pipeline', label: 'Pipeline' },
  { href: '/freigaben', label: 'Freigaben' },
  { href: '/agenten', label: 'Agenten' },
];

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const benutzer = await benutzerOderLogin();
  return (
    <div className="min-h-screen md:flex">
      <aside className="border-b border-stone-200 bg-white md:sticky md:top-0 md:h-screen md:w-56 md:shrink-0 md:border-b-0 md:border-r">
        <div className="flex items-center justify-between p-4 md:block">
          <Link href="/" className="font-semibold text-marke">Betriebssystem</Link>
          <p className="text-xs text-stone-500 md:mt-1">{benutzer.name}</p>
        </div>
        <nav className="flex gap-1 overflow-x-auto px-2 pb-2 md:flex-col md:pb-0">
          {NAV.map((n) => (
            <Link key={n.href} href={n.href} className="whitespace-nowrap rounded-md px-3 py-2 text-sm hover:bg-stone-100">
              {n.label}
            </Link>
          ))}
          <Link href="/betriebe/neu" className="whitespace-nowrap rounded-md px-3 py-2 text-sm font-medium text-marke hover:bg-marke-hell">
            + Betrieb anlegen
          </Link>
        </nav>
        <form action={logoutAction} className="hidden p-4 md:absolute md:bottom-0 md:block">
          <button className="text-xs text-stone-500 hover:underline">Abmelden</button>
        </form>
      </aside>
      <main className="min-w-0 flex-1 p-4 md:p-8">{children}</main>
    </div>
  );
}
