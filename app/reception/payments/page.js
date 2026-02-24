"use client";

import { useEffect, useState } from "react";
import { buildApiUrl, getAuthHeaders, HOSPITALS_PATH } from "../../lib/api";
import { todayStr } from "../../lib/receptionUtils";

const PAYMENT_MODES = [
  { id: "CASH", label: "Cash", color: "bg-amber-100 dark:bg-amber-900/30 text-amber-800 dark:text-amber-200" },
  { id: "UPI", label: "UPI", color: "bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-200" },
  { id: "CARD", label: "Card", color: "bg-violet-100 dark:bg-violet-900/30 text-violet-800 dark:text-violet-200" },
];

export default function PaymentsPage() {
  const [loading, setLoading] = useState(true);
  const [payments, setPayments] = useState([]);
  const [hospitals, setHospitals] = useState([]);
  const [hospitalId, setHospitalId] = useState("");
  const [date, setDate] = useState(todayStr());

  useEffect(() => {
    fetchHospitals();
  }, []);

  useEffect(() => {
    loadPayments();
  }, [date, hospitalId]);

  async function fetchHospitals() {
    try {
      const res = await fetch(buildApiUrl(HOSPITALS_PATH), { headers: getAuthHeaders() });
      if (res.ok) setHospitals(Array.isArray(await res.json()) ? await res.json() : []);
    } catch (e) {}
  }

  function loadPayments() {
    setLoading(true);
    try {
      const stored = typeof window !== "undefined" ? localStorage.getItem("reception_payments") : null;
      const all = stored ? JSON.parse(stored) : [];
      const list = all.filter((p) => {
        const d = (p.date || "").toString().split("T")[0];
        if (d !== date) return false;
        if (hospitalId && p.hospitalId !== hospitalId) return false;
        return true;
      });
      setPayments(list);
    } catch (e) {
      setPayments([]);
    } finally {
      setLoading(false);
    }
  }

  const byMode = payments.reduce((acc, p) => {
    const mode = p.paymentMode || "CASH";
    if (!acc[mode]) acc[mode] = { count: 0, total: 0 };
    acc[mode].count++;
    acc[mode].total += Number(p.total) || 0;
    return acc;
  }, {});

  const grandTotal = payments.reduce((sum, p) => sum + (Number(p.total) || 0), 0);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-50">Payment Summary</h1>
        <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">Today&apos;s payments by mode. Collect fees from OPD & Billing to see them here.</p>
      </div>

      <div className="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-4 shadow-sm flex flex-wrap gap-4 items-end">
        <div>
          <label className="block text-xs font-medium text-zinc-500 dark:text-zinc-400 mb-1">Date</label>
          <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="rounded-lg border border-zinc-300 dark:border-zinc-600 bg-white dark:bg-zinc-800 px-3 py-2 text-sm text-zinc-900 dark:text-zinc-50" />
        </div>
        {hospitals.length > 0 && (
          <div>
            <label className="block text-xs font-medium text-zinc-500 dark:text-zinc-400 mb-1">Hospital</label>
            <select value={hospitalId} onChange={(e) => setHospitalId(e.target.value)} className="rounded-lg border border-zinc-300 dark:border-zinc-600 bg-white dark:bg-zinc-800 px-3 py-2 text-sm text-zinc-900 dark:text-zinc-50 min-w-[200px]">
              <option value="">All hospitals</option>
              {hospitals.map((h) => (
                <option key={h._id || h.id} value={h._id || h.id}>{h.name}</option>
              ))}
            </select>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {PAYMENT_MODES.map((mode) => (
          <div key={mode.id} className="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-5 shadow-sm">
            <p className="text-xs font-medium text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">{mode.label}</p>
            <p className="mt-1 text-2xl font-bold text-zinc-900 dark:text-zinc-50">₹{(byMode[mode.id]?.total || 0).toLocaleString("en-IN")}</p>
            <p className="text-sm text-zinc-500 dark:text-zinc-400">{(byMode[mode.id]?.count || 0)} transaction(s)</p>
          </div>
        ))}
      </div>

      <div className="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-6 shadow-sm">
        <h2 className="font-semibold text-zinc-900 dark:text-zinc-50 mb-2">Total collection</h2>
        <p className="text-3xl font-bold text-emerald-600 dark:text-emerald-400">₹{grandTotal.toLocaleString("en-IN")}</p>
        <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-1">Payments recorded when you collect fees on OPD & Billing page (saved in browser). For persistent data, connect backend daily-collections API.</p>
      </div>

      <div className="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 shadow-sm overflow-hidden">
        <h2 className="px-4 py-3 font-semibold text-zinc-900 dark:text-zinc-50 border-b border-zinc-200 dark:border-zinc-800">Recent payments</h2>
        {loading ? (
          <div className="p-6 text-center text-zinc-500">Loading…</div>
        ) : payments.length === 0 ? (
          <div className="p-6 text-center text-zinc-500">No payments for this date. Use OPD & Billing to collect fees — they will appear here if you enable &quot;Save to payment summary&quot; there.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-zinc-200 dark:divide-zinc-700">
              <thead className="bg-zinc-50 dark:bg-zinc-800/50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-zinc-600 dark:text-zinc-400 uppercase">Time</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-zinc-600 dark:text-zinc-400 uppercase">Patient</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-zinc-600 dark:text-zinc-400 uppercase">Mode</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-zinc-600 dark:text-zinc-400 uppercase">Amount</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-200 dark:divide-zinc-700">
                {payments.slice(0, 50).map((p, i) => (
                  <tr key={i} className="hover:bg-zinc-50 dark:hover:bg-zinc-800/50">
                    <td className="px-4 py-3 text-sm text-zinc-600 dark:text-zinc-400">{p.date ? new Date(p.date).toLocaleTimeString() : "—"}</td>
                    <td className="px-4 py-3 text-sm font-medium text-zinc-900 dark:text-zinc-50">{p.patientName || "—"}</td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${PAYMENT_MODES.find((m) => m.id === p.paymentMode)?.color || "bg-zinc-100 dark:bg-zinc-700"}`}>
                        {p.paymentMode || "CASH"}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm font-medium text-zinc-900 dark:text-zinc-50">₹{Number(p.total || 0).toLocaleString("en-IN")}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
