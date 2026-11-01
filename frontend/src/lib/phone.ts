import { parsePhoneNumberFromString, type CountryCode, type PhoneNumber } from "libphonenumber-js";

/** Patients are mostly in India; a bare 10-digit number is read as +91. */
export const DEFAULT_COUNTRY: CountryCode = "IN";

/** 🇮🇳 from "IN" (regional-indicator emoji; no image assets). */
export function flagEmoji(country: string): string {
  return country
    .toUpperCase()
    .replace(/./g, (c) => String.fromCodePoint(127397 + c.charCodeAt(0)));
}

/**
 * The country to show for a number. Ranges shared by several territories
 * (UK mobiles also valid in Guernsey/Jersey/Isle of Man under +44) resolve
 * to the main country first, so a UK number shows 🇬🇧, while a number only
 * one country uses (a Canadian area code under +1) still shows that one.
 */
export function countryOf(p: PhoneNumber): CountryCode | undefined {
  return p.getPossibleCountries()[0] ?? p.country;
}

/**
 * A stored phone number for display: "🇮🇳 +91 98765 43210". Older records
 * hold bare Indian numbers ("9876543210"); those read as +91. Anything that
 * can't be parsed is shown as stored.
 */
export function formatPhone(value?: string | null): string {
  if (!value) return "";
  const p = parsePhoneNumberFromString(value, DEFAULT_COUNTRY);
  if (!p) return value;
  const country = countryOf(p);
  return country ? `${flagEmoji(country)} ${p.formatInternational()}` : p.formatInternational();
}
