// Ordnet Betriebe, die die festen Regeln nicht sicher zuordnen konnten, mit Claude ein.
// Läuft nur mit ANTHROPIC_API_KEY und nur über die unsicheren Fälle, in Paketen.

import Anthropic from '@anthropic-ai/sdk';
import { betaZodOutputFormat } from '@anthropic-ai/sdk/helpers/beta/zod';
import { z } from 'zod';
import { BEREICHE, BEREICH_SCHLUESSEL, type Bereich } from './kategorien.ts';
import { domain } from './website.ts';
import type { Rohlead } from './typen.ts';

const MODELL = process.env.CLAUDE_MODEL ?? 'claude-opus-5-5';
const PAKETGROESSE = 40;

const Antwort = z.object({
  betriebe: z.array(
    z.object({
      nr: z.number().int(),
      bereich: z.enum(BEREICH_SCHLUESSEL as [Bereich, ...Bereich[]]),
      kategorie: z.string(),
      kein_betrieb: z.boolean(),
    }),
  ),
});

const SYSTEM = `Du ordnest lokale Betriebe aus Deutschland in Bereiche ein. Bereiche:
${BEREICH_SCHLUESSEL.map((b) => `- ${b}: ${BEREICHE[b].label}`).join('\n')}

Für jeden Eintrag: den passenden Bereich, eine kurze deutsche Kategorie (z. B. „Elektroinstallateur“, „Steuerberater“, „Friseur“) und kein_betrieb = true, wenn es kein privatwirtschaftlicher Betrieb ist (Verein, Behörde, Schule, Kirche, Kette mit Zentrale).
Entscheide nur aus Name, Website-Domain und Hinweisen. Ist es nicht erkennbar, nimm „sonstige“ und Kategorie „Unbekannt“.`;

export async function ordneMitClaudeEin(leads: Rohlead[], fortschritt?: (t: string) => void): Promise<{ geaendert: number; tokensEin: number; tokensAus: number }> {
  const unsicher = leads.filter((l) => !l.zuordnung.sicher && !l.zuordnung.ausschluss && !l.kette);
  if (unsicher.length === 0) return { geaendert: 0, tokensEin: 0, tokensAus: 0 };
  const client = new Anthropic();
  let geaendert = 0, tokensEin = 0, tokensAus = 0;

  for (let i = 0; i < unsicher.length; i += PAKETGROESSE) {
    const paket = unsicher.slice(i, i + PAKETGROESSE);
    const liste = paket
      .map((l, nr) => `${nr}. ${l.name} | ${domain(l.website) ?? 'keine Website'} | Hinweis: ${l.zuordnung.kategorie}`)
      .join('\n');

    const antwort = await client.beta.messages.parse({
      model: MODELL,
      max_tokens: 8000,
      betas: ['server-side-fallback-2026-07-01'],
      fallbacks: 'default',
      output_config: { effort: 'low', format: betaZodOutputFormat(Antwort) },
      system: SYSTEM,
      messages: [{ role: 'user', content: `Ordne diese ${paket.length} Betriebe ein:\n${liste}` }],
    });
    tokensEin += antwort.usage.input_tokens;
    tokensAus += antwort.usage.output_tokens;

    if (antwort.stop_reason === 'refusal' || !antwort.parsed_output) {
      fortschritt?.(`Paket ${i / PAKETGROESSE + 1}: keine Einordnung erhalten (${antwort.stop_reason}), Regeln bleiben bestehen.`);
      continue;
    }
    for (const e of antwort.parsed_output.betriebe) {
      const lead = paket[e.nr];
      if (!lead) continue;
      lead.zuordnung = {
        bereich: e.bereich,
        kategorie: e.kategorie,
        passung: BEREICHE[e.bereich].passung,
        sicher: true,
        ...(e.kein_betrieb ? { ausschluss: 'laut Claude kein Betrieb' } : {}),
      };
      geaendert++;
    }
    fortschritt?.(`Claude: ${Math.min(i + PAKETGROESSE, unsicher.length)} von ${unsicher.length} eingeordnet`);
  }
  return { geaendert, tokensEin, tokensAus };
}
