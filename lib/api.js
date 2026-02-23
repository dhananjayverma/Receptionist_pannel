/**
 * API base URL and URL builder – aligned with admin/backend.
 * Set NEXT_PUBLIC_API_BASE in .env.local (no trailing slash).
 */
function getApiBase() {
  const apiBase = process.env.NEXT_PUBLIC_API_BASE;
  if (!apiBase) {
    if (typeof window !== "undefined") {
      console.warn("NEXT_PUBLIC_API_BASE is not set. Using fallback.");
    }
    return "http://localhost:4000"; // typical backend port
  }
  let cleaned = apiBase.trim().replace(/[;/\\s]+$/, "");
  return cleaned;
}

export function buildApiUrl(path) {
  const base = getApiBase();
  const cleanPath = path.startsWith("/") ? path : `/${path}`;
  return `${base}${cleanPath}`.replace(/([^:]\/)\/+/g, "$1");
}

export const API_BASE = typeof window !== "undefined" ? getApiBase() : "";
