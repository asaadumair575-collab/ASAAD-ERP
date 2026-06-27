export function whatsappLink(rawPhone: string | null | undefined) {
  if (!rawPhone) return null;
  let digits = rawPhone.replace(/\D/g, "");
  if (!digits) return null;

  if (digits.startsWith("0")) {
    digits = "92" + digits.slice(1);
  } else if (!digits.startsWith("92")) {
    digits = "92" + digits;
  }

  return `https://wa.me/${digits}`;
}
