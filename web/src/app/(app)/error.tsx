'use client';

export default function Fehler({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <div className="karte max-w-lg p-6">
      <h2 className="font-semibold">Das hat nicht geklappt</h2>
      <p className="mt-2 text-sm text-stone-600">{error.message || 'Unbekannter Fehler.'}</p>
      {error.digest && <p className="mt-1 text-xs text-stone-400">Fehlercode {error.digest}</p>}
      <button onClick={reset} className="knopf mt-4">Erneut versuchen</button>
    </div>
  );
}
