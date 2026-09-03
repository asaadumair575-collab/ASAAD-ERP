export function dispatchSheetNumber(id: number): string {
  return `DIS-${String(id).padStart(3, "0")}`;
}
