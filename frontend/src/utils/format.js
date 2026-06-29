export const formatCurrency = (amount, currency = 'Bs') => {
  let actualCurrency = currency;
  if (currency === 'S/' || currency === 'SOL' || currency === 'BS' || currency === 'BOB') {
    actualCurrency = 'Bs';
  }
  const formatted = new Intl.NumberFormat('es-BO', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
  return `${actualCurrency} ${formatted}`;
};

export const formatDate = (date) => {
  if (!date) return '---';
  try {
    const d = new Date(date);
    if (isNaN(d.getTime())) return '---';
    return d.toLocaleDateString('es-BO', {
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
      hour: '2-digit',
      minute: '2-digit'
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
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  } catch (e) {
    return '---';
  }
};
