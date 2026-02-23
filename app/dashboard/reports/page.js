"use client";

import { useState, useEffect } from "react";
import { buildApiUrl } from "@/lib/api";
import { useAuth } from "@/components/AuthGuard";

export default function ReportsPage() {
  const { token } = useAuth();
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    patientsToday: 0,
    appointmentsToday: 0,
    completedToday: 0,
    pendingPayments: 0,
    doctorWise: [],
  });

  useEffect(() => {
    if (!token) return;
    Promise.all([
      fetch(buildApiUrl("/api/appointments"), { headers: { Authorization: `Bearer ${token}` } }),
      fetch(buildApiUrl("/api/users?role=PATIENT"), { headers: { Authorization: `Bearer ${token}` } }),
      fetch(buildApiUrl("/api/users/by-role/DOCTOR"), { headers: { Authorization: `Bearer ${token}` } }),
    ])
      .then(([aRes, pRes, dRes]) => Promise.all([aRes.json(), pRes.json(), dRes.json()]))
      .then(([apts, patients, doctors]) => {
        const appointments = Array.isArray(apts) ? apts : apts?.appointments || [];
        const docList = Array.isArray(doctors) ? doctors : doctors?.doctors || [];
        const todayStart = new Date();
        todayStart.setHours(0, 0, 0, 0);
        const todayEnd = new Date(todayStart);
        todayEnd.setDate(todayEnd.getDate() + 1);
        const today = appointments.filter((a) => {
          const d = new Date(a.scheduledAt);
          return d >= todayStart && d < todayEnd;
        });
        const completedToday = today.filter((a) => a.status === "COMPLETED").length;
        const doctorWise = docList.map((doc) => {
          const count = today.filter((a) => String(a.doctorId) === String(doc._id)).length;
          return { name: doc.name, count };
        }).filter((d) => d.count > 0);
        setStats({
          patientsToday: today.length,
          appointmentsToday: today.length,
          completedToday,
          pendingPayments: 0,
          doctorWise,
        });
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [token]);

  return (
    <div>
      <h1 className="page-title mb-2">Reports Dashboard</h1>
      <p className="page-desc mb-6">Today&apos;s summary: patients, appointments, revenue (pending from backend).</p>

      {loading ? (
        <div className="card p-10 text-center text-gray-500">Loading…</div>
      ) : (
        <>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
            <div className="card p-5">
              <p className="text-sm text-gray-600">Total patients (today visits)</p>
              <p className="text-2xl font-bold text-blue-900 mt-1">{stats.appointmentsToday}</p>
            </div>
            <div className="card p-5">
              <p className="text-sm text-gray-600">Appointments today</p>
              <p className="text-2xl font-bold text-blue-900 mt-1">{stats.appointmentsToday}</p>
            </div>
            <div className="card p-5">
              <p className="text-sm text-gray-600">Completed today</p>
              <p className="text-2xl font-bold text-green-700 mt-1">{stats.completedToday}</p>
            </div>
            <div className="card p-5">
              <p className="text-sm text-gray-600">Pending payments</p>
              <p className="text-2xl font-bold text-amber-700 mt-1">{stats.pendingPayments}</p>
            </div>
          </div>

          <div className="card p-6 max-w-md">
            <h3 className="font-semibold text-gray-900 mb-4">Doctor-wise patient count (today)</h3>
            {stats.doctorWise.length === 0 ? (
              <p className="text-sm text-gray-500">No appointments today.</p>
            ) : (
              <ul className="space-y-2">
                {stats.doctorWise.map((d, i) => (
                  <li key={i} className="flex justify-between text-sm">
                    <span className="text-gray-700">{d.name}</span>
                    <span className="font-medium text-blue-900">{d.count}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </>
      )}
    </div>
  );
}
