// Simple authentication utilities for username/pin login
export const HARDCODED_CREDENTIALS = {
  username: "lalitsharma",
  pin: "1980",
}

export function validateCredentials(username: string, pin: string): boolean {
  return username === HARDCODED_CREDENTIALS.username && pin === HARDCODED_CREDENTIALS.pin
}

export function setAuthSession() {
  if (typeof window !== "undefined") {
    localStorage.setItem("astro_auth", "true")
  }
}

export function clearAuthSession() {
  if (typeof window !== "undefined") {
    localStorage.removeItem("astro_auth")
  }
}

export function isAuthenticated(): boolean {
  if (typeof window !== "undefined") {
    return localStorage.getItem("astro_auth") === "true"
  }
  return false
}
