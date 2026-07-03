import test from 'node:test';
import assert from 'node:assert/strict';

import {
  getBoliviaDateKey,
  getBoliviaTimeString,
  getBoliviaWithdrawalDayWindow
} from '../src/utils/boliviaTime.mjs';

test('getBoliviaDateKey usa America/La_Paz aunque el timestamp venga en UTC', () => {
  const utcTimestamp = new Date('2026-07-04T03:30:00.000Z');

  assert.equal(getBoliviaDateKey(utcTimestamp), '2026-07-03');
  assert.equal(getBoliviaTimeString(utcTimestamp), '23:30:00');
});

test('el limite diario cambia al cruzar de 23:59 a 00:00 hora Bolivia aunque no hayan pasado 24 horas', () => {
  const beforeReset = new Date('2026-07-04T03:58:00.000Z'); // 2026-07-03 23:58:00 -04
  const afterReset = new Date('2026-07-04T04:01:00.000Z'); // 2026-07-04 00:01:00 -04

  assert.equal(getBoliviaDateKey(beforeReset), '2026-07-03');
  assert.equal(getBoliviaDateKey(afterReset), '2026-07-04');
  assert.notEqual(getBoliviaDateKey(beforeReset), getBoliviaDateKey(afterReset));
});

test('la ventana diaria reporta reinicio a las 23:59 y siguiente fecha Bolivia', () => {
  const window = getBoliviaWithdrawalDayWindow(new Date('2026-07-04T03:59:30.000Z'));

  assert.equal(window.dateKey, '2026-07-03');
  assert.equal(window.resetTime, '23:59');
  assert.equal(window.startsAt, '2026-07-03T00:00:00-04:00');
  assert.equal(window.endsAt, '2026-07-03T23:59:59-04:00');
  assert.equal(window.nextDateKey, '2026-07-04');
});

test('los calculos siguen el calendario Bolivia aunque la fecha original venga con otra zona horaria', () => {
  const sourceWithDifferentOffset = new Date('2026-07-04T01:15:00+02:00');

  assert.equal(getBoliviaDateKey(sourceWithDifferentOffset), '2026-07-03');
  assert.equal(getBoliviaTimeString(sourceWithDifferentOffset), '19:15:00');
});
