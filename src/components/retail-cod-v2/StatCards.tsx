import { Package, Wallet, TrendingUp } from "lucide-react";

function fmt(n: number) {
  return n.toLocaleString("en-PK", { maximumFractionDigits: 0 });
}

export default function StatCards({ totalCount, totalValue }: { totalCount: number; totalValue: number }) {
  const avg = totalCount > 0 ? totalValue / totalCount : 0;
  const cards = [
    { label: "Orders", value: totalCount.toLocaleString(), icon: Package, color: "text-blue-600 bg-blue-50" },
    { label: "Total Value", value: `Rs ${fmt(totalValue)}`, icon: Wallet, color: "text-emerald-600 bg-emerald-50" },
    { label: "Avg. Order Value", value: `Rs ${fmt(avg)}`, icon: TrendingUp, color: "text-purple-600 bg-purple-50" },
  ];
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
      {cards.map((c) => {
        const Icon = c.icon;
        return (
          <div key={c.label} className="bg-white border border-gray-200 rounded-2xl p-4 shadow-sm flex items-center gap-3">
            <span className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${c.color}`}>
              <Icon className="w-4 h-4" />
            </span>
            <div className="min-w-0">
              <p className="text-[11px] text-gray-400 font-medium uppercase tracking-wide">{c.label}</p>
              <p className="text-lg font-bold text-[#16202E] tabular-nums truncate">{c.value}</p>
            </div>
          </div>
        );
      })}
    </div>
  );
}
