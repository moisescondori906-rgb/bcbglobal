export function validatePasanteWithdrawalRules({
  requestedAmount,
  balance,
  completedInternshipDays,
  requiredInternshipDays = 4,
  requiredAmount = 10
}) {
  const amount = Number(requestedAmount);
  const currentBalance = Number(balance);
  const completedDays = Number(completedInternshipDays || 0);

  if (completedDays < requiredInternshipDays) {
    return {
      ok: false,
      message: `Debes completar los ${requiredInternshipDays} dias de pasantia antes de solicitar tu retiro. Dias completados: ${completedDays}/${requiredInternshipDays}.`
    };
  }

  if (amount !== requiredAmount) {
    return {
      ok: false,
      message: `Los usuarios de pasantia solo pueden retirar exactamente ${requiredAmount} Bs.`
    };
  }

  if (currentBalance < requiredAmount) {
    return {
      ok: false,
      message: `Saldo insuficiente para realizar el retiro. Los usuarios de pasantia necesitan ${requiredAmount} Bs disponibles.`
    };
  }

  return { ok: true, amount: requiredAmount };
}
