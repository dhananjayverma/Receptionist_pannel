"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { buildApiUrl } from "@/lib/api";
import { useAuth } from "@/components/AuthGuard";
import { checkBackendHealth } from "@/lib/apiHealth";

const cards = [
  { href: "/dashboard/patients", title: "Patients", desc: "Search patients, view visit history." },
  { href: "/dashboard/register", title: "Add Patient", desc: "Register new walk-in patient." },
  { href: "/dashboard/appointments", title: "Appointments", desc: "Create and manage appointments, token number." },
  { href: "/dashboard/queue", title: "Queue", desc: "Waiting, Called, With Doctor, Completed." },
  { href: "/dashboard/billing", title: "Billing", desc: "Consultation fee, tests, payment, print receipt." },
  { href: "/dashboard/doctors", title: "Doctors", desc: "View doctors and availability." },
  { href: "/dashboard/reports", title: "Reports", desc: "Today's stats, revenue, doctor-wise count." },
];

export default function DashboardPage() {
  const { token } = useAuth();
  const [backendOk, setBackendOk] = useState(null);
  const [todayCount, setTodayCount] = useState(0);
  const [patientCount, setPatientCount] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    async function run() {
      const ok = await checkBackendHealth();
      if (cancelled) return;
      setBackendOk(ok);
      if (!ok || !token) {
        setLoading(false);
        return;
      }
      try {
        const [aptRes, userRes] = await Promise.all([
          fetch(buildApiUrl("/api/appointments"), { headers: { Authorization: `Bearer ${token}` } }),
          fetch(buildApiUrl("/api/users?role=PATIENT"), { headers: { Authorization: `Bearer ${token}` } }),
        ]);
        if (cancelled) return;
        const aptData = aptRes.ok ? await aptRes.json() : [];
        const appointments = Array.isArray(aptData) ? aptData : aptData?.appointments || [];
        const todayStart = new Date();
        todayStart.setHours(0, 0, 0, 0);
        const todayEnd = new Date(todayStart);
        todayEnd.setDate(todayEnd.getDate() + 1);
        const today = appointments.filter((a) => {
          const d = new Date(a.scheduledAt);
          return d >= todayStart && d < todayEnd;
        });
        setTodayCount(today.length);
        const userList = userRes.ok ? await userRes.json() : [];
        setPatientCount(Array.isArray(userList) ? userList.length : 0);
      } catch (e) {
        setBackendOk(false);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    run();
    return () => { cancelled = true; };
  }, [token]);

  return (
    <div>
      <h1 className="page-title mb-2">Receptionist Console</h1>
      <p className="page-desc mb-6">Manage walk-in patients, queue, billing and reports.</p>

      {backendOk === false && (
        <div className="card border-red-200 bg-red-50 p-4 mb-6 text-red-800">
          <p className="font-medium">Backend unreachable</p>
          <p className="text-sm mt-1">Set NEXT_PUBLIC_API_BASE in .env.local and ensure the backend is running.</p>
        </div>
      )}

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <Link href="/dashboard/appointments" className="card card-hover p-5 no-underline">
          <p className="text-sm text-gray-600">Today&apos;s appointments</p>
          <p className="text-2xl font-bold text-blue-900 mt-1">{loading ? "…" : todayCount}</p>
        </Link>
        <Link href="/dashboard/patients" className="card card-hover p-5 no-underline">
          <p className="text-sm text-gray-600">Total patients</p>
          <p className="text-2xl font-bold text-blue-900 mt-1">{loading ? "…" : patientCount}</p>
        </Link>
        <Link href="/dashboard/queue" className="card card-hover p-5 no-underline">
          <p className="text-sm text-gray-600">Queue</p>
          <p className="text-lg font-semibold text-blue-900 mt-1">View →</p>
        </Link>
        <Link href="/dashboard/reports" className="card card-hover p-5 no-underline">
          <p className="text-sm text-gray-600">Reports</p>
          <p className="text-lg font-semibold text-blue-900 mt-1">View →</p>
        </Link>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {cards.map((c) => (
          <Link key={c.href} href={c.href} className="card card-hover block p-6 no-underline">
            <h3 className="font-semibold text-gray-900 mb-2">{c.title}</h3>
            <p className="text-sm text-gray-600">{c.desc}</p>
          </Link>
        ))}
      </div>
    </div>
  );
}
