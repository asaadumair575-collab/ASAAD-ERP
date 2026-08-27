"use client";

import { useState } from "react";

export default function HiddenPhone({ phone }: { phone: string }) {
  const [revealed, setRevealed] = useState(false);

  if (revealed) {
    return <p className="text-sm text-gray-800 font-mono select-all">{phone}</p>;
  }

  return (
    <button
      onClick={() => setRevealed(true)}
      className="text-sm text-gray-400 hover:text-gray-700 transition-colors flex items-center gap-1.5"
    >
      <svg viewBox="0 0 16 16" fill="none" className="w-3.5 h-3.5 shrink-0">
        <path d="M1 8s2.5-5 7-5 7 5 7 5-2.5 5-7 5-7-5-7-5Z" stroke="currentColor" strokeWidth="1.3"/>
        <circle cx="8" cy="8" r="2" stroke="currentColor" strokeWidth="1.3"/>
        <path d="M2 2l12 12" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/>
      </svg>
      Show number
    </button>
  );
}
