import { create } from "zustand";

// Small global store for the new Retail COD pages — just tracks which
// order rows are checked so the bulk-action bar (move stage, etc.) can
// read/clear it from anywhere without prop-drilling through every table.
type OrderSelectionState = {
  selected: Set<number>;
  toggle: (id: number) => void;
  toggleAll: (ids: number[]) => void;
  clear: () => void;
};

export const useOrderSelection = create<OrderSelectionState>((set, get) => ({
  selected: new Set(),
  toggle: (id) => {
    const next = new Set(get().selected);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    set({ selected: next });
  },
  toggleAll: (ids) => {
    const { selected } = get();
    const allSelected = ids.length > 0 && ids.every((id) => selected.has(id));
    set({ selected: allSelected ? new Set() : new Set(ids) });
  },
  clear: () => set({ selected: new Set() }),
}));
