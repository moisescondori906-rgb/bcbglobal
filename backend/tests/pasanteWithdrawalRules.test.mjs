import test from 'node:test';
import assert from 'node:assert/strict';

import { validatePasanteWithdrawalRules } from '../src/utils/withdrawalRules.mjs';

test('rechaza retiro de pasante si no completo los 4 dias de pasantia', () => {
  const result = validatePasanteWithdrawalRules({
    requestedAmount: 10,
    balance: 10,
    completedInternshipDays: 3
  });

  assert.equal(result.ok, false);
  assert.match(result.message, /4 dias de pasantia/i);
});

test('rechaza retiro de pasante si intenta retirar menos de 10 Bs', () => {
  const result = validatePasanteWithdrawalRules({
    requestedAmount: 9,
    balance: 9,
    completedInternshipDays: 4
  });

  assert.equal(result.ok, false);
  assert.match(result.message, /exactamente 10 Bs/i);
});

test('rechaza retiro de pasante si no tiene 10 Bs disponibles', () => {
  const result = validatePasanteWithdrawalRules({
    requestedAmount: 10,
    balance: 9,
    completedInternshipDays: 4
  });

  assert.equal(result.ok, false);
  assert.match(result.message, /10 Bs disponibles/i);
});

test('permite retiro de pasante solo con 4 dias completos y 10 Bs exactos', () => {
  const result = validatePasanteWithdrawalRules({
    requestedAmount: 10,
    balance: 10,
    completedInternshipDays: 4
  });

  assert.deepEqual(result, { ok: true, amount: 10 });
});
