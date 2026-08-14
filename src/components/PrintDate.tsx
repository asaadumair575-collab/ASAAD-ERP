"use client";

export default function PrintDate() {
  const today = new Date().toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
  return <span className="hidden print:inline">{today}</span>;
}
