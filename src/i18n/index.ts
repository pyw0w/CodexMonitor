import { IntlMessageFormat } from "intl-messageformat";
import { en } from "./locales/en";
import { ru } from "./locales/ru";
import type {
  SupportedLocale,
  TranslationDictionary,
  TranslationParams,
  UiLanguagePreference,
} from "./types";

export const DEFAULT_LOCALE: SupportedLocale = "en";

export const dictionaries: Record<SupportedLocale, TranslationDictionary> = {
  en,
  "ru": ru,
};

const formatterCache = new Map<string, IntlMessageFormat>();

function getFormatter(template: string, locale: SupportedLocale): IntlMessageFormat {
  const cacheKey = `${locale}\u0000${template}`;
  const existing = formatterCache.get(cacheKey);
  if (existing) {
    return existing;
  }
  const formatter = new IntlMessageFormat(template, locale);
  formatterCache.set(cacheKey, formatter);
  return formatter;
}

function legacyFormatTranslation(
  template: string,
  params?: TranslationParams,
): string {
  if (!params) {
    return template;
  }
  return template.replace(/\{(\w+)\}/g, (_, key: string) => {
    const value = params[key];
    return value === null || value === undefined ? "" : String(value);
  });
}

export function hasTranslationKey(
  key: string,
  locale: SupportedLocale = DEFAULT_LOCALE,
): boolean {
  return dictionaries[locale][key] !== undefined || dictionaries.en[key] !== undefined;
}

export function resolveEffectiveLocale(
  languagePreference: UiLanguagePreference | string | null | undefined,
): SupportedLocale {
  if (languagePreference === "en" || languagePreference === "ru") {
    return languagePreference;
  }
  if (typeof navigator === "undefined") {
    return DEFAULT_LOCALE;
  }
  const normalized = String(navigator.language ?? "").toLowerCase();
  if (normalized.startsWith("ru")) {
    return "ru";
  }
  return DEFAULT_LOCALE;
}

export function formatTranslation(
  template: string,
  locale: SupportedLocale = DEFAULT_LOCALE,
  params?: TranslationParams,
): string {
  try {
    const formatter = getFormatter(template, locale);
    const formatted = formatter.format((params ?? {}) as Record<string, unknown>);
    if (Array.isArray(formatted)) {
      return formatted.map((part) => String(part)).join("");
    }
    return String(formatted);
  } catch (error) {
    if (import.meta.env.DEV && import.meta.env.MODE !== "test") {
      console.warn("[i18n] ICU format failed, using legacy fallback.", {
        error,
        locale,
        template,
      });
    }
    return legacyFormatTranslation(template, params);
  }
}
