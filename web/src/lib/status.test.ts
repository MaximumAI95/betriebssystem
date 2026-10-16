import { test } from 'node:test';
import assert from 'node:assert/strict';
import { istErlaubt, erlaubteUebergaenge, darfFreigeben, emailVersandErlaubt, FREIGABE_FUER, STATUS } from './status.ts';

test('jeder Status hat definierte Übergänge auf gültige Status', () => {
  for (const s of STATUS) {
    for (const nach of erlaubteUebergaenge(s)) assert.ok(STATUS.includes(nach), `${s} → ${nach}`);
  }
});

test('Lead kann nur über die Pipeline zum Angebot', () => {
  assert.equal(istErlaubt('bewertet', 'interessant'), true);
  assert.equal(istErlaubt('bewertet', 'angebot'), false);
  assert.equal(istErlaubt('qa', 'live'), true);
  assert.equal(istErlaubt('in_umsetzung', 'live'), false);
});

test('Freigaben an den Stellen aus dem Plan', () => {
  assert.equal(FREIGABE_FUER.interessant, 'lead_interessant');
  assert.equal(FREIGABE_FUER.angebot, 'angebot');
  assert.equal(FREIGABE_FUER.live, 'livegang');
});

test('Livegang gibt nur Technik frei', () => {
  assert.equal(darfFreigeben('technik', 'livegang'), true);
  assert.equal(darfFreigeben('vertrieb', 'livegang'), false);
  assert.equal(darfFreigeben('vertrieb', 'lead_interessant'), true);
  assert.equal(darfFreigeben('betreuung', 'angebot'), false);
});

test('E-Mail-Versand nur mit Anfrage oder Einwilligung, nie bei Widerspruch', () => {
  assert.equal(emailVersandErlaubt({ hat_selbst_angefragt: false, widerspruch: false }), false);
  assert.equal(emailVersandErlaubt({ hat_selbst_angefragt: true, widerspruch: false }), true);
  assert.equal(emailVersandErlaubt({ hat_selbst_angefragt: false, widerspruch: false }, true), true);
  assert.equal(emailVersandErlaubt({ hat_selbst_angefragt: true, widerspruch: true }, true), false);
});
