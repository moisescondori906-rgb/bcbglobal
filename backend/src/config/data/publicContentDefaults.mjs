/** Valores por defecto para store.publicContent (merge superficial). */
export const publicContentDefaults = {
  home_guide: '',
  popup_title: '',
  popup_message: '',
  popup_enabled: false,
  conferencia_title: '',
  conferencia_noticias: '',
  /** Si enabled=false, recargas/retiros sin restricción de horario. */
  horario_recarga: {
    enabled: false,
    dias_semana: [1, 2, 3, 4, 5, 6, 0],
    hora_inicio: '09:00',
    hora_fin: '18:00',
  },
  horario_retiro: {
    enabled: false,
    dias_semana: [1, 2, 3, 4, 5, 6, 0],
    hora_inicio: '09:00',
    hora_fin: '18:00',
  },
  /** Requisito de 20 subordinados Global 3 para ascender a Global 4/Global 5 */
  require_s3_subordinates: true,
  /** Configuración de Recompensas */
  recompensas_visibles: true,
  recompensa_bienvenida_activa: true,
  recompensa_deposito_activa: true,
  recompensa_amigos_activa: true,
  recompensa_amigos_cantidad: 10,
  recompensa_amigos_nivel_minimo: 'Global 1', // Global 1 o superior
  telegram_global_enabled: true,
  telegram_recargas_enabled: true,
  telegram_retiros_enabled: true,
  task_allowed_days: '1,2,3,4,5',
  /** Comisión de Retiro (porcentaje) */
  comision_retiro: 12,
  /** Cuestionario Diario */
  cuestionario_activo: false,
  cuestionario_data: {
    titulo: 'Cuestionario Diario Obligatorio',
    preguntas: []
  },
  /** Configuración de Admins */
  notificar_grupo_recargas_siempre: false,
  /** Soporte y Redes */
  soporte_gerente_url: 'https://wa.me/59174344916',
  soporte_canal_url: 'https://whatsapp.com/channel/example',
  ruleta_activa: true,
};

export function mergePublicContent(pc) {
  const base = { ...publicContentDefaults, ...(pc || {}) };
  if (pc?.horario_recarga) {
    base.horario_recarga = { ...publicContentDefaults.horario_recarga, ...pc.horario_recarga };
  }
  if (pc?.horario_retiro) {
    base.horario_retiro = { ...publicContentDefaults.horario_retiro, ...pc.horario_retiro };
  }
  return base;
}
