"use client";

import { useMemo, useState } from "react";
import { ChevronDown } from "lucide-react";
import {
  AsYouType,
  getCountries,
  getCountryCallingCode,
  isValidPhoneNumber,
  parsePhoneNumberFromString,
  validatePhoneNumberLength,
  type CountryCode,
} from "libphonenumber-js";
import { DEFAULT_COUNTRY, countryOf, flagEmoji } from "@/lib/phone";

/** Every country, by name, with its calling code — built once. */
function useCountries() {
  return useMemo(() => {
    let names: Intl.DisplayNames | null = null;
    try {
      names = new Intl.DisplayNames(["en"], { type: "region" });
    } catch {
      /* very old browser: fall back to codes */
    }
    return getCountries()
      .map((code) => ({ code, name: names?.of(code) ?? code, dial: getCountryCallingCode(code) }))
      .sort((a, b) => a.name.localeCompare(b.name));
  }, []);
}

/** Split a stored value into country + national digits (bare numbers read as India). */
function split(value: string): { country: CountryCode; national: string } {
  const p = value ? parsePhoneNumberFromString(value, DEFAULT_COUNTRY) : undefined;
  if (p) return { country: countryOf(p) ?? DEFAULT_COUNTRY, national: p.nationalNumber };
  return { country: DEFAULT_COUNTRY, national: value.replace(/\D/g, "") };
}

const tooLong = (digits: string, c: CountryCode) =>
  validatePhoneNumberLength(digits, c) === "TOO_LONG";

/**
 * National digits that fit the country: a leading trunk 0 or a typed-in
 * country code ("91 98765 43210" with India picked) is dropped, then extra
 * digits are refused — an Indian number stops at 10.
 */
function fit(raw: string, c: CountryCode): string {
  let digits = raw.replace(/\D/g, "").replace(/^0+/, "");
  const dial = getCountryCallingCode(c);
  const valid = (d: string) => isValidPhoneNumber(`+${dial}${d}`);
  if (digits.startsWith(dial) && !valid(digits) && valid(digits.slice(dial.length))) {
    digits = digits.slice(dial.length);
  }
  while (digits && tooLong(digits, c)) digits = digits.slice(0, -1);
  // Length rules alone are loose (Indian toll-free numbers run to 13
  // digits), so also stop where a complete, valid number would turn
  // invalid with one more digit: 98765 43210 takes no 11th digit.
  let out = "";
  for (const ch of digits) {
    if (out && valid(out) && !valid(out + ch)) break;
    out += ch;
  }
  return out;
}

/**
 * Phone number with a country picker: flag + calling code, then the number.
 * The value it reports is international (E.164), e.g. "+919876543210", or ""
 * when empty. Pasting a full "+44 …" number switches the country.
 */
export default function PhoneInput({
  id,
  value,
  onChange,
  onBlur,
  invalid,
  describedBy,
  className = "",
  placeholder,
}: {
  id: string;
  value: string;
  onChange: (value: string) => void;
  onBlur?: () => void;
  invalid?: boolean;
  describedBy?: string;
  className?: string;
  placeholder?: string;
}) {
  const countries = useCountries();
  const [{ country, national }, setState] = useState(() => split(value ?? ""));

  const emit = (c: CountryCode, digits: string) => {
    setState({ country: c, national: digits });
    onChange(digits ? `+${getCountryCallingCode(c)}${digits}` : "");
  };

  const onNumber = (raw: string) => {
    // A pasted international number picks its own country.
    if (raw.trim().startsWith("+")) {
      const p = parsePhoneNumberFromString(raw);
      // Shared codes (+1, +44, +7…) may not pin a country until the number
      // is complete: fall back to the first country with that code.
      const c =
        (p && countryOf(p)) ??
        (p && getCountries().find((code) => getCountryCallingCode(code) === p.countryCallingCode));
      if (p && c) return emit(c, fit(p.nationalNumber, c));
    }
    emit(country, fit(raw, country));
  };

  const shown = national ? new AsYouType(country).input(national) : "";
  const dial = getCountryCallingCode(country);

  return (
    <div
      className={`flex items-stretch h-11 w-full rounded-md overflow-hidden border bg-bg-page transition focus-within:border-primary focus-within:ring-2 focus-within:ring-primary/30 ${invalid ? "border-danger" : "border-border"} ${className}`}
      aria-invalid={invalid || undefined}
    >
      {/* The native select sits invisibly over a compact flag + code label,
          so it stays accessible and opens the platform picker on phones. */}
      <div className="relative flex items-center gap-1.5 pl-3 pr-2 border-r border-border bg-bg-subtle shrink-0">
        <span aria-hidden className="text-lg leading-none">{flagEmoji(country)}</span>
        <span aria-hidden className="text-sm font-medium text-text-primary tabular-nums">+{dial}</span>
        <ChevronDown size={14} aria-hidden className="text-text-secondary" />
        <select
          aria-label="Country code"
          value={country}
          onChange={(e) => {
            const c = e.target.value as CountryCode;
            emit(c, fit(national, c));
          }}
          onBlur={onBlur}
          className="absolute inset-0 opacity-0 cursor-pointer"
        >
          {countries.map((c) => (
            <option key={c.code} value={c.code}>
              {flagEmoji(c.code)} {c.name} (+{c.dial})
            </option>
          ))}
        </select>
      </div>
      <input
        id={id}
        type="tel"
        inputMode="tel"
        autoComplete="off"
        value={shown}
        onChange={(e) => onNumber(e.target.value)}
        onBlur={onBlur}
        aria-invalid={invalid || undefined}
        aria-describedby={describedBy}
        placeholder={placeholder ?? (country === "IN" ? "98765 43210" : "Phone number")}
        className="flex-1 min-w-0 px-3 bg-transparent outline-none text-sm text-text-primary placeholder:text-text-disabled"
      />
    </div>
  );
}
