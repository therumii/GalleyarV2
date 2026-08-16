// Centralized Haptic Feedback Service for GalleyAR

const STORAGE_KEY = "galleyar_haptics_enabled";

class HapticsService {
  private enabled: boolean;

  constructor() {
    this.enabled = this.loadPreference();
  }

  private loadPreference(): boolean {
    if (typeof window === "undefined") return true;
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      return stored !== null ? stored === "true" : true;
    } catch {
      return true;
    }
  }

  public isEnabled(): boolean {
    return this.enabled;
  }

  public setEnabled(enabled: boolean): void {
    this.enabled = enabled;
    if (typeof window !== "undefined") {
      try {
        localStorage.setItem(STORAGE_KEY, String(enabled));
      } catch {}
    }
  }

  private vibrate(pattern: number | number[]): void {
    if (!this.enabled) return;
    if (typeof window === "undefined" || typeof navigator === "undefined") return;
    if (!("vibrate" in navigator) || typeof navigator.vibrate !== "function") return;

    try {
      navigator.vibrate(pattern);
    } catch {
      // Gracefully ignore devices or permissions policy blocks
    }
  }

  /** Very short subtle tap (e.g. item tap, selection change, toggle) */
  public selection(): void {
    this.vibrate(6);
  }

  /** Subtle light feedback (e.g. swipe threshold, button tap) */
  public light(): void {
    this.vibrate(10);
  }

  /** Medium feedback (e.g. active mode switch) */
  public medium(): void {
    this.vibrate(18);
  }

  /** Heavy feedback (e.g. major action) */
  public heavy(): void {
    this.vibrate(30);
  }

  /** Impact feedback helper */
  public impact(style: "light" | "medium" | "heavy" = "medium"): void {
    if (style === "light") this.light();
    else if (style === "heavy") this.heavy();
    else this.medium();
  }

  /** Success confirmation pattern (e.g. save complete, unlock vault, export success) */
  public success(): void {
    this.vibrate([10, 35, 15]);
  }

  /** Notification feedback helper */
  public notification(type: "success" | "warning" | "error" = "success"): void {
    if (type === "warning") this.warning();
    else if (type === "error") this.error();
    else this.success();
  }

  /** Warning pattern (e.g. edge boundary hit, delete confirmation) */
  public warning(): void {
    this.vibrate([20, 35, 20]);
  }

  /** Error pattern (e.g. wrong PIN, export error) */
  public error(): void {
    this.vibrate([30, 45, 30]);
  }
}

export const haptics = new HapticsService();
