"use client";

import { useState, useEffect, useMemo } from "react";
import { useSearchParams } from "next/navigation";
import { buildApiUrl } from "@/lib/api";
import { useAuth } from "@/components/AuthGuard";
import { getNextTokenNumber, setAppointmentToken, getAppointmentToken } from "@/lib/clinicStore";

const FILTER_ALL = "all";
const FILTER_TODAY = "today";

function StatusBadge({ status }) {
  const s = (status || "").toUpperCase();
  const styles = {
    PENDING: "bg-amber-100 text-amber-800 border-amber-200",
    CONFIRMED: "bg-blue-100 text-blue-800 border-blue-200",
    CANCELLED: "bg-red-100 text-red-800 border-red-200",
    COMPLETED: "bg-green-100 text-green-800 border-green-200",
  };
  const cls = styles[s] || "bg-gray-100 text-gray-700 border-gray-200";
  return <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${cls}`}>{status || "—"}</span>;
}

function toDatetimeLocal(d) {
  if (!d) return "";
  const date = new Date(d);
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  const h = String(date.getHours()).padStart(2, "0");
  const min = String(date.getMinutes()).padStart(2, "0");
  return `${y}-${m}-${day}T${h}:${min}`;
}

export default function AppointmentsPage() {
  const searchParams = useSearchParams();
  const { token } = useAuth();
  const [appointments, setAppointments] = useState([]);
  const [hospitals, setHospitals] = useState([]);
  const [doctors, setDoctors] = useState([]);
  const [patients, setPatients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [filter, setFilter] = useState(FILTER_TODAY);
  const [form, setForm] = useState({
    hospitalId: "",
    doctorId: "",
    patientId: "",
    scheduledAt: "",
    patientName: "",
    age: "",
    address: "",
    issue: "",
  });
  const [actionApt, setActionApt] = useState(null);
  const [rescheduleAt, setRescheduleAt] = useState("");

  const headers = () => ({ Authorization: `Bearer ${token}` });

  const load = () => {
    if (!token) return;
    setLoading(true);
    Promise.all([
      fetch(buildApiUrl("/api/appointments"), { headers: headers() }).then((r) => r.json()),
      fetch(buildApiUrl("/api/master/hospitals"), { headers: headers() }).then((r) => r.json()),
      fetch(buildApiUrl("/api/users/by-role/DOCTOR"), { headers: headers() }).then((r) => r.json()),
      fetch(buildApiUrl("/api/users?role=PATIENT"), { headers: headers() }).then((r) => r.json()),
    ])
      .then(([apts, hosp, docList, userList]) => {
        setAppointments(Array.isArray(apts) ? apts : apts?.appointments || []);
        setHospitals(Array.isArray(hosp) ? hosp : []);
        setDoctors(Array.isArray(docList) ? docList : docList?.doctors || []);
        setPatients(Array.isArray(userList) ? userList : userList?.users || []);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    load();
  }, [token]);

  const patientIdFromUrl = searchParams.get("patient");
  useEffect(() => {
    if (patientIdFromUrl && patients.length > 0) {
      setForm((f) => ({ ...f, patientId: patientIdFromUrl }));
      setShowForm(true);
    }
  }, [patientIdFromUrl, patients.length]);

  const filteredAppointments = useMemo(() => {
    if (filter !== FILTER_TODAY) return appointments;
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    const todayEnd = new Date(todayStart);
    todayEnd.setDate(todayEnd.getDate() + 1);
    return appointments.filter((a) => {
      const d = new Date(a.scheduledAt);
      return d >= todayStart && d < todayEnd;
    });
  }, [appointments, filter]);

  const getDoctorName = (doctorId) => doctors.find((d) => d._id === doctorId)?.name ?? "—";

  const onChange = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  const openFormWithDefaults = () => {
    const now = new Date();
    now.setMinutes(now.getMinutes() - now.getTimezoneOffset());
    setForm((f) => ({
      ...f,
      scheduledAt: toDatetimeLocal(now).slice(0, 16),
    }));
    setShowForm(true);
    setError("");
  };

  const submit = async (e) => {
    e.preventDefault();
    setError("");
    setSaving(true);
    try {
      const tokenNum = getNextTokenNumber();
      const res = await fetch(buildApiUrl("/api/appointments"), {
        method: "POST",
        headers: { "Content-Type": "application/json", ...headers() },
        body: JSON.stringify({
          hospitalId: form.hospitalId,
          doctorId: form.doctorId,
          patientId: form.patientId,
          scheduledAt: form.scheduledAt,
          patientName: form.patientName.trim(),
          age: Number(form.age) || 0,
          address: form.address.trim(),
          issue: form.issue.trim(),
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Failed to create appointment");
      const id = data._id || data.id;
      setAppointmentToken(id, tokenNum);
      setAppointments((prev) => [{ ...data, _id: id }, ...prev]);
      setShowForm(false);
      setForm({ hospitalId: "", doctorId: "", patientId: "", scheduledAt: "", patientName: "", age: "", address: "", issue: "" });
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const updateStatus = async (appointmentId, status) => {
    try {
      const res = await fetch(buildApiUrl(`/api/appointments/${appointmentId}/status`), {
        method: "PATCH",
        headers: { "Content-Type": "application/json", ...headers() },
        body: JSON.stringify({ status }),
      });
      if (!res.ok) throw new Error("Failed to update");
      setAppointments((prev) => prev.map((a) => (a._id === appointmentId ? { ...a, status } : a)));
      setActionApt(null);
    } catch (err) {
      alert(err.message);
    }
  };

  const cancelAppointment = async (appointmentId) => {
    if (!confirm("Cancel this appointment?")) return;
    try {
      const res = await fetch(buildApiUrl(`/api/appointments/${appointmentId}/cancel`), {
        method: "PATCH",
        headers: { "Content-Type": "application/json", ...headers() },
        body: JSON.stringify({ cancellationReason: "Cancelled by reception" }),
      });
      if (!res.ok) throw new Error("Failed to cancel");
      setAppointments((prev) => prev.map((a) => (a._id === appointmentId ? { ...a, status: "CANCELLED" } : a)));
      setActionApt(null);
    } catch (err) {
      alert(err.message);
    }
  };

  const rescheduleAppointment = async (appointmentId) => {
    if (!rescheduleAt) return;
    try {
      const res = await fetch(buildApiUrl(`/api/appointments/${appointmentId}/reschedule`), {
        method: "PATCH",
        headers: { "Content-Type": "application/json", ...headers() },
        body: JSON.stringify({ scheduledAt: rescheduleAt }),
      });
      if (!res.ok) throw new Error("Failed to reschedule");
      const data = await res.json();
      setAppointments((prev) => prev.map((a) => (a._id === appointmentId ? { ...a, ...data } : a)));
      setActionApt(null);
      setRescheduleAt("");
    } catch (err) {
      alert(err.message);
    }
  };

  useEffect(() => {
    if (!form.patientId) return;
    const p = patients.find((x) => x._id === form.patientId || x.id === form.patientId);
    if (p && p.name) setForm((f) => ({ ...f, patientName: p.name }));
  }, [form.patientId, patients]);

  const aptForModal = actionApt ? filteredAppointments.find((a) => a._id === actionApt) : null;

  return (
    <div className="max-w-6xl">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 mb-1">Appointments</h1>
          <p className="text-sm text-gray-600">Create walk-in appointments, assign time slots, and manage tokens.</p>
        </div>
        <div className="flex items-center gap-3 flex-shrink-0">
          <div className="flex gap-1 p-1 bg-gray-100 rounded-xl">
            <button
              type="button"
              onClick={() => setFilter(FILTER_TODAY)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${filter === FILTER_TODAY ? "bg-white text-blue-700 shadow-sm" : "text-gray-600 hover:text-gray-900"}`}
            >
              Today
            </button>
            <button
              type="button"
              onClick={() => setFilter(FILTER_ALL)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${filter === FILTER_ALL ? "bg-white text-blue-700 shadow-sm" : "text-gray-600 hover:text-gray-900"}`}
            >
              All
            </button>
          </div>
          <button
            type="button"
            onClick={openFormWithDefaults}
            className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl font-medium text-sm text-white bg-blue-600 hover:bg-blue-700 shadow-sm border-0"
          >
            <span className="text-lg leading-none">+</span> Add appointment
          </button>
        </div>
      </div>

      <div className="card overflow-hidden border border-gray-200">
        {loading ? (
          <div className="p-12 text-center text-gray-500">Loading appointments…</div>
        ) : filteredAppointments.length === 0 ? (
          <div className="p-12 text-center">
            <p className="text-gray-500 mb-2">No appointments in this view.</p>
            <button type="button" onClick={openFormWithDefaults} className="text-blue-600 font-medium hover:underline text-sm">
              Add appointment
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-blue-50 border-b border-blue-100">
                  <th className="text-left py-3 px-4 font-semibold text-blue-900">Token</th>
                  <th className="text-left py-3 px-4 font-semibold text-blue-900">Patient</th>
                  <th className="text-left py-3 px-4 font-semibold text-blue-900">Doctor</th>
                  <th className="text-left py-3 px-4 font-semibold text-blue-900">Date & time</th>
                  <th className="text-left py-3 px-4 font-semibold text-blue-900">Issue</th>
                  <th className="text-left py-3 px-4 font-semibold text-blue-900">Status</th>
                  <th className="text-right py-3 px-4 font-semibold text-blue-900">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filteredAppointments.map((apt) => (
                  <tr key={apt._id} className="hover:bg-blue-50/30">
                    <td className="py-3 px-4">
                      <span className="inline-flex items-center justify-center min-w-[2.25rem] h-9 rounded-lg bg-blue-100 text-blue-900 font-bold font-mono">
                        {getAppointmentToken(apt._id) ?? "—"}
                      </span>
                    </td>
                    <td className="py-3 px-4 font-medium text-gray-900">{apt.patientName || apt.patientId || "—"}</td>
                    <td className="py-3 px-4 text-gray-600">{getDoctorName(apt.doctorId)}</td>
                    <td className="py-3 px-4 text-gray-600 whitespace-nowrap">{apt.scheduledAt ? new Date(apt.scheduledAt).toLocaleString() : "—"}</td>
                    <td className="py-3 px-4 max-w-[200px] truncate text-gray-600" title={apt.issue || ""}>{apt.issue || "—"}</td>
                    <td className="py-3 px-4"><StatusBadge status={apt.status} /></td>
                    <td className="py-3 px-4 text-right">
                      <button
                        type="button"
                        onClick={() => { setActionApt(apt._id); setRescheduleAt(toDatetimeLocal(apt.scheduledAt)); }}
                        className="text-blue-600 hover:text-blue-800 font-medium"
                      >
                        Actions
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 overflow-y-auto" onClick={() => { setShowForm(false); setError(""); }}>
          <div className="bg-white rounded-2xl shadow-xl max-w-lg w-full my-8 p-6 border border-gray-200 max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900">Add appointment</h3>
              <button type="button" onClick={() => { setShowForm(false); setError(""); }} className="text-gray-400 hover:text-gray-600 text-xl leading-none">&times;</button>
            </div>
            <form onSubmit={submit} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Hospital</label>
                  <select name="hospitalId" value={form.hospitalId} onChange={onChange} required className="input w-full">
                    <option value="">Select hospital</option>
                    {hospitals.map((h) => (
                      <option key={h._id} value={h._id}>{h.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Doctor</label>
                  <select name="doctorId" value={form.doctorId} onChange={onChange} required className="input w-full">
                    <option value="">Select doctor</option>
                    {doctors.map((d) => (
                      <option key={d._id} value={d._id}>{d.name}</option>
                    ))}
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Patient</label>
                <select name="patientId" value={form.patientId} onChange={onChange} required className="input w-full">
                  <option value="">Select patient</option>
                  {patients.map((p) => (
                    <option key={p._id} value={p._id}>{p.name} – {p.phone || p.email}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Date & time</label>
                <input type="datetime-local" name="scheduledAt" value={form.scheduledAt} onChange={onChange} required className="input w-full" />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Patient name</label>
                  <input name="patientName" value={form.patientName} onChange={onChange} required className="input w-full" placeholder="Full name" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Age</label>
                  <input type="number" name="age" value={form.age} onChange={onChange} required min={0} max={150} className="input w-full" placeholder="Years" />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Address</label>
                <input name="address" value={form.address} onChange={onChange} required className="input w-full" placeholder="Full address" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Issue / reason for visit</label>
                <textarea name="issue" value={form.issue} onChange={onChange} required rows={2} className="input w-full resize-none" placeholder="Brief reason or chief complaint" />
              </div>
              {error && (
                <p className="text-sm text-red-600 bg-red-50 border border-red-100 rounded-lg px-3 py-2">{error}</p>
              )}
              <div className="flex gap-3 pt-2">
                <button type="submit" disabled={saving} className="btn-primary px-5 py-2.5 flex-1">
                  {saving ? "Creating…" : "Create & generate token"}
                </button>
                <button type="button" onClick={() => { setShowForm(false); setError(""); }} className="btn-secondary px-5 py-2.5">
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {aptForModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40" onClick={() => setActionApt(null)}>
          <div className="bg-white rounded-2xl shadow-xl max-w-md w-full p-6 border border-gray-200" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900">Appointment actions</h3>
              <button type="button" onClick={() => setActionApt(null)} className="text-gray-400 hover:text-gray-600 text-xl leading-none">&times;</button>
            </div>
            <p className="text-sm text-gray-600 mb-4">
              <span className="font-medium text-gray-900">{aptForModal.patientName}</span>
              {" · Token "}
              <span className="font-mono font-semibold">{getAppointmentToken(aptForModal._id) ?? "—"}</span>
            </p>
            <div className="space-y-3">
              <div className="flex gap-2 items-center flex-wrap">
                <input
                  type="datetime-local"
                  value={rescheduleAt}
                  onChange={(e) => setRescheduleAt(e.target.value)}
                  className="input flex-1 min-w-[180px]"
                />
                <button type="button" onClick={() => rescheduleAppointment(aptForModal._id)} className="btn-primary py-2 px-4 text-sm">
                  Reschedule
                </button>
              </div>
              <div className="flex flex-wrap gap-2 pt-2 border-t border-gray-100">
                {aptForModal.status !== "CONFIRMED" && (
                  <button type="button" onClick={() => updateStatus(aptForModal._id, "CONFIRMED")} className="btn-secondary py-2 px-4 text-sm">
                    Mark confirmed
                  </button>
                )}
                {aptForModal.status !== "COMPLETED" && (
                  <button type="button" onClick={() => updateStatus(aptForModal._id, "COMPLETED")} className="btn-primary py-2 px-4 text-sm">
                    Mark completed
                  </button>
                )}
                {aptForModal.status !== "CANCELLED" && (
                  <button type="button" onClick={() => cancelAppointment(aptForModal._id)} className="text-red-600 hover:text-red-700 font-medium py-2 px-4 text-sm border border-red-200 rounded-lg hover:bg-red-50">
                    Cancel appointment
                  </button>
                )}
              </div>
            </div>
            <p className="text-xs text-gray-500 mt-4 pt-3 border-t border-gray-100">Close this panel to return to the list.</p>
          </div>
        </div>
      )}
    </div>
  );
}
