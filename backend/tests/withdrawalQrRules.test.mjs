import test from 'node:test';
import assert from 'node:assert/strict';

import { validateRequiredWithdrawalQrImage } from '../src/utils/withdrawalRules.mjs';

test('rechaza retiro cuando no se adjunta codigo QR', () => {
  const result = validateRequiredWithdrawalQrImage(null);

  assert.equal(result.ok, false);
  assert.match(result.message, /subir tu codigo qr/i);
});

test('rechaza retiro cuando el codigo QR llega vacio', () => {
  const result = validateRequiredWithdrawalQrImage('   ');

  assert.equal(result.ok, false);
  assert.match(result.message, /subir tu codigo qr/i);
});

test('permite retiro cuando el codigo QR viene informado', () => {
  const result = validateRequiredWithdrawalQrImage('data:image/png;base64,abc123');

  assert.deepEqual(result, { ok: true });
});
