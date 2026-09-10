export const STAGES = ["PENDING", "CONFIRMED", "HOLD", "READY_TO_PACK", "PACKED_DISPATCH"] as const;
export type OrderStage = (typeof STAGES)[number];
