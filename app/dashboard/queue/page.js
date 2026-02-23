"use client";

import { useState, useEffect } from "react";
import { buildApiUrl } from "@/lib/api";
import { useAuth } from "@/components/AuthGuard";
import { getAppointmentToken } from "@/lib/clinicStore";

const STATUS_WAITING = "PENDING";
const STATUS_CALLED = "CONFIRMED";
const STATUS_WITH_DOCTOR = "CONFIRMED";
const STATUS_COMPLETED = "COMPLETED";

export default function QueuePage() {
  const { token } = useAuth();
  const [appointments, setAppointments] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!token) return;
    fetch(buildApiUrl("/api/appointments"), { headers: { Authorization: `Bearer ${token}` } })
      .then((r) => r.json())
      .then((data) => {
        const list = Array.isArray(data) ? data : data?.appointments || [];
        setAppointments(list);
      })
      .catch(() => setAppointments([]))
      .finally(() => setLoading(false));
  }, [token]);

  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);
  const todayEnd = new Date(todayStart);
  todayEnd.setDate(todayEnd.getDate() + 1);
  const today = appointments.filter((a) => {
    const d = new Date(a.scheduledAt);
    return d >= todayStart && d < todayEnd && a.status !== "CANCELLED";
  }).sort((a, b) => new Date(a.scheduledAt) - new Date(b.scheduledAt));

  const waiting = today.filter((a) => a.status === "PENDING");
  const inConsultation = today.filter((a) => a.status === "CONFIRMED");
  const completed = today.filter((a) => a.status === "COMPLETED");

  const updateStatus = async (appointmentId, status) => {
    try {
      const res = await fetch(buildApiUrl(`/api/appointments/${appointmentId}/status`), {
        method: "PATCH",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ status }),
      });
      if (!res.ok) throw new Error("Failed");
      setAppointments((prev) => prev.map((a) => (a._id === appointmentId ? { ...a, status } : a)));
    } catch (err) {
      alert(err.message);
    }
  };

  return (
    <div>
      <h1 className="page-title mb-2">Queue Management</h1>
      <p className="page-desc mb-6">Today&apos;s queue: Waiting → Called → With Doctor → Completed.</p>

      {loading ? (
        <div className="card p-10 text-center text-gray-500">Loading…</div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="card p-4 border-blue-200 bg-blue-50/30">
            <h3 className="font-semibold text-blue-900 mb-3 flex items-center gap-2">
              <span className="w-3 h-3 rounded-full bg-amber-500" /> Waiting ({waiting.length})
            </h3>
            <ul className="space-y-2">
              {waiting.map((a) => (
                <li key={a._id} className="flex items-center justify-between bg-white rounded-lg p-3 border border-blue-100">
                  <span className="font-mono font-semibold text-blue-900">#{getAppointmentToken(a._id) ?? "—"}</span>
                  <span className="text-gray-700 truncate ml-2">{a.patientName}</span>
                  <button type="button" onClick={() => updateStatus(a._id, "CONFIRMED")} className="btn-primary text-xs py-1 px-2 shrink-0">
                    Call
                  </button>
                </li>
              ))}
              {waiting.length === 0 && <p className="text-sm text-gray-500">No one waiting</p>}
            </ul>
          </div>
          <div className="card p-4 border-blue-200 bg-blue-50/30">
            <h3 className="font-semibold text-blue-900 mb-3 flex items-center gap-2">
              <span className="w-3 h-3 rounded-full bg-blue-500 animate-pulse" /> In Consultation ({inConsultation.length})
            </h3>
            <ul className="space-y-2">
              {inConsultation.map((a) => (
                <li key={a._id} className="flex items-center justify-between bg-white rounded-lg p-3 border border-blue-100">
                  <span className="font-mono font-semibold text-blue-900">#{getAppointmentToken(a._id) ?? "—"}</span>
                  <span className="text-gray-700 truncate ml-2">{a.patientName}</span>
                  <button type="button" onClick={() => updateStatus(a._id, "COMPLETED")} className="btn-secondary text-xs py-1 px-2 shrink-0">
                    Done
                  </button>
                </li>
              ))}
              {inConsultation.length === 0 && <p className="text-sm text-gray-500">None</p>}
            </ul>
          </div>
          <div className="card p-4 border-green-200 bg-green-50/30">
            <h3 className="font-semibold text-green-900 mb-3 flex items-center gap-2">
              <span className="w-3 h-3 rounded-full bg-green-500" /> Completed ({completed.length})
            </h3>
            <ul className="space-y-2">
              {completed.map((a) => (
                <li key={a._id} className="flex items-center justify-between bg-white rounded-lg p-3 border border-green-100">
                  <span className="font-mono font-semibold text-green-800">#{getAppointmentToken(a._id) ?? "—"}</span>
                  <span className="text-gray-600 truncate ml-2">{a.patientName}</span>
                </li>
              ))}
              {completed.length === 0 && <p className="text-sm text-gray-500">None yet</p>}
            </ul>
          </div>
        </div>
      )}
    </div>
  );
}
