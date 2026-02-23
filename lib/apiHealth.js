import { buildApiUrl } from "./api";

export async function checkBackendHealth() {
  try {
    const res = await fetch(buildApiUrl("/api/health"), { method: "GET" });
    return res.ok;
  } catch (e) {
    return false;
  }
}
