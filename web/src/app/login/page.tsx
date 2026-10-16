import { redirect } from 'next/navigation';
import { aktuellerBenutzer } from '@/lib/auth';
import { LoginForm } from './login-form';

export default async function LoginPage() {
  if (await aktuellerBenutzer()) redirect('/');
  return (
    <main className="flex min-h-screen items-center justify-center p-4">
      <div className="karte w-full max-w-sm p-6">
        <h1 className="text-lg font-semibold">Betriebssystem</h1>
        <p className="mb-6 text-sm text-stone-500">Anmeldung für Max und Daniel</p>
        <LoginForm />
      </div>
    </main>
  );
}
