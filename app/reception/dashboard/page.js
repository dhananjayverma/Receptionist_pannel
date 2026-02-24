"use client";

import { useEffect, useState } from "react";
import { toast } from "react-toastify";
import { buildApiUrl, getAuthHeaders, HOSPITALS_PATH, apiFetch, NETWORK_ERROR_MESSAGE } from "../../lib/api";
import { todayStr } from "../../lib/receptionUtils";
import { LoadingOverlay } from "../../components/LoadingSpinner";

export default function DashboardPage() {
  const [loading, setLoading] = useState(true);
  const [selectedHospitalId, setSelectedHospitalId] = useState("");
  const [hospitals, setHospitals] = useState([]);
  const [stats, setStats] = useState({
    todayPatients: 0,
    waiting: 0,
    withDoctor: 0,
    completed: 0,
    cashCollected: 0,
    pendingPayments: 0,
    doctorsToday: [],
    dailyCollection: { totalCash: 0, totalUPI: 0, totalCard: 0 },
  });

  useEffect(() => {
    let cancelled = false;
    const token = typeof window !== "undefined" ? localStorage.getItem("token") : null;
    if (!token) return;

    async function fetchData() {
      try {
        const headers = { ...getAuthHeaders() };
        const [appointmentsRes, doctorsRes, financeRes, hospRes] = await Promise.all([
          apiFetch(buildApiUrl("/api/appointments"), { headers }),
          apiFetch(buildApiUrl("/api/users?role=DOCTOR"), { headers }),
          fetch(buildApiUrl("/api/finance/summary"), { headers }).catch(() => null),
          fetch(buildApiUrl(HOSPITALS_PATH), { headers }).catch(() => null),
        ]);

        if (cancelled) return;
        const appointments = appointmentsRes.ok ? await appointmentsRes.json() : [];
        const doctors = doctorsRes.ok ? await doctorsRes.json() : [];
        const finance = financeRes?.ok ? await financeRes.json() : { revenue: 0 };
        const hosps = hospRes?.ok ? await hospRes.json() : [];
        setHospitals(Array.isArray(hosps) ? hosps : []);

        const today = todayStr();
        let todayApts = Array.isArray(appointments)
          ? appointments.filter((a) => {
              const d = a.appointmentDate || a.scheduledAt;
              return d && new Date(d).toISOString().split("T")[0] === today;
            })
          : [];
        if (selectedHospitalId) {
          todayApts = todayApts.filter((a) => (a.hospitalId || a.hospital) === selectedHospitalId);
        }

        const waiting = todayApts.filter((a) => (a.status || "").toUpperCase() === "PENDING" || (a.status || "").toUpperCase() === "CHECKED_IN").length;
        const withDoctor = todayApts.filter((a) => (a.status || "").toUpperCase() === "IN_PROGRESS").length;
        const completed = todayApts.filter((a) => (a.status || "").toUpperCase() === "COMPLETED").length;

        let doctorsToday = Array.isArray(doctors) ? doctors : [];
        if (selectedHospitalId) {
          doctorsToday = doctorsToday.filter((d) => (d.hospitalId || d.hospital) === selectedHospitalId);
        }
        doctorsToday = doctorsToday.slice(0, 12);

        setStats({
          todayPatients: todayApts.length,
          waiting,
          withDoctor,
          completed,
          cashCollected: finance.revenue ?? 0,
          pendingPayments: 0,
          doctorsToday,
          dailyCollection: finance.dailyCollection || { totalCash: finance.revenue || 0, totalUPI: 0, totalCard: 0 },
        });
      } catch (e) {
        if (!cancelled) {
          toast.error(e?.message === "BACKEND_UNREACHABLE" ? NETWORK_ERROR_MESSAGE : (e?.message || "Failed to load data"));
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    fetchData();
    return () => { cancelled = true; };
  }, [selectedHospitalId]);

  if (loading) {
    return (
      <div className="space-y-6">
        <h1 className="text-xl font-bold text-[#1a202c] uppercase tracking-tight">Dashboard</h1>
        <LoadingOverlay text="Loading dashboard…" />
      </div>
    );
  }

  const cards = [
    { label: "Patients today", value: stats.todayPatients, sub: "Total OPD" },
    { label: "Waiting", value: stats.waiting, sub: "In queue" },
    { label: "With doctor", value: stats.withDoctor, sub: "In consultation" },
    { label: "Completed", value: stats.completed, sub: "Done today" },
    { label: "Cash collected", value: `₹${Number(stats.cashCollected).toLocaleString()}`, sub: "Today" },
    { label: "Pending payments", value: `₹${Number(stats.pendingPayments).toLocaleString()}`, sub: "To collect" },
  ];

  return (
    <div className="space-y-8">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-[#1a202c] uppercase tracking-tight">Dashboard</h1>
          <p className="mt-1 text-sm text-[#4a5568]">
            Overview for {new Date().toLocaleDateString("en-IN", { weekday: "long", date: "numeric", month: "short" })}
          </p>
        </div>
        {hospitals.length > 0 && (
          <div>
            <label className="block text-xs font-semibold text-[#2d3748] mb-1">Hospital</label>
            <select value={selectedHospitalId} onChange={(e) => setSelectedHospitalId(e.target.value)} className="gov-select bg-white px-3 py-2 text-sm text-[#1a202c] w-full sm:w-auto min-w-[180px]">
              <option value="">All hospitals</option>
              {hospitals.map((h) => (
                <option key={h._id || h.id} value={h._id || h.id}>{h.name}</option>
              ))}
            </select>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
        {cards.map((card) => (
          <div key={card.label} className="gov-card p-4">
            <p className="text-xs font-semibold text-[#718096] uppercase tracking-wide">{card.label}</p>
            <p className="mt-1 text-2xl font-bold text-[#1a202c]">{card.value}</p>
            <p className="mt-0.5 text-xs text-[#4a5568]">{card.sub}</p>
          </div>
        ))}
      </div>

      {stats.dailyCollection && (stats.dailyCollection.totalCash || stats.dailyCollection.totalUPI || stats.dailyCollection.totalCard) ? (
        <div className="gov-card p-6">
          <h2 className="text-base font-semibold text-[#1a202c] border-b border-[#cbd5e0] pb-2">Daily collection</h2>
          <div className="mt-3 flex flex-wrap gap-6">
            <span className="text-sm text-[#4a5568]">Cash: ₹{Number(stats.dailyCollection.totalCash || 0).toLocaleString()}</span>
            <span className="text-sm text-[#4a5568]">UPI: ₹{Number(stats.dailyCollection.totalUPI || 0).toLocaleString()}</span>
            <span className="text-sm text-[#4a5568]">Card: ₹{Number(stats.dailyCollection.totalCard || 0).toLocaleString()}</span>
          </div>
        </div>
      ) : null}

      <div className="gov-card p-6">
        <h2 className="text-base font-semibold text-[#1a202c] border-b border-[#cbd5e0] pb-2">Today&apos;s doctors</h2>
        <p className="text-sm text-[#4a5568] mt-1">Available for appointment booking</p>
        <div className="mt-4 flex flex-wrap gap-3">
          {stats.doctorsToday.length === 0 ? (
            <p className="text-sm text-[#718096]">No doctors loaded. Check backend connection.</p>
          ) : (
            stats.doctorsToday.map((d) => (
              <div key={d._id || d.id} className="px-4 py-2 border border-[#cbd5e0] bg-[#f8fafc] text-[#2d3748] text-sm font-medium">
                Dr. {d.name || "—"} {d.specialization ? `(${d.specialization})` : ""}
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
