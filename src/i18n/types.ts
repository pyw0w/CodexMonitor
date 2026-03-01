export type SupportedLocale = "en" | "ru";

export type UiLanguagePreference = "system" | SupportedLocale;

export type TranslationParamValue = string | number | boolean | Date | null | undefined;

export type TranslationParams = Record<string, TranslationParamValue>;

export type TranslationDictionary = Record<string, string>;
