/** Keep only digits so wa.me links work from MX or international numbers. */
export function digitsOnly(phone: string) {
  return phone.replace(/\D+/g, "");
}

export function formatPhone(phone: string) {
  const digits = digitsOnly(phone);
  if (digits.length === 10) return `+52 ${digits.slice(0, 2)} ${digits.slice(2, 6)} ${digits.slice(6)}`;
  if (digits.length === 12 && digits.startsWith("52")) {
    return `+52 ${digits.slice(2, 4)} ${digits.slice(4, 8)} ${digits.slice(8)}`;
  }
  if (digits.length === 13 && digits.startsWith("521")) {
    return `+52 ${digits.slice(3, 5)} ${digits.slice(5, 9)} ${digits.slice(9)}`;
  }
  return phone.trim();
}

export function whatsappDigits(phone: string) {
  let digits = digitsOnly(phone);
  if (digits.length === 10) digits = `52${digits}`;
  if (digits.length === 13 && digits.startsWith("521")) digits = `52${digits.slice(3)}`;
  return digits;
}
