"use client";

import { createContext, useContext, useEffect, useState } from "react";

type AmountVisibilityContextValue = {
  visible: boolean;
  toggle: () => void;
};

const AmountVisibilityContext =
  createContext<AmountVisibilityContextValue | null>(null);

const STORAGE_KEY = "dashboard-amounts-visible";

export function AmountVisibilityProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored !== null) setVisible(stored === "true");
  }, []);

  function toggle() {
    setVisible((v) => {
      const next = !v;
      localStorage.setItem(STORAGE_KEY, String(next));
      return next;
    });
  }

  return (
    <AmountVisibilityContext.Provider value={{ visible, toggle }}>
      {children}
    </AmountVisibilityContext.Provider>
  );
}

function useAmountVisibility() {
  const ctx = useContext(AmountVisibilityContext);
  if (!ctx) {
    throw new Error(
      "useAmountVisibility must be used within AmountVisibilityProvider"
    );
  }
  return ctx;
}

export function AmountToggleButton() {
  const { visible, toggle } = useAmountVisibility();
  return (
    <button
      type="button"
      onClick={toggle}
      aria-label={visible ? "Hide amounts" : "Show amounts"}
      title={visible ? "Hide amounts" : "Show amounts"}
      className="inline-flex items-center justify-center w-9 h-9 rounded-lg border border-gray-200 text-gray-500 hover:text-black hover:border-gray-300 transition-colors"
    >
      {visible ? (
        <svg viewBox="0 0 20 20" fill="none" className="w-4.5 h-4.5">
          <path
            d="M2 10s2.8-5.5 8-5.5S18 10 18 10s-2.8 5.5-8 5.5S2 10 2 10Z"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <circle cx="10" cy="10" r="2.2" stroke="currentColor" strokeWidth="1.5" />
        </svg>
      ) : (
        <svg viewBox="0 0 20 20" fill="none" className="w-4.5 h-4.5">
          <path
            d="M2 10s2.8-5.5 8-5.5S18 10 18 10s-2.8 5.5-8 5.5S2 10 2 10Z"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <circle cx="10" cy="10" r="2.2" stroke="currentColor" strokeWidth="1.5" />
          <path d="M3 3l14 14" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
        </svg>
      )}
    </button>
  );
}

export function Amount({ value }: { value: string }) {
  const { visible } = useAmountVisibility();
  return <span>{visible ? value : "••••••"}</span>;
}
