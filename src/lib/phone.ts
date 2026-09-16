/** 03001234567 → 923001234567 for wa.me links. */
export function whatsappNumber(phone: string): string {
  const digits = phone.replace(/\D/g, "");

  return digits.startsWith("0") ? `92${digits.slice(1)}` : digits;
}
