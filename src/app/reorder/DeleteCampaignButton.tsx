"use client";

import { useRouter } from "next/navigation";
import { deleteReorderCampaign } from "@/lib/actions";

export default function DeleteCampaignButton({ id }: { id: number }) {
  const router = useRouter();
  async function handle() {
    if (!confirm("Delete this campaign and all its leads?")) return;
    await deleteReorderCampaign(id);
    router.refresh();
  }
  return (
    <button onClick={handle} className="text-xs border border-red-200 text-red-500 px-3 py-1.5 rounded-lg hover:bg-red-50 transition-colors">
      Delete
    </button>
  );
}
