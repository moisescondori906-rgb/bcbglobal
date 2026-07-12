export const WITHDRAWAL_ALLOWED_AMOUNTS = Object.freeze([25, 100, 500, 1500, 5000, 10000]);

export const FIXED_RECHARGE_SCHEDULE = Object.freeze({
  enabled: true,
  dias_semana: [1, 2, 3, 4, 5, 6],
  hora_inicio: '09:00',
  hora_fin: '21:00'
});

export const FIXED_WITHDRAWAL_SCHEDULE = Object.freeze({
  enabled: true,
  dias_semana: [1, 2, 3, 4, 5],
  hora_inicio: '09:00',
  hora_fin: '18:00'
});

export const FIXED_WITHDRAWAL_PASANTIA_SCHEDULE = Object.freeze({
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
  return FIXED_RECHARGE_SCHEDULE;
}

export function getWithdrawalSchedule(levelCode) {
  return isInternLevelCode(levelCode)
    ? FIXED_WITHDRAWAL_PASANTIA_SCHEDULE
    : FIXED_WITHDRAWAL_SCHEDULE;
}
