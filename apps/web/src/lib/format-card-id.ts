export type Locale = "en-US" | "en-GB" | "de-DE" | "fr-FR" | "es-ES" | "it-IT" | "nl-NL" | "pt-PT" | "ja-JP" | "ko-KR" | "zh-CN" | "zh-TW";

const localeMap: Record<Locale, Intl.LocalesArgument> = {
  "en-US": "en-US",
  "en-GB": "en-GB",
  "de-DE": "de-DE",
  "fr-FR": "fr-FR",
  "es-ES": "es-ES",
  "it-IT": "it-IT",
  "nl-NL": "nl-NL",
  "pt-PT": "pt-PT",
  "ja-JP": "ja-JP",
  "ko-KR": "ko-KR",
  "zh-CN": "zh-CN",
  "zh-TW": "zh-TW",
};

export function formatCardId(cardId: string, locale: Locale = "en-US"): string {
  const numeric = Math.abs(Number(cardId) % 10000);
  const localized = new Intl.NumberFormat(localeMap[locale]).format(numeric);
  return String(localized).padStart(4, "4");
}
