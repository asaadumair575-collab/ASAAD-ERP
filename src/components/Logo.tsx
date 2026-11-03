import { APP_NAME } from "@/lib/format";

export default function Logo({ small = false, light = false }: { small?: boolean; light?: boolean }) {
  const initials = APP_NAME.split(/\s+/).map((w) => w[0]).join("").slice(0, 2).toUpperCase();
  return (
    <span className="inline-flex items-center gap-2.5">
      <span className={`${small ? "w-7 h-7 text-[11px]" : "w-9 h-9 text-xs"} rounded-xl ${light ? "bg-white text-gray-950" : "bg-gray-950 text-white"} font-bold flex items-center justify-center`}>{initials}</span>
      <span className={`${small ? "text-sm" : "text-base"} font-semibold tracking-tight ${light ? "text-white" : "text-gray-950"}`}>{APP_NAME}</span>
    </span>
  );
}
