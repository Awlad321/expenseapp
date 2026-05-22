export function formatMoney(value: number | string | null | undefined) {
  const amount = Number(value ?? 0);
  return `৳${amount.toLocaleString('en-BD', { maximumFractionDigits: 2 })}`;
}

export function currentMonth() {
  return new Date().toISOString().slice(0, 7);
}

export function today() {
  return new Date().toISOString().slice(0, 10);
}
