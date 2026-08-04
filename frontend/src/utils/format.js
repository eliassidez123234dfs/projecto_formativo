const COP_FORMATTER = new Intl.NumberFormat('es-CO', {
  style: 'currency',
  currency: 'COP',
  maximumFractionDigits: 0,
});

export function formatCOP(value) {
  const number = Number(value);
  if (Number.isNaN(number)) return '$ 0';
  return COP_FORMATTER.format(Math.round(number));
}
