"use client";

import { useState, useEffect } from "react";
import { buildApiUrl } from "@/lib/api";
import { useAuth } from "@/components/AuthGuard";

const TAB_PRESCRIPTION = "prescription";
const TAB_LAB_REPORT = "lab_report";

export default function UploadPage() {
  const { token } = useAuth();
  const [tab, setTab] = useState(TAB_PRESCRIPTION);
  const [file, setFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [appointments, setAppointments] = useState([]);
  const [selectedAppointmentId, setSelectedAppointmentId] = useState("");
  const [loadingAppointments, setLoadingAppointments] = useState(false);

  useEffect(() => {
    if (tab !== TAB_LAB_REPORT || !token) return;
    setLoadingAppointments(true);
    fetch(buildApiUrl("/api/appointments"), {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((r) => r.json())
      .then((data) => {
        if (Array.isArray(data)) setAppointments(data);
        else if (data.appointments) setAppointments(data.appointments);
        else setAppointments([]);
      })
      .catch(() => setAppointments([]))
      .finally(() => setLoadingAppointments(false));
  }, [tab, token]);

  const submitPrescription = async (e) => {
    e.preventDefault();
    if (!file) return setResult({ success: false, message: "Select a file" });
    setLoading(true);
    setResult(null);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const res = await fetch(buildApiUrl("/api/public/upload/prescription"), { method: "POST", body: fd });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Upload failed");
      setResult({ success: true, data });
      setFile(null);
    } catch (err) {
      setResult({ success: false, message: err.message });
    } finally {
      setLoading(false);
    }
  };

  const submitLabReport = async (e) => {
    e.preventDefault();
    if (!selectedAppointmentId || !file) {
      return setResult({ success: false, message: "Select an appointment and a file" });
    }
    setLoading(true);
    setResult(null);
    try {
      const fd = new FormData();
      fd.append("report", file);
      const res = await fetch(buildApiUrl(`/api/appointments/${selectedAppointmentId}/upload-report`), {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        body: fd,
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Upload failed");
      setResult({ success: true, data });
      setFile(null);
      setSelectedAppointmentId("");
    } catch (err) {
      setResult({ success: false, message: err.message });
    } finally {
      setLoading(false);
    }
  };

  const submit = tab === TAB_PRESCRIPTION ? submitPrescription : submitLabReport;

  return (
    <div className="max-w-2xl">
      <h1 className="page-title mb-2">Upload Documents</h1>
      <p className="page-desc-light mb-6">Upload scanned prescription or lab report (lab report is attached to an appointment).</p>

      <div className="flex gap-2 mb-6">
        <button
          type="button"
          onClick={() => { setTab(TAB_PRESCRIPTION); setResult(null); }}
          className={`px-4 py-2.5 rounded-xl font-medium text-sm transition-all ${
            tab === TAB_PRESCRIPTION
              ? "bg-blue-600 text-white shadow"
              : "bg-white text-gray-700 border border-gray-300 hover:bg-gray-50"
          }`}
        >
          Prescription
        </button>
        <button
          type="button"
          onClick={() => { setTab(TAB_LAB_REPORT); setResult(null); }}
          className={`px-4 py-2.5 rounded-xl font-medium text-sm transition-all ${
            tab === TAB_LAB_REPORT
              ? "bg-blue-600 text-white shadow"
              : "bg-white text-gray-700 border border-gray-300 hover:bg-gray-50"
          }`}
        >
          Lab Report
        </button>
      </div>

      <div className="card p-6">
        <form onSubmit={submit} className="space-y-4">
          {tab === TAB_LAB_REPORT && (
            <div>
              <label className="label">Appointment</label>
              <select
                value={selectedAppointmentId}
                onChange={(e) => setSelectedAppointmentId(e.target.value)}
                required={tab === TAB_LAB_REPORT}
                className="input"
              >
                <option value="">Select appointment</option>
                {loadingAppointments && <option disabled>Loading…</option>}
                {appointments.map((apt) => (
                  <option key={apt._id} value={apt._id}>
                    {apt.patientName} – {new Date(apt.scheduledAt).toLocaleString()} ({apt.issue?.slice(0, 30)}…)
                  </option>
                ))}
              </select>
            </div>
          )}
          <div>
            <label className="label">File (image or PDF)</label>
            <input
              type="file"
              accept="image/*,.pdf"
              onChange={(e) => setFile(e.target.files?.[0] ?? null)}
              className="w-full text-sm text-gray-700 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border file:border-gray-300 file:bg-white file:text-gray-700"
            />
          </div>
          <button type="submit" disabled={loading} className="btn-primary">
            {loading ? "Uploading…" : "Upload"}
          </button>
        </form>

        {result && (
          <div className={`mt-6 p-4 rounded-lg border ${
            result.success
              ? "bg-blue-50 border-blue-200 text-blue-800"
              : "bg-red-50 border-red-200 text-red-700"
          }`}>
            {result.success ? (
              <div>
                <p className="font-medium">Upload successful</p>
                {(result.data?.url || result.data?.fileUrl) && (
                  <a
                    href={result.data.url || buildApiUrl(result.data.fileUrl)}
                    target="_blank"
                    rel="noreferrer"
                    className="text-sm text-blue-600 hover:text-blue-800 underline mt-1 inline-block"
                  >
                    Open file
                  </a>
                )}
              </div>
            ) : (
              <p>{result.message}</p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
