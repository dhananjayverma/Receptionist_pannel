/**
 * Simple clinic settings & token counter (localStorage).
 * Token resets daily. Consultation fee stored for billing default.
 */
const KEY_SETTINGS = "recption_clinic_settings";
const KEY_TOKEN_DATE = "recption_token_date";
const KEY_TOKEN_COUNT = "recption_token_count";
const KEY_PATIENT_PROFILES = "recption_patient_profiles";

export function getSettings() {
  if (typeof window === "undefined") return { consultationFee: 200, currency: "INR" };
  try {
    const s = localStorage.getItem(KEY_SETTINGS);
    return s ? { ...JSON.parse(s), consultationFee: Number(JSON.parse(s).consultationFee) || 200, currency: "INR" } : { consultationFee: 200, currency: "INR" };
  } catch {
    return { consultationFee: 200, currency: "INR" };
  }
}

export function saveSettings(settings) {
  if (typeof window === "undefined") return;
  localStorage.setItem(KEY_SETTINGS, JSON.stringify(settings));
}

function getTodayKey() {
  const d = new Date();
  return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
}

export function getNextTokenNumber() {
  if (typeof window === "undefined") return 1;
  const today = getTodayKey();
  const storedDate = localStorage.getItem(KEY_TOKEN_DATE);
  const count = storedDate === today ? parseInt(localStorage.getItem(KEY_TOKEN_COUNT) || "0", 10) : 0;
  const next = count + 1;
  localStorage.setItem(KEY_TOKEN_DATE, today);
  localStorage.setItem(KEY_TOKEN_COUNT, String(next));
  return next;
}

export function resetTokenDaily() {
  if (typeof window === "undefined") return;
  localStorage.removeItem(KEY_TOKEN_DATE);
  localStorage.removeItem(KEY_TOKEN_COUNT);
}

export function getPatientProfiles() {
  if (typeof window === "undefined") return {};
  try {
    const s = localStorage.getItem(KEY_PATIENT_PROFILES);
    return s ? JSON.parse(s) : {};
  } catch {
    return {};
  }
}

export function savePatientProfile(patientId, profile) {
  if (typeof window === "undefined") return;
  const all = getPatientProfiles();
  all[patientId] = { ...all[patientId], ...profile, updatedAt: new Date().toISOString() };
  localStorage.setItem(KEY_PATIENT_PROFILES, JSON.stringify(all));
}

export function getPatientProfile(patientId) {
  return getPatientProfiles()[patientId] || null;
}

const KEY_APPT_TOKENS = "recption_appointment_tokens";

export function setAppointmentToken(appointmentId, tokenNum) {
  if (typeof window === "undefined") return;
  const map = getAppointmentTokens();
  map[appointmentId] = tokenNum;
  localStorage.setItem(KEY_APPT_TOKENS, JSON.stringify(map));
}

export function getAppointmentTokens() {
  if (typeof window === "undefined") return {};
  try {
    const s = localStorage.getItem(KEY_APPT_TOKENS);
    return s ? JSON.parse(s) : {};
  } catch {
    return {};
  }
}

export function getAppointmentToken(appointmentId) {
  return getAppointmentTokens()[appointmentId] ?? null;
}
