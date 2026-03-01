import { afterEach, describe, expect, it, vi } from "vitest";
import { en } from "./locales/en";
import { ru } from "./locales/ru";
import { formatTranslation, hasTranslationKey, resolveEffectiveLocale } from "./index";

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

describe("formatTranslation", () => {
  it("supports ICU pluralization for Russian locale", () => {
    const template =
      "{count, plural, one {# файл} few {# файла} many {# файлов} other {# файла}}";

    expect(formatTranslation(template, "ru", { count: 1 })).toBe("1 файл");
    expect(formatTranslation(template, "ru", { count: 2 })).toBe("2 файла");
    expect(formatTranslation(template, "ru", { count: 5 })).toBe("5 файлов");
  });

  it("supports ICU select rules", () => {
    const template = "{mode, select, queue {Queue} steer {Steer} other {Default}}";
    expect(formatTranslation(template, "en", { mode: "queue" })).toBe("Queue");
    expect(formatTranslation(template, "en", { mode: "steer" })).toBe("Steer");
    expect(formatTranslation(template, "en", { mode: "unknown" })).toBe("Default");
  });

  it("falls back to legacy interpolation when ICU parsing fails", () => {
    expect(formatTranslation("Thread {id", "en", { id: 7 })).toBe("Thread {id");
  });
});
