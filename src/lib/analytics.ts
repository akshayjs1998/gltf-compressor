import posthog from "posthog-js";

const KEY = import.meta.env.VITE_POSTHOG_KEY;
const HOST = import.meta.env.VITE_POSTHOG_HOST ?? "https://us.i.posthog.com";
const PROD_HOST = "gltf-compressor.com";

let enabled = false;

export function initAnalytics() {
  if (!KEY) return;
  if (typeof window === "undefined") return;
  if (window.location.hostname !== PROD_HOST) return;

  posthog.init(KEY, {
    api_host: HOST,
    autocapture: false,
    capture_pageview: true,
    disable_session_recording: true,
    persistence: "memory",
  });
  enabled = true;
}

export function track(event: string, props?: Record<string, unknown>) {
  if (!enabled) return;
  posthog.capture(event, props);
}
