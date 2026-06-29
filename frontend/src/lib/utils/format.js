export function formatCurrency(amount, currency = 'Bs') {
  let actualCurrency = currency;
  if (currency === 'S/' || currency === 'SOL' || currency === 'BS' || currency === 'BOB') {
    actualCurrency = 'Bs';
  }
  return `${actualCurrency} ${Number(amount).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export const formatDate = (date) => {
  if (!date) return '---';
  try {
    const d = new Date(date);
    if (isNaN(d.getTime())) return '---';
    return d.toLocaleDateString('es-BO', {
      timeZone: 'America/La_Paz',
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
  } catch (e) {
    return '---';
  }
};

export const formatTime = (date) => {
  if (!date) return '---';
  try {
    const d = new Date(date);
    if (isNaN(d.getTime())) return '---';
    return d.toLocaleTimeString('es-BO', {
      timeZone: 'America/La_Paz',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false
    });
  } catch (e) {
    return '---';
  }
};

export const formatDateTime = (date) => {
  if (!date) return '---';
  try {
    const d = new Date(date);
    if (isNaN(d.getTime())) return '---';
    return d.toLocaleString('es-BO', {
      timeZone: 'America/La_Paz',
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false
    });
  } catch (e) {
    return '---';
  }
};
