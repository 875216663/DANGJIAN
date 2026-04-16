export function getCurrentMonth() {
  return new Date().toISOString().slice(0, 7);
}

export function getLastMonth() {
  const current = new Date();
  current.setMonth(current.getMonth() - 1);
  return current.toISOString().slice(0, 7);
}

export function calculateMonthDistance(monthValue: string) {
  if (!monthValue) {
    return Number.POSITIVE_INFINITY;
  }

  const [year, month] = monthValue.split('-').map(Number);
  const now = new Date();
  return (now.getFullYear() - year) * 12 + (now.getMonth() + 1 - month);
}
