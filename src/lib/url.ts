/** Beam's own address, e.g. https://<user>.github.io/beam/ (shared-text and Receive pages live here). */
export function appBaseUrl(): string {
  return new URL(import.meta.env.BASE_URL, window.location.origin).href
}
