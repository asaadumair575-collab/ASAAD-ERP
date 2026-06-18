export type Grade = {
  label: string;
  badgeClass: string;
};

const TIERS: { minDzn: number; label: string; badgeClass: string }[] = [
  { minDzn: 100, label: "Titanium", badgeClass: "bg-slate-700 text-white" },
  { minDzn: 50, label: "Diamond", badgeClass: "bg-cyan-100 text-cyan-800" },
  { minDzn: 24, label: "Gold", badgeClass: "bg-yellow-100 text-yellow-800" },
  { minDzn: 10, label: "B", badgeClass: "bg-gray-200 text-gray-700" },
];

const DEFAULT_GRADE: Grade = { label: "C", badgeClass: "bg-orange-100 text-orange-800" };

export function gradeForMonthlyDzn(monthlyDzn: number): Grade {
  for (const tier of TIERS) {
    if (monthlyDzn >= tier.minDzn) {
      return { label: tier.label, badgeClass: tier.badgeClass };
    }
  }
  return DEFAULT_GRADE;
}

export function averageMonthlyDzn(
  orders: { date: Date; items: { quantity: number }[] }[]
): number {
  if (orders.length === 0) return 0;

  const totalQty = orders.reduce(
    (sum, o) => sum + o.items.reduce((s, i) => s + i.quantity, 0),
    0
  );

  const months = new Set(
    orders.map((o) => `${o.date.getFullYear()}-${o.date.getMonth()}`)
  );

  return totalQty / months.size;
}
