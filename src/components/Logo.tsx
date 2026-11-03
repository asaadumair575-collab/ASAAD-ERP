import { APP_NAME } from "@/lib/format";

export default function Logo({ small = false }: { small?: boolean }) {
  const initials = APP_NAME.split(/\s+/).map((w) => w[0]).join("").slice(0, 2).toUpperCase();
  return (
    <span className="inline-flex items-center gap-2">
      <span className={`${small ? "w-7 h-7 text-[11px]" : "w-8 h-8 text-xs"} rounded-md bg-gray-900 text-white font-semibold flex items-center justify-center`}>{initials}</span>
      <span className={`${small ? "text-sm" : "text-base"} font-semibold text-gray-900`}>{APP_NAME}</span>
    </span>
  );
}
