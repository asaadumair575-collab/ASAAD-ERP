"use client";

import { useState } from "react";

type BackupItem = {
  key: string;
  label: string;
  desc: string;
};

const BACKUPS: BackupItem[] = [
  { key: "customers",   label: "Customers",         desc: "Wholesale customers — name, city, phone, address" },
  { key: "invoices",    label: "Invoices / Orders",  desc: "Saare wholesale orders aur payment status" },
  { key: "ecom-orders", label: "Retail COD Orders",  desc: "PostEx orders — tracking, customer, amount, status" },
];

export default function BackupButtons() {
  const [loading, setLoading] = useState<string | null>(null);

  async function download(key: string, label: string) {
    setLoading(key);
    try {
      const res = await fetch(`/api/backup?type=${key}`);
      if (!res.ok) throw new Error("Failed");
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      const cd = res.headers.get("Content-Disposition") ?? "";
      const match = cd.match(/filename="(.+?)"/);
      a.download = match?.[1] ?? `${key}-backup.csv`;
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      alert("Error downloading " + label);
    } finally {
      setLoading(null);
    }
  }

  return (
    <div className="space-y-3">
      {BACKUPS.map((b) => (
        <div key={b.key} className="bg-white border border-gray-200 rounded-2xl p-5 shadow-sm flex items-center justify-between gap-4">
          <div>
            <p className="text-sm font-semibold text-gray-800">{b.label}</p>
            <p className="text-xs text-gray-400 mt-0.5">{b.desc}</p>
          </div>
          <button
            onClick={() => download(b.key, b.label)}
            disabled={loading === b.key}
            className="shrink-0 bg-black text-white text-sm font-medium px-4 py-2 rounded-lg hover:bg-gray-800 transition-colors disabled:opacity-50"
          >
            {loading === b.key ? "Downloading..." : "Download CSV"}
          </button>
        </div>
      ))}

      <div className="bg-blue-50 border border-blue-200 rounded-2xl p-4">
        <p className="text-sm font-medium text-blue-800">Google Drive Folder</p>
        <p className="text-xs text-blue-600 mt-1">Download ke baad yeh files apne Drive folder mein drag karke dal do:</p>
        <a
          href="https://drive.google.com/drive/folders/1ggAVt0K7au9wFv_Qdy5LN9AKhDQzop_L"
          target="_blank"
          rel="noopener noreferrer"
          className="inline-block mt-2 text-xs text-blue-700 underline font-mono break-all"
        >
          drive.google.com/drive/folders/1ggAVt0K7...
        </a>
      </div>
    </div>
  );
}
