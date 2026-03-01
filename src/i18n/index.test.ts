import { afterEach, describe, expect, it, vi } from "vitest";
import { en } from "./locales/en";
import { ru } from "./locales/ru";
import { hasTranslationKey, resolveEffectiveLocale } from "./index";

describe("i18n dictionaries", () => {
  it("keeps en and ru keys aligned", () => {
    const enKeys = Object.keys(en).sort();
    const ruKeys = Object.keys(ru).sort();
    expect(ruKeys).toEqual(enKeys);
  });
});

describe("resolveEffectiveLocale", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("uses explicit supported preference", () => {
    expect(resolveEffectiveLocale("en")).toBe("en");
    expect(resolveEffectiveLocale("ru")).toBe("ru");
  });

  it("maps system ru locales to ru", () => {
    vi.stubGlobal("navigator", { language: "ru-RU" });
    expect(resolveEffectiveLocale("system")).toBe("ru");
  });

  it("falls back to en for non-ru system locales", () => {
    vi.stubGlobal("navigator", { language: "fr-FR" });
    expect(resolveEffectiveLocale("system")).toBe("en");
  });
});

describe("hasTranslationKey", () => {
  it("returns true when key exists in locale dictionaries", () => {
    expect(hasTranslationKey("settings.nav.server", "en")).toBe(true);
    expect(hasTranslationKey("settings.nav.server", "ru")).toBe(true);
  });

  it("returns false for unknown keys", () => {
    expect(hasTranslationKey("settings.unknown.key", "en")).toBe(false);
    expect(hasTranslationKey("settings.unknown.key", "ru")).toBe(false);
  });
});
