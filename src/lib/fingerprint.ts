export function getDeviceFingerprint(): string {
  if (typeof window === "undefined") return "server_rendering";

  try {
    const nav = window.navigator;
    const screen = window.screen;
    
    const components = [
      nav.userAgent,
      nav.language,
      screen.colorDepth,
      `${screen.width}x${screen.height}`,
      new Date().getTimezoneOffset(),
      nav.hardwareConcurrency || "unknown",
      nav.deviceMemory || "unknown"
    ];

    // Simple fast hash
    let hash = 0;
    const str = components.join("||");
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash |= 0; // Convert to 32bit integer
    }

    return `fp_${Math.abs(hash).toString(36)}`;
  } catch (e) {
    return `fp_default_${Date.now()}`;
  }
}
