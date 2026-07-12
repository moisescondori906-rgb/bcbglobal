export const WITHDRAWAL_ALLOWED_AMOUNTS = Object.freeze([25, 100, 500, 1500, 5000, 10000]);

export const RECHARGE_SCHEDULE = Object.freeze({
  enabled: true,
  dias_semana: [1, 2, 3, 4, 5, 6],
  hora_inicio: '09:00',
  hora_fin: '21:00'
});

export const WITHDRAWAL_SCHEDULE = Object.freeze({
  enabled: true,
  dias_semana: [1, 2, 3, 4, 5],
  hora_inicio: '09:00',
  hora_fin: '18:00'
});

export const WITHDRAWAL_PASANTIA_SCHEDULE = Object.freeze({
  enabled: true,
  dias_semana: [1, 2, 3, 4, 5, 6],
  hora_inicio: '09:00',
  hora_fin: '18:00'
});

export function isInternLevelCode(levelCode) {
  const normalized = String(levelCode || '').trim().toLowerCase();
  return normalized === 'internar' || normalized === 'pasantia';
}

export function getRechargeSchedule() {
  return RECHARGE_SCHEDULE;
}

export function getWithdrawalSchedule(levelCode) {
  return isInternLevelCode(levelCode)
    ? WITHDRAWAL_PASANTIA_SCHEDULE
    : WITHDRAWAL_SCHEDULE;
}
