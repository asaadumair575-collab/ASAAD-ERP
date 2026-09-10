import { Clock, CheckCircle2, PauseCircle, PackageCheck, Truck } from "lucide-react";
import type { OrderStage } from "./stages";

export const STAGE_META: Record<OrderStage, { label: string; color: string; bg: string; icon: typeof Clock; chartColor: string }> = {
  PENDING: { label: "Pending", color: "text-amber-700", bg: "bg-amber-50 border-amber-200", icon: Clock, chartColor: "#d97706" },
  CONFIRMED: { label: "Confirmed", color: "text-blue-700", bg: "bg-blue-50 border-blue-200", icon: CheckCircle2, chartColor: "#2563eb" },
  HOLD: { label: "Hold", color: "text-red-700", bg: "bg-red-50 border-red-200", icon: PauseCircle, chartColor: "#dc2626" },
  READY_TO_PACK: { label: "Ready to Pack", color: "text-purple-700", bg: "bg-purple-50 border-purple-200", icon: PackageCheck, chartColor: "#7c3aed" },
  PACKED_DISPATCH: { label: "Packed & Ready to Dispatch", color: "text-emerald-700", bg: "bg-emerald-50 border-emerald-200", icon: Truck, chartColor: "#059669" },
};
