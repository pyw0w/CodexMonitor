import type { DebugEntry } from "../types";

type DebugLogger = (entry: DebugEntry) => void;

type SoundLabel = "success" | "error" | "test";

type AudioContextConstructor = new () => AudioContext;

function resolveAudioContextConstructor(): AudioContextConstructor | null {
  if (typeof window === "undefined") {
    return null;
  }

  return (window.AudioContext ??
    (
      window as typeof window & {
        webkitAudioContext?: AudioContextConstructor;
      }
    ).webkitAudioContext ??
    null);
}

function createAudioContext(): AudioContext {
  const AudioContextImpl = resolveAudioContextConstructor();
  if (!AudioContextImpl) {
    throw new Error("Web Audio API is not available in this environment");
  }

  return new AudioContextImpl();
}

function isTauriLinuxRuntime(): boolean {
  if (typeof window === "undefined" || typeof navigator === "undefined") {
    return false;
  }

  const hasTauriBridge = Boolean(
    (window as unknown as { __TAURI__?: unknown }).__TAURI__ ||
      (window as unknown as { __TAURI_INTERNALS__?: unknown }).__TAURI_INTERNALS__,
  );
  return hasTauriBridge && /linux/i.test(navigator.userAgent);
}

function clearMediaSessionState() {
  if (typeof navigator === "undefined" || !("mediaSession" in navigator)) {
    return;
  }

  const mediaSessionNavigator = navigator as Navigator & {
    mediaSession?: {
      metadata: unknown;
      playbackState: "none" | "paused" | "playing";
      setActionHandler: (
        action: MediaSessionAction,
        handler: MediaSessionActionHandler | null,
      ) => void;
    };
  };
  if (!mediaSessionNavigator.mediaSession) {
    return;
  }

  try {
    mediaSessionNavigator.mediaSession.metadata = null;
    mediaSessionNavigator.mediaSession.playbackState = "none";
    mediaSessionNavigator.mediaSession.setActionHandler("play", null);
    mediaSessionNavigator.mediaSession.setActionHandler("pause", null);
    mediaSessionNavigator.mediaSession.setActionHandler("previoustrack", null);
    mediaSessionNavigator.mediaSession.setActionHandler("nexttrack", null);
    mediaSessionNavigator.mediaSession.setActionHandler("stop", null);
  } catch {
    // No-op: media session APIs vary by WebView platform.
  }
}

export function playNotificationSound(
  url: string,
  label: SoundLabel,
  onDebug?: DebugLogger,
) {
  try {
    const ctx = createAudioContext();

    if (ctx.state === "suspended") {
      void ctx.resume();
    }

    const closeContext = () => {
      clearMediaSessionState();
      void ctx.close();
    };

    if (isTauriLinuxRuntime()) {
      // Keep Linux feedback simple and short to avoid sticky media-player cards.
      const oscillator = ctx.createOscillator();
      const gainNode = ctx.createGain();
      oscillator.type = "sine";
      oscillator.frequency.value = label === "error" ? 360 : 660;
      gainNode.gain.value = 0.03;
      oscillator.connect(gainNode);
      gainNode.connect(ctx.destination);
      oscillator.onended = closeContext;
      oscillator.start();
      oscillator.stop(ctx.currentTime + 0.12);
      return;
    }

    void fetch(url)
      .then((response) => response.arrayBuffer())
      .then((audioFileBuffer) => ctx.decodeAudioData(audioFileBuffer))
      .then((audioBuffer) => {
        const source = ctx.createBufferSource();
        const gainNode = ctx.createGain();

        gainNode.gain.value = 0.05;
        source.buffer = audioBuffer;
        source.connect(gainNode);
        gainNode.connect(ctx.destination);
        source.onended = closeContext;
        source.start();
      })
      .catch((error) => {
        closeContext();
        onDebug?.({
          id: `${Date.now()}-audio-${label}-load-or-play-error`,
          timestamp: Date.now(),
          source: "error",
          label: `audio/${label} load/play error`,
          payload: error instanceof Error ? error.message : String(error),
        });
      });
  } catch (error) {
    onDebug?.({
      id: `${Date.now()}-audio-${label}-init-error`,
      timestamp: Date.now(),
      source: "error",
      label: `audio/${label} init error`,
      payload: error instanceof Error ? error.message : String(error),
    });
  }
}
