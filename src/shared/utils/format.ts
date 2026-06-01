export function formatMoney(value: number | string | null | undefined) {
  const amount = Number(value ?? 0);
  return `৳${amount.toLocaleString('en-BD', { maximumFractionDigits: 2 })}`;
}

export function currentMonth() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
}

export function today() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
}
