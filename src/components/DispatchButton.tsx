"use client";

export default function DispatchButton({
  dispatched,
  trackingNumber,
  toggleAction,
}: {
  dispatched: boolean;
  trackingNumber: string | null;
  toggleAction: (fd: FormData) => Promise<void>;
}) {
  const hasTracking = (trackingNumber ?? "").replace(/\s/g, "").length >= 14;
  if (dispatched) return null;

  return (
    <div className="flex flex-col items-end gap-1">
      <form action={toggleAction}>
        <button
          type="submit"
          disabled={!hasTracking}
          className={`text-sm font-medium px-4 py-2 rounded-lg transition-colors ${
            hasTracking
              ? "bg-orange-600 text-white hover:bg-orange-700"
              : "bg-gray-100 text-gray-400 cursor-not-allowed"
          }`}
        >
          Mark as Dispatched
        </button>
      </form>
      {!dispatched && !hasTracking && (
        <p className="text-[11px] text-orange-600">Enter 14-digit tracking number first</p>
      )}
    </div>
  );
}
