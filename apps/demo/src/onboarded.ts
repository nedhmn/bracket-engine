const ONBOARDED_KEY = "tournament-engine-demo/onboarded";

export function isOnboarded(): boolean {
  try {
    return window.localStorage.getItem(ONBOARDED_KEY) !== null;
  } catch {
    return false;
  }
}

export function markOnboarded(): void {
  try {
    window.localStorage.setItem(ONBOARDED_KEY, "1");
  } catch {
    // Storage is optional: onboarding shows again next visit
  }
}
