/**
 * Horarios desde publicContent:
 * { enabled, dias_semana: number[] (0=domingo … 6=sábado, como Date.getDay()), hora_inicio, hora_fin } "HH:mm"
 * Si enabled es false o falta, no se restringe.
 */
export function parseMinutes(hhmm) {
  if (!hhmm || typeof hhmm !== 'string') return 0;
  const [h, m] = hhmm.split(':').map((x) => parseInt(x, 10));
  if (Number.isNaN(h) || Number.isNaN(m)) return 0;
  return h * 60 + m;
}

export function isScheduleOpen(schedule) {
  if (!schedule || schedule.enabled === false) return { ok: true };
  
  // Obtener la hora actual en la zona horaria de Bolivia (UTC-4)
  const nowBolivia = new Date(new Date().toLocaleString('en-US', { timeZone: 'America/La_Paz' }));
  
  const dias = Array.isArray(schedule.dias_semana) ? schedule.dias_semana : [];
  if (dias.length === 0) return { ok: false, message: 'No hay días habilitados en el horario configurado.' };
  
  const day = nowBolivia.getDay();
  if (!dias.includes(day)) {
    return {
      ok: false,
      message: 'Hoy no está dentro de los días permitidos para esta operación.',
    };
  }
  const start = parseMinutes(schedule.hora_inicio || '00:00');
  const end = parseMinutes(schedule.hora_fin || '23:59');
  const cur = nowBolivia.getHours() * 60 + nowBolivia.getMinutes();
  let inWindow;
  if (start <= end) {
    inWindow = cur >= start && cur <= end;
  } else {
    // ventana que cruza medianoche
    inWindow = cur >= start || cur <= end;
  }
  if (!inWindow) {
    return {
      ok: false,
      message: `Fuera del horario permitido (${schedule.hora_inicio || '00:00'} – ${schedule.hora_fin || '23:59'}).`,
    };
  }
  return { ok: true };
}
