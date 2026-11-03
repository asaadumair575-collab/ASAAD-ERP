"use client";

import { Printer } from "lucide-react";
import { btn } from "./ui";

export default function PrintButton() {
  return <button type="button" onClick={() => window.print()} className={btn("primary")}><Printer className="w-4 h-4" />Print</button>;
}
