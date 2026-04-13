/**
 * Mapeo solo visual: códigos internos -> Nombres legibles.
 * No altera nivel_id ni lógica de negocio.
 */
const CODE_TO_NAME = {
  pasante: 'Pasante',
  global1: 'GLOBAL 1',
  global2: 'GLOBAL 2',
  global3: 'GLOBAL 3',
  global4: 'GLOBAL 4',
  global5: 'GLOBAL 5',
  global6: 'GLOBAL 6',
  global7: 'GLOBAL 7',
  global8: 'GLOBAL 8',
  global9: 'GLOBAL 9',
};

export function displayLevelCode(codigo) {
  const c = String(codigo || '').toLowerCase().trim();
  
  if (c === 'internar' || c === 'pasante') return 'Pasante';
  
  // Si ya es un nombre Global X, normalizar a GLOBAL X
  const match = c.match(/^global\s*([1-9])$/);
  if (match) {
    return `GLOBAL ${match[1]}`;
  }
  
  return CODE_TO_NAME[c] || codigo || '—';
}
