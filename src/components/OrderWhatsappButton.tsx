"use client";
import { useState } from "react";

export default function OrderWhatsappButton({
  order,
  client,
}: {
  order: {
    date: string;
    items: { description: string; quantity: number }[];
    feltColor: string | null;
    stamp: string | null;
    packing: string | null;
    saleAmount: number;
  };
  client: {
    name: string;
    city: string;
    phone: string | null;
  };
}) {
  const [copied, setCopied] = useState(false);

  function buildMessage() {
    const date = new Date(order.date).toLocaleDateString("en-GB").replace(/\//g, "-");
    const lines: string[] = [];

    lines.push(`Date: ${date}`);
    lines.push("");

    for (const item of order.items) {
      lines.push(`Ball Type: ${item.description}`);
      lines.push(`Qty: ${item.quantity} dzn`);
    }

    if (order.stamp) lines.push(`Stamp: ${order.stamp}`);
    if (order.feltColor) lines.push(`Felt Color: ${order.feltColor}`);
    if (order.packing) lines.push(`Packing: ${order.packing}`);

    lines.push("");
    lines.push(client.name);
    lines.push(client.city);
    if (client.phone) lines.push(client.phone);

    return lines.join("\n");
  }

  function copy() {
    const msg = buildMessage();
    navigator.clipboard.writeText(msg).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }

  return (
    <button
      onClick={copy}
      className={`text-xs font-medium px-3 py-1.5 rounded-lg border transition-colors ${
        copied
          ? "bg-green-50 border-green-300 text-green-700"
          : "bg-white border-gray-200 text-gray-600 hover:bg-gray-50"
      }`}
    >
      {copied ? "✓ Copied!" : "📋 Copy Order Slip"}
    </button>
  );
}
