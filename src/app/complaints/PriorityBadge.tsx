export const PRIORITY_STYLE: Record<string, string> = {
  LOW:    "bg-gray-100 text-gray-600",
  MEDIUM: "bg-blue-100 text-blue-700",
  HIGH:   "bg-orange-100 text-orange-700",
  URGENT: "bg-red-100 text-red-700",
};

export default function PriorityBadge({ priority }: { priority: string }) {
  return (
    <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full ${PRIORITY_STYLE[priority] ?? "bg-gray-100 text-gray-500"}`}>
      {priority.charAt(0) + priority.slice(1).toLowerCase()}
    </span>
  );
}
