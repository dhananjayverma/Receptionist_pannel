"use client";

import { useEffect, useState } from "react";
import { buildApiUrl, getAuthHeaders, HOSPITALS_PATH } from "../../lib/api";
import { todayStr } from "../../lib/receptionUtils";

const PAYMENTS_KEY = "reception_payments";
const RECEIPTS_KEY = "reception_receipts";

function loadPayments() {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(PAYMENTS_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export default function RevenuePage() {
  const [payments, setPayments] = useState([]);
  const [appointments, setAppointments] = useState([]);
  const [doctors, setDoctors] = useState([]);
  const [hospitals, setHospitals] = useState([]);
  const [dateFrom, setDateFrom] = useState(todayStr());
  const [dateTo, setDateTo] = useState(todayStr());
  const [reportDownloadType, setReportDownloadType] = useState("summary");
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState({ type: "", text: "" });

  useEffect(() => {
    setPayments(loadPayments());
  }, []);

  useEffect(() => {
    let cancelled = false;
    const headers = getAuthHeaders();
    Promise.all([
      fetch(buildApiUrl("/api/appointments"), { headers }),
      fetch(buildApiUrl("/api/users?role=DOCTOR"), { headers }),
      fetch(buildApiUrl(HOSPITALS_PATH), { headers }),
    ])
      .then(([a, d, h]) => Promise.all([a.json(), d.json(), h.json()]))
      .then(([apts, docs, hosps]) => {
        if (cancelled) return;
        setAppointments(Array.isArray(apts) ? apts : Array.isArray(apts?.data) ? apts.data : []);
        setDoctors(Array.isArray(docs) ? docs : Array.isArray(docs?.users) ? docs.users : []);
        setHospitals(Array.isArray(hosps) ? hosps : Array.isArray(hosps?.data) ? hosps.data : []);
      })
      .catch(() => {})
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => { cancelled = true; };
  }, []);

  const paymentsInRange = payments.filter((p) => {
    const d = (p.date || p.bookingDate || "").toString().slice(0, 10);
    return d >= dateFrom && d <= dateTo;
  });

  const totalRevenue = paymentsInRange.reduce((sum, p) => sum + (Number(p.total) || 0), 0);
  const totalCount = paymentsInRange.length;

  const byHospital = paymentsInRange.reduce((acc, p) => {
    const id = p.hospitalId || "unknown";
    if (!acc[id]) acc[id] = { total: 0, count: 0 };
    acc[id].total += Number(p.total) || 0;
    acc[id].count += 1;
    return acc;
  }, {});

  const appointmentMap = (appointments || []).reduce((acc, a) => {
    acc[a._id || a.id] = a;
    return acc;
  }, {});

  const byDoctor = paymentsInRange.reduce((acc, p) => {
    const apt = p.appointmentId ? appointmentMap[p.appointmentId] : null;
    const id = apt?.doctorId || "unknown";
    if (!acc[id]) acc[id] = { total: 0, count: 0 };
    acc[id].total += Number(p.total) || 0;
    acc[id].count += 1;
    return acc;
  }, {});

  const getDoctorName = (id) => doctors.find((d) => (d._id || d.id) === id)?.name || id;
  const getHospitalName = (id) => hospitals.find((h) => (h._id || h.id) === id)?.name || id;

  function downloadReport() {
    const lines = [];
    lines.push("Revenue Report");
    lines.push(`From: ${dateFrom} To: ${dateTo}`);
    lines.push("");
    lines.push("Total Revenue (₹),Total Payments");
    lines.push(`${totalRevenue},${totalCount}`);
    lines.push("");

    if (reportDownloadType === "hospital" || reportDownloadType === "summary") {
      lines.push("Hospital-wise Payment Record");
      lines.push("Hospital,Total (₹),Count");
      Object.entries(byHospital).forEach(([id, v]) => {
        lines.push(`${getHospitalName(id)},${v.total},${v.count}`);
      });
      lines.push("");
    }

    if (reportDownloadType === "doctor" || reportDownloadType === "summary") {
      lines.push("Doctor-wise Payment Record");
      lines.push("Doctor,Total (₹),Count");
      Object.entries(byDoctor).forEach(([id, v]) => {
        lines.push(`Dr. ${getDoctorName(id)},${v.total},${v.count}`);
      });
    }

    const blob = new Blob([lines.join("\n")], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `revenue-report-${dateFrom}-to-${dateTo}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    setMessage({ type: "success", text: "Report downloaded." });
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-xl font-bold text-[#1a202c] uppercase tracking-tight">Revenue & Invoices</h1>
        <p className="mt-1 text-sm text-[#4a5568]">Total revenue, generate invoice (mandatory, auto-download), download reports, hospital-wise and doctor-wise payment records.</p>
      </div>

      {message.text && (
        <div className={`border px-4 py-3 text-sm rounded ${message.type === "error" ? "bg-red-50 text-red-800 border-red-600" : "bg-[#e8f5e9] text-[#2e7d32] border-[#2e7d32]"}`}>
          {message.text}
        </div>
      )}

      {/* Total Revenue Panel */}
      <div className="gov-card p-6 border-2 border-[#0d47a1] bg-[#e3f2fd]">
        <h2 className="text-lg font-bold text-[#0d47a1] mb-2">Total Revenue</h2>
        <p className="text-3xl font-bold text-[#1a202c]">₹{totalRevenue.toLocaleString("en-IN")}</p>
        <p className="text-sm text-[#4a5568] mt-1">From {dateFrom} to {dateTo} · {totalCount} payment(s)</p>
        <div className="flex flex-wrap gap-4 mt-4">
          <div>
            <label className="block text-xs font-semibold text-[#2d3748]">From date</label>
            <input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} className="gov-input mt-1 bg-white px-3 py-2 text-sm" />
          </div>
          <div>
            <label className="block text-xs font-semibold text-[#2d3748]">To date</label>
            <input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} className="gov-input mt-1 bg-white px-3 py-2 text-sm" />
          </div>
        </div>
      </div>

      {/* Generate Invoice Manually - mandatory, auto-download */}
      <div className="gov-card p-6">
        <h2 className="text-lg font-bold text-[#1a202c] border-b border-[#cbd5e0] pb-2">Generate Invoice Manually <span className="text-red-600 text-sm font-normal">(Mandatory)</span></h2>
        <p className="text-sm text-[#4a5568] mt-2">Create and download invoice with customer name, items and amount. Invoice is generated and downloaded automatically.</p>
        <a href="/reception/invoices#manual" className="inline-flex items-center gov-btn-primary mt-4 px-5 py-2.5">
          Open Generate Invoice →
        </a>
      </div>

      {/* Download Report Section */}
      <div className="gov-card p-6">
        <h2 className="text-lg font-bold text-[#1a202c] border-b border-[#cbd5e0] pb-2">Download Report</h2>
        <p className="text-sm text-[#4a5568] mt-2">Export revenue and payment records as CSV for the selected date range.</p>
        <div className="flex flex-wrap items-end gap-4 mt-4">
          <div>
            <label className="block text-xs font-semibold text-[#2d3748]">Report type</label>
            <select value={reportDownloadType} onChange={(e) => setReportDownloadType(e.target.value)} className="gov-select mt-1 bg-white px-3 py-2 text-sm">
              <option value="summary">Summary + Hospital + Doctor</option>
              <option value="hospital">Hospital-wise only</option>
              <option value="doctor">Doctor-wise only</option>
            </select>
          </div>
          <button type="button" onClick={downloadReport} className="gov-btn-primary px-5 py-2.5">
            Download report (CSV)
          </button>
        </div>
      </div>

      {/* Hospital-wise Payment Record */}
      <div className="gov-card overflow-hidden">
        <div className="p-4 border-b border-[#cbd5e0] bg-[#f8fafc]">
          <h2 className="font-semibold text-[#1a202c]">Hospital-wise Payment Record</h2>
          <p className="text-sm text-[#4a5568]">Payments grouped by hospital for the selected date range.</p>
        </div>
        <div className="overflow-x-auto">
          <table className="gov-table">
            <thead>
              <tr>
                <th>Hospital</th>
                <th>Total (₹)</th>
                <th>Count</th>
              </tr>
            </thead>
            <tbody>
              {Object.entries(byHospital).length === 0 ? (
                <tr><td colSpan={3} className="text-center text-[#718096] py-8">No payment data for this range.</td></tr>
              ) : (
                Object.entries(byHospital).map(([id, v]) => (
                  <tr key={id}>
                    <td className="font-medium text-[#1a202c]">{getHospitalName(id)}</td>
                    <td className="text-[#4a5568]">₹{v.total.toLocaleString("en-IN")}</td>
                    <td className="text-[#4a5568]">{v.count}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Doctor-wise Payment Record */}
      <div className="gov-card overflow-hidden">
        <div className="p-4 border-b border-[#cbd5e0] bg-[#f8fafc]">
          <h2 className="font-semibold text-[#1a202c]">Doctor-wise Payment Record</h2>
          <p className="text-sm text-[#4a5568]">Payments grouped by doctor (from appointment booking) for the selected date range.</p>
        </div>
        <div className="overflow-x-auto">
          <table className="gov-table">
            <thead>
              <tr>
                <th>Doctor</th>
                <th>Total (₹)</th>
                <th>Count</th>
              </tr>
            </thead>
            <tbody>
              {Object.entries(byDoctor).length === 0 ? (
                <tr><td colSpan={3} className="text-center text-[#718096] py-8">No payment data for this range.</td></tr>
              ) : (
                Object.entries(byDoctor).map(([id, v]) => (
                  <tr key={id}>
                    <td className="font-medium text-[#1a202c]">Dr. {getDoctorName(id)}</td>
                    <td className="text-[#4a5568]">₹{v.total.toLocaleString("en-IN")}</td>
                    <td className="text-[#4a5568]">{v.count}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
