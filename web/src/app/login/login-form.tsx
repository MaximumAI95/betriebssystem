'use client';

import { useActionState } from 'react';
import { loginAction } from '../actions';

export function LoginForm() {
  const [zustand, aktion, laeuft] = useActionState(loginAction, undefined);
  return (
    <form action={aktion} className="space-y-4">
      <div>
        <label className="etikett" htmlFor="email">E-Mail</label>
        <input id="email" name="email" type="email" autoComplete="username" required defaultValue={zustand?.email} className="eingabe" />
      </div>
      <div>
        <label className="etikett" htmlFor="passwort">Passwort</label>
        <input id="passwort" name="passwort" type="password" autoComplete="current-password" required className="eingabe" />
      </div>
      {zustand?.fehler && <p className="text-sm text-red-700" role="alert" data-fehler>{zustand.fehler}</p>}
      <button type="submit" disabled={laeuft} className="knopf-primaer w-full justify-center">
        {laeuft ? 'Anmelden …' : 'Anmelden'}
      </button>
    </form>
  );
}
