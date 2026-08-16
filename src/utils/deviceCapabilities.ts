/**
 * Mobile Device & APK Environment Capabilities
 */

export interface DeviceInfo {
  isMobile: boolean;
  isAndroid: boolean;
  isIOS: boolean;
  isStandaloneApk: boolean;
  hasDirectoryPicker: boolean;
  hasNativeBridge: boolean;
}

export function detectDeviceInfo(): DeviceInfo {
  if (typeof window === "undefined" || typeof navigator === "undefined") {
    return {
      isMobile: false,
      isAndroid: false,
      isIOS: false,
      isStandaloneApk: false,
      hasDirectoryPicker: false,
      hasNativeBridge: false,
    };
  }

  const ua = navigator.userAgent || "";
  const isAndroid = /android/i.test(ua);
  const isIOS = /iphone|ipad|ipod/i.test(ua);
  const isMobile = isAndroid || isIOS || /mobile/i.test(ua) || window.innerWidth < 768;

  const isStandalone =
    window.matchMedia?.("(display-mode: standalone)").matches ||
    (navigator as any).standalone === true ||
    document.referrer.includes("android-app://");

  const hasNativeBridge = Boolean(
    (window as any).Capacitor ||
    (window as any).Android ||
    (window as any).androidBridge ||
    (window as any).cordova
  );

  const hasDirectoryPicker = typeof (window as any).showDirectoryPicker === "function";

  return {
    isMobile,
    isAndroid,
    isIOS,
    isStandaloneApk: isStandalone || hasNativeBridge,
    hasDirectoryPicker,
    hasNativeBridge,
  };
}
