// @vitest-environment jsdom

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

type MockAudioContextState = "running" | "suspended" | "closed";

describe("playNotificationSound", () => {
  const originalAudioContext = window.AudioContext;
  const originalWebkitAudioContext = (
    window as typeof window & { webkitAudioContext?: typeof AudioContext }
  ).webkitAudioContext;
  const originalFetch = globalThis.fetch;
  const originalWindowDescriptor = Object.getOwnPropertyDescriptor(
    globalThis,
    "window",
  );
  const originalNavigatorDescriptor = Object.getOwnPropertyDescriptor(
    globalThis,
    "navigator",
  );

  beforeEach(() => {
    vi.resetModules();
  });

  afterEach(() => {
    window.AudioContext = originalAudioContext;
    (
      window as typeof window & { webkitAudioContext?: typeof AudioContext }
    ).webkitAudioContext = originalWebkitAudioContext;
    globalThis.fetch = originalFetch;
    if (originalWindowDescriptor) {
      Object.defineProperty(globalThis, "window", originalWindowDescriptor);
    }
    if (originalNavigatorDescriptor) {
      Object.defineProperty(globalThis, "navigator", originalNavigatorDescriptor);
    }
    vi.restoreAllMocks();
  });

  function installAudioMocks(state: MockAudioContextState = "running") {
    const oscillator = {
      type: "sine" as OscillatorType,
      frequency: { value: 0 },
      connect: vi.fn(),
      start: vi.fn(),
      stop: vi.fn(),
      onended: null as (() => void) | null,
    };
    const source = {
      buffer: null as AudioBuffer | null,
      connect: vi.fn(),
      start: vi.fn(),
      onended: null as (() => void) | null,
    };
    const gainNode = {
      gain: { value: 0 },
      connect: vi.fn(),
    };
    const decodeAudioData = vi.fn().mockResolvedValue({} as AudioBuffer);
    const resume = vi.fn().mockResolvedValue(undefined);
    const close = vi.fn().mockResolvedValue(undefined);

    class MockAudioContext {
      state = state;
      destination = {} as AudioNode;
      decodeAudioData = decodeAudioData;
      createBufferSource = vi.fn(() => source);
      createOscillator = vi.fn(() => oscillator);
      createGain = vi.fn(() => gainNode);
      resume = resume;
      close = close;
      currentTime = 0;
    }

    window.AudioContext = MockAudioContext as unknown as typeof AudioContext;

    return { close, decodeAudioData, gainNode, oscillator, source, resume };
  }

  it("plays notification audio via Web Audio API", async () => {
    const { decodeAudioData, gainNode, source } = installAudioMocks("running");
    const arrayBuffer = new ArrayBuffer(8);
    globalThis.fetch = vi.fn().mockResolvedValue({
      arrayBuffer: vi.fn().mockResolvedValue(arrayBuffer),
    } as unknown as Response);

    const { playNotificationSound } = await import("./notificationSounds");

    playNotificationSound("https://example.com/success.mp3", "success");
    await vi.waitFor(() => {
      expect(source.start).toHaveBeenCalledTimes(1);
    });

    expect(globalThis.fetch).toHaveBeenCalledWith("https://example.com/success.mp3");
    expect(decodeAudioData).toHaveBeenCalledWith(arrayBuffer);
    expect(gainNode.gain.value).toBe(0.05);
  });

  it("logs debug information when fetch fails", async () => {
    installAudioMocks("running");
    const onDebug = vi.fn();
    globalThis.fetch = vi.fn().mockRejectedValue(new Error("network"));
    const { playNotificationSound } = await import("./notificationSounds");

    playNotificationSound("https://example.com/fail.mp3", "error", onDebug);

    await vi.waitFor(() => {
      expect(onDebug).toHaveBeenCalledWith(
        expect.objectContaining({
          label: "audio/error load/play error",
          payload: "network",
        }),
      );
    });
  });

  it("attempts to resume suspended contexts before playback", async () => {
    const { resume, source } = installAudioMocks("suspended");
    globalThis.fetch = vi.fn().mockResolvedValue({
      arrayBuffer: vi.fn().mockResolvedValue(new ArrayBuffer(4)),
    } as unknown as Response);
    const { playNotificationSound } = await import("./notificationSounds");

    playNotificationSound("https://example.com/test.mp3", "test");

    await vi.waitFor(() => {
      expect(source.start).toHaveBeenCalledTimes(1);
    });
    expect(resume).toHaveBeenCalledTimes(1);
  });

  it("closes the audio context after playback ends", async () => {
    const { close, source } = installAudioMocks("running");
    globalThis.fetch = vi.fn().mockResolvedValue({
      arrayBuffer: vi.fn().mockResolvedValue(new ArrayBuffer(4)),
    } as unknown as Response);
    const { playNotificationSound } = await import("./notificationSounds");

    playNotificationSound("https://example.com/test.mp3", "test");

    await vi.waitFor(() => {
      expect(source.start).toHaveBeenCalledTimes(1);
      expect(source.onended).toBeTypeOf("function");
    });

    source.onended?.();

    await vi.waitFor(() => {
      expect(close).toHaveBeenCalledTimes(1);
    });
  });

  it("uses a short Linux tone in Tauri runtime without media file fetch", async () => {
    const { close, oscillator } = installAudioMocks("running");
    const fetchSpy = vi.fn();
    globalThis.fetch = fetchSpy;
    Object.defineProperty(window, "__TAURI__", {
      configurable: true,
      writable: true,
      value: {},
    });
    Object.defineProperty(globalThis, "navigator", {
      configurable: true,
      value: { userAgent: "Mozilla/5.0 (X11; Linux x86_64)" },
    });
    const { playNotificationSound } = await import("./notificationSounds");

    playNotificationSound("https://example.com/test.mp3", "success");

    await vi.waitFor(() => {
      expect(oscillator.start).toHaveBeenCalledTimes(1);
      expect(oscillator.stop).toHaveBeenCalledTimes(1);
    });
    expect(fetchSpy).not.toHaveBeenCalled();

    oscillator.onended?.();
    await vi.waitFor(() => {
      expect(close).toHaveBeenCalledTimes(1);
    });
  });
});
