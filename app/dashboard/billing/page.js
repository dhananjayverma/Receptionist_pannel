"use client";

import { useState, useEffect, useRef } from "react";
import { buildApiUrl } from "@/lib/api";
import { useAuth } from "@/components/AuthGuard";
import { getSettings } from "@/lib/clinicStore";

const PAYMENT_MODES = ["Cash", "Card", "UPI"];
const PAYMENT_STATUSES = ["Paid", "Pending"];

export default function BillingPage() {
  const { token } = useAuth();
  const settings = getSettings();
  const [consultationFee, setConsultationFee] = useState(settings.consultationFee || 200);
  const [tests, setTests] = useState([]);
  const [testLine, setTestLine] = useState({ name: "", amount: "" });
  const [paymentMode, setPaymentMode] = useState("Cash");
  const [paymentStatus, setPaymentStatus] = useState("Paid");
  const [patientToken, setPatientToken] = useState("");
  const [pharmacies, setPharmacies] = useState([]);
  const [pharmacyId, setPharmacyId] = useState("");
  const [saveStatus, setSaveStatus] = useState(null);
  const printRef = useRef(null);

  useEffect(() => {
    if (!token) return;
    fetch(buildApiUrl("/api/master/pharmacies"), { headers: { Authorization: `Bearer ${token}` } })
      .then((r) => r.json())
      .then((data) => setPharmacies(Array.isArray(data) ? data : []))
      .catch(() => setPharmacies([]));
  }, [token]);

  const addTest = () => {
    if (!testLine.name.trim()) return;
    setTests([...tests, { name: testLine.name, amount: Number(testLine.amount) || 0 }]);
    setTestLine({ name: "", amount: "" });
  };

  const removeTest = (i) => setTests(tests.filter((_, idx) => idx !== i));

  const consultationTotal = Number(consultationFee) || 0;
  const testsTotal = tests.reduce((s, t) => s + (Number(t.amount) || 0), 0);
  const total = consultationTotal + testsTotal;

  const saveToBackend = async () => {
    if (!patientToken.trim() || !pharmacyId || total <= 0) {
      setSaveStatus({ ok: false, message: "Fill patient token, select pharmacy, and add at least consultation or tests." });
      return;
    }
    setSaveStatus(null);
    try {
      const res = await fetch(buildApiUrl("/api/orders/medicine-order"), {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${patientToken.trim()}` },
        body: JSON.stringify({
          pharmacyId,
          items: [{ medicineName: "Consultation", quantity: 1 }, ...tests.map((t) => ({ medicineName: t.name, quantity: 1 }))],
          deliveryType: "PICKUP",
          totalAmount: total,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Failed");
      setSaveStatus({ ok: true });
    } catch (err) {
      setSaveStatus({ ok: false, message: err.message });
    }
  };

  const handlePrint = () => {
    if (printRef.current) {
      const prev = document.body.innerHTML;
      document.body.innerHTML = printRef.current.innerHTML;
      window.print();
      document.body.innerHTML = prev;
      window.location.reload();
    } else window.print();
  };

  return (
    <div>
      <h1 className="page-title mb-2">Billing & Payment</h1>
      <p className="page-desc mb-6">Consultation fee, prescribed tests, generate bill, print receipt. Payment mode and status.</p>

      <div className="card p-6 max-w-2xl">
        <div className="space-y-4">
          <div>
            <label className="label">Consultation fee (₹)</label>
            <input type="number" min={0} value={consultationFee} onChange={(e) => setConsultationFee(e.target.value)} className="input w-32" />
          </div>
          <div>
            <label className="label">Add prescribed tests</label>
            <div className="flex gap-2 flex-wrap items-end">
              <input
                value={testLine.name}
                onChange={(e) => setTestLine({ ...testLine, name: e.target.value })}
                placeholder="Test name"
                className="input flex-1 min-w-[120px]"
              />
              <input
                type="number"
                min={0}
                value={testLine.amount}
                onChange={(e) => setTestLine({ ...testLine, amount: e.target.value })}
                placeholder="Amount"
                className="input w-24"
              />
              <button type="button" onClick={addTest} className="btn-primary">Add</button>
            </div>
            {tests.length > 0 && (
              <ul className="mt-2 space-y-1">
                {tests.map((t, i) => (
                  <li key={i} className="flex justify-between text-sm">
                    <span>{t.name} – ₹{t.amount}</span>
                    <button type="button" onClick={() => removeTest(i)} className="text-red-600 hover:underline">Remove</button>
                  </li>
                ))}
              </ul>
            )}
          </div>
          <div className="border-t border-gray-200 pt-4">
            <p className="font-semibold text-gray-900">Total: ₹{total}</p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="label">Payment mode</label>
              <select value={paymentMode} onChange={(e) => setPaymentMode(e.target.value)} className="input">
                {PAYMENT_MODES.map((m) => (
                  <option key={m} value={m}>{m}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="label">Payment status</label>
              <select value={paymentStatus} onChange={(e) => setPaymentStatus(e.target.value)} className="input">
                {PAYMENT_STATUSES.map((s) => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
            </div>
          </div>
          <div className="flex gap-3 no-print">
            <button type="button" onClick={handlePrint} className="btn-primary">Print receipt</button>
          </div>
        </div>

        <div className="mt-8 pt-6 border-t border-gray-200 no-print">
          <p className="label mb-2">Save to backend (optional – patient token + pharmacy)</p>
          <div className="flex flex-wrap gap-3 items-end">
            <div className="flex-1 min-w-[180px]">
              <input type="password" placeholder="Patient token" value={patientToken} onChange={(e) => setPatientToken(e.target.value)} className="input text-sm" />
            </div>
            <div className="w-40">
              <select value={pharmacyId} onChange={(e) => setPharmacyId(e.target.value)} className="input text-sm">
                <option value="">Pharmacy</option>
                {pharmacies.map((p) => (
                  <option key={p._id} value={p._id}>{p.name}</option>
                ))}
              </select>
            </div>
            <button type="button" onClick={saveToBackend} className="btn-secondary">Save order</button>
          </div>
          {saveStatus && (
            <p className={`mt-2 text-sm ${saveStatus.ok ? "text-green-600" : "text-red-600"}`}>
              {saveStatus.ok ? "Saved." : saveStatus.message}
            </p>
          )}
        </div>
      </div>

      <div ref={printRef} className="hidden print:block p-6">
        <h2 className="text-lg font-bold text-gray-900 mb-4">Clinic Receipt</h2>
        <table className="w-full text-sm">
          <tbody>
            <tr><td className="py-1">Consultation</td><td className="text-right">₹{consultationFee}</td></tr>
            {tests.map((t, i) => (
              <tr key={i}><td className="py-1">{t.name}</td><td className="text-right">₹{t.amount}</td></tr>
            ))}
            <tr className="border-t-2 font-bold"><td className="pt-2">Total</td><td className="text-right pt-2">₹{total}</td></tr>
          </tbody>
        </table>
        <p className="mt-4 text-sm text-gray-600">Payment: {paymentMode} – {paymentStatus}</p>
        <p className="mt-2 text-xs text-gray-500">Date: {new Date().toLocaleString()}</p>
      </div>
    </div>
  );
}
