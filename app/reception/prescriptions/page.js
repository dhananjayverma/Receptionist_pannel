"use client";

import { useEffect, useState } from "react";
import { buildApiUrl, getAuthHeaders, PHARMACIES_PATH } from "../../lib/api";
import SuccessModal from "../../components/SuccessModal";

export default function PrescriptionsPage() {
  const [prescriptions, setPrescriptions] = useState([]);
  const [patients, setPatients] = useState([]);
  const [doctors, setDoctors] = useState([]);
  const [pharmacies, setPharmacies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState({ type: "", text: "" });
  const [filter, setFilter] = useState({
    patientId: "",
    doctorId: "",
    fromDate: "",
    toDate: "",
  });
  const [selectedPrescription, setSelectedPrescription] = useState(null);
  const [sendToPharmacyModal, setSendToPharmacyModal] = useState(null);
  const [sendingToPharmacy, setSendingToPharmacy] = useState(false);
  const [successModal, setSuccessModal] = useState({ open: false, title: "", message: "" });

  useEffect(() => {
    fetchData();
  }, []);

  async function fetchData() {
    setLoading(true);
    try {
      const headers = getAuthHeaders();
      const [preRes, patRes, docRes, pharmRes] = await Promise.all([
        fetch(buildApiUrl("/api/prescriptions"), { headers }),
        fetch(buildApiUrl("/api/users?role=PATIENT"), { headers }),
        fetch(buildApiUrl("/api/users?role=DOCTOR"), { headers }),
        fetch(buildApiUrl(PHARMACIES_PATH), { headers }).catch(() => ({ ok: false })),
      ]);
      const preRaw = preRes.ok ? await preRes.json() : [];
      const patRaw = patRes.ok ? await patRes.json() : [];
      const docRaw = docRes.ok ? await docRes.json() : [];
      const pharmRaw = pharmRes.ok ? await pharmRes.json() : [];
      const preList = Array.isArray(preRaw) ? preRaw : Array.isArray(preRaw?.data) ? preRaw.data : Array.isArray(preRaw?.prescriptions) ? preRaw.prescriptions : [];
      const patList = Array.isArray(patRaw) ? patRaw : Array.isArray(patRaw?.data) ? patRaw.data : Array.isArray(patRaw?.users) ? patRaw.users : [];
      const docList = Array.isArray(docRaw) ? docRaw : Array.isArray(docRaw?.data) ? docRaw.data : Array.isArray(docRaw?.users) ? docRaw.users : [];
      const pharmList = Array.isArray(pharmRaw) ? pharmRaw : Array.isArray(pharmRaw?.data) ? pharmRaw.data : [];
      setPrescriptions(preList);
      setPatients(patList);
      setDoctors(docList);
      setPharmacies(pharmList);
    } catch (e) {
      setMessage({ type: "error", text: "Failed to load data" });
    } finally {
      setLoading(false);
    }
  }

  async function applyFilter() {
    setLoading(true);
    setMessage({ type: "", text: "" });
    try {
      const params = new URLSearchParams();
      if (filter.patientId) params.set("patientId", filter.patientId);
      if (filter.doctorId) params.set("doctorId", filter.doctorId);
      const url = buildApiUrl("/api/prescriptions") + (params.toString() ? `?${params}` : "");
      const res = await fetch(url, { headers: getAuthHeaders() });
      const raw = res.ok ? await res.json() : [];
      let data = Array.isArray(raw) ? raw : Array.isArray(raw?.data) ? raw.data : Array.isArray(raw?.prescriptions) ? raw.prescriptions : [];
      if (filter.fromDate || filter.toDate) {
        data = data.filter((p) => {
          const d = (p.createdAt || p.date || "").toString().split("T")[0];
          if (filter.fromDate && d < filter.fromDate) return false;
          if (filter.toDate && d > filter.toDate) return false;
          return true;
        });
      }
      setPrescriptions(data);
    } catch (e) {
      setMessage({ type: "error", text: "Filter failed" });
    } finally {
      setLoading(false);
    }
  }

  const getPatientName = (id) => {
    if (!id) return "—";
    const p = patients.find((x) => (x._id || x.id) === id);
    return p?.name || p?.patientName || "—";
  };
  const getDoctorName = (id) => {
    if (!id) return "—";
    const d = doctors.find((x) => (x._id || x.id) === id);
    return d?.name || d?.doctorName || "—";
  };
  const getPatient = (id) => patients.find((p) => (p._id || p.id) === id);
  const getDoctor = (id) => doctors.find((d) => (d._id || d.id) === id);

  async function sendPrescriptionToPharmacy(prescriptionId, pharmacyId) {
    const prescription = prescriptions.find((p) => (p._id || p.id) === prescriptionId);
    if (!prescription || !prescription.items || prescription.items.length === 0) {
      setMessage({ type: "error", text: "Prescription has no items" });
      return;
    }
    setSendingToPharmacy(true);
    setMessage({ type: "", text: "" });
    try {
      const res = await fetch(buildApiUrl(`/api/prescriptions/${prescriptionId}`), {
        method: "PUT",
        headers: { ...getAuthHeaders(), "Content-Type": "application/json" },
        body: JSON.stringify({ items: prescription.items, pharmacyId }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.message || "Failed to send to pharmacy");
      setSuccessModal({
        open: true,
        title: "Sent to pharmacy",
        message: "Prescription has been assigned to the pharmacy. They can view and fulfill the medicine order in their panel.",
      });
      setSendToPharmacyModal(null);
      setSelectedPrescription(null);
      fetchData();
    } catch (e) {
      setMessage({ type: "error", text: e.message || "Failed to send to pharmacy" });
    } finally {
      setSendingToPharmacy(false);
    }
  }

  const filteredList = prescriptions;

  return (
    <div className="space-y-6">
      <SuccessModal open={successModal.open} title={successModal.title} message={successModal.message} onClose={() => setSuccessModal({ open: false, title: "", message: "" })} />
      <div>
        <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-50">Doctor Prescription Report</h1>
        <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">View prescriptions, send to pharmacy for medicine fulfillment. Pharmacy will see it in their panel.</p>
      </div>

      {message.text && (
        <div className={`rounded-lg px-4 py-3 text-sm ${message.type === "error" ? "bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-300 border border-red-200" : "bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-300 border border-emerald-200"}`}>
          {message.text}
        </div>
      )}

      {pharmacies.length > 0 && (
        <div className="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-4 shadow-sm">
          <h2 className="text-sm font-semibold text-zinc-900 dark:text-zinc-50 mb-2">Pharmacy details (for sending prescriptions)</h2>
          <p className="text-xs text-zinc-500 dark:text-zinc-400 mb-3">Use &quot;Send to pharmacy&quot; on a prescription to assign it. The pharmacy will see it in their panel and can prepare the medicine.</p>
          <div className="flex flex-wrap gap-4">
            {pharmacies.slice(0, 6).map((ph) => (
              <div key={ph._id || ph.id} className="min-w-[200px] p-3 rounded-lg bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-200 dark:border-zinc-700">
                <p className="font-medium text-zinc-900 dark:text-zinc-50">{ph.name}</p>
                {ph.address && <p className="text-xs text-zinc-600 dark:text-zinc-400 mt-0.5">{ph.address}</p>}
                {ph.phone && <p className="text-xs text-zinc-500 dark:text-zinc-500 mt-0.5">Phone: {ph.phone}</p>}
              </div>
            ))}
          </div>
        </div>
      )}
      {!loading && pharmacies.length === 0 && (
        <p className="text-sm text-zinc-500 dark:text-zinc-400">Pharmacy list is loaded for hospital admin. If you don’t see pharmacies, ask your admin to add pharmacies in the admin panel; then you can send prescriptions here.</p>
      )}

      <div className="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-4 shadow-sm">
        <h2 className="text-sm font-semibold text-zinc-900 dark:text-zinc-50 mb-3">Filters</h2>
        <div className="flex flex-wrap gap-4 items-end">
          <div>
            <label className="block text-xs font-medium text-zinc-500 dark:text-zinc-400 mb-1">Patient</label>
            <select value={filter.patientId} onChange={(e) => setFilter((f) => ({ ...f, patientId: e.target.value }))} className="rounded-lg border border-zinc-300 dark:border-zinc-600 bg-white dark:bg-zinc-800 px-3 py-2 text-sm text-zinc-900 dark:text-zinc-50 min-w-[180px]">
              <option value="">All patients</option>
              {patients.map((p) => (
                <option key={p._id || p.id} value={p._id || p.id}>{p.name}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-zinc-500 dark:text-zinc-400 mb-1">Doctor</label>
            <select value={filter.doctorId} onChange={(e) => setFilter((f) => ({ ...f, doctorId: e.target.value }))} className="rounded-lg border border-zinc-300 dark:border-zinc-600 bg-white dark:bg-zinc-800 px-3 py-2 text-sm text-zinc-900 dark:text-zinc-50 min-w-[180px]">
              <option value="">All doctors</option>
              {doctors.map((d) => (
                <option key={d._id || d.id} value={d._id || d.id}>Dr. {d.name}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-zinc-500 dark:text-zinc-400 mb-1">From date</label>
            <input type="date" value={filter.fromDate} onChange={(e) => setFilter((f) => ({ ...f, fromDate: e.target.value }))} className="rounded-lg border border-zinc-300 dark:border-zinc-600 bg-white dark:bg-zinc-800 px-3 py-2 text-sm text-zinc-900 dark:text-zinc-50" />
          </div>
          <div>
            <label className="block text-xs font-medium text-zinc-500 dark:text-zinc-400 mb-1">To date</label>
            <input type="date" value={filter.toDate} onChange={(e) => setFilter((f) => ({ ...f, toDate: e.target.value }))} className="rounded-lg border border-zinc-300 dark:border-zinc-600 bg-white dark:bg-zinc-800 px-3 py-2 text-sm text-zinc-900 dark:text-zinc-50" />
          </div>
          <button type="button" onClick={applyFilter} className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700">
            Apply
          </button>
          <button type="button" onClick={fetchData} className="rounded-lg border border-zinc-300 dark:border-zinc-600 px-4 py-2 text-sm font-medium text-zinc-700 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-800">
            Reset
          </button>
        </div>
      </div>

      <div className="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 shadow-sm overflow-hidden">
        <div className="p-4 border-b border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-800/50">
          <h2 className="font-semibold text-zinc-900 dark:text-zinc-50">Prescriptions ({filteredList.length})</h2>
        </div>
        <div className="overflow-x-auto">
          {loading ? (
            <div className="p-8 text-center text-zinc-500">Loading…</div>
          ) : filteredList.length === 0 ? (
            <div className="p-8 text-center text-zinc-500">No prescriptions found. Use filters or ensure backend has prescription data.</div>
          ) : (
            <table className="min-w-full divide-y divide-zinc-200 dark:divide-zinc-700">
              <thead className="bg-zinc-50 dark:bg-zinc-800/50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-zinc-600 dark:text-zinc-400 uppercase">Date</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-zinc-600 dark:text-zinc-400 uppercase">Patient</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-zinc-600 dark:text-zinc-400 uppercase">Doctor</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-zinc-600 dark:text-zinc-400 uppercase">Items</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-zinc-600 dark:text-zinc-400 uppercase">Pharmacy</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-zinc-600 dark:text-zinc-400 uppercase">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-200 dark:divide-zinc-700">
                {filteredList.map((p) => {
                  const patientName = p.patient?.name || p.patientName || getPatientName(p.patientId);
                  const doctorName = p.doctor?.name || p.doctorName || getDoctorName(p.doctorId);
                  return (
                  <tr key={p._id || p.id} className="hover:bg-zinc-50 dark:hover:bg-zinc-800/50">
                    <td className="px-4 py-3 text-sm text-zinc-600 dark:text-zinc-400">
                      {p.createdAt ? new Date(p.createdAt).toLocaleDateString() : (p.date ? new Date(p.date).toLocaleDateString() : "—")}
                    </td>
                    <td className="px-4 py-3 text-sm font-medium text-zinc-900 dark:text-zinc-50">{patientName}</td>
                    <td className="px-4 py-3 text-sm text-zinc-600 dark:text-zinc-400">Dr. {doctorName}</td>
                    <td className="px-4 py-3 text-sm text-zinc-600 dark:text-zinc-400">{(p.items && p.items.length) || 0} medicine(s)</td>
                    <td className="px-4 py-3 text-sm text-zinc-500 dark:text-zinc-400">
                      {p.pharmacyId ? (pharmacies.find((ph) => (ph._id || ph.id) === p.pharmacyId)?.name || "Assigned") : "—"}
                    </td>
                    <td className="px-4 py-3 flex gap-2">
                      <button type="button" onClick={() => setSelectedPrescription(p)} className="text-sm text-emerald-600 dark:text-emerald-400 hover:underline">
                        View
                      </button>
                      {(!p.pharmacyId || !p.pharmacyId.length) && pharmacies.length > 0 && (
                        <button type="button" onClick={() => setSendToPharmacyModal(p)} className="text-sm text-blue-600 dark:text-blue-400 hover:underline">
                          Send to pharmacy
                        </button>
                      )}
                    </td>
                  </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {selectedPrescription && (() => {
        const sp = selectedPrescription;
        const patientName = sp.patient?.name || sp.patientName || getPatientName(sp.patientId);
        const doctorName = sp.doctor?.name || sp.doctorName || getDoctorName(sp.doctorId);
        const patient = sp.patient || getPatient(sp.patientId);
        const doctor = sp.doctor || getDoctor(sp.doctorId);
        return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50" onClick={() => setSelectedPrescription(null)}>
          <div className="bg-white dark:bg-zinc-900 rounded-2xl shadow-xl border border-zinc-200 dark:border-zinc-800 max-w-lg w-full max-h-[90vh] overflow-y-auto p-6" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-lg font-bold text-zinc-900 dark:text-zinc-50">Prescription details</h3>
            <div className="mt-3 p-3 rounded-lg bg-zinc-50 dark:bg-zinc-800/50 space-y-1 text-sm">
              <p><strong>Patient:</strong> {patientName}{patient?.phone ? ` · ${patient.phone}` : ""}{patient?.age != null ? ` · Age ${patient.age}` : ""}</p>
              <p><strong>Doctor:</strong> Dr. {doctorName}{doctor?.specialization ? ` (${doctor.specialization})` : ""}</p>
              <p><strong>Date:</strong> {sp.createdAt ? new Date(sp.createdAt).toLocaleString() : (sp.date ? new Date(sp.date).toLocaleString() : "—")}</p>
              {sp.diagnosis && <p><strong>Diagnosis:</strong> {sp.diagnosis}</p>}
              {sp.notes && <p><strong>Notes:</strong> {sp.notes}</p>}
            </div>
            <h4 className="mt-4 font-semibold text-zinc-900 dark:text-zinc-50">Medicines</h4>
            <div className="mt-2 space-y-2">
              {sp.items && sp.items.length > 0 ? (
                sp.items.map((item, idx) => {
                  const name = item.medicineName || item.name || item.medicine || "Medicine";
                  const qty = item.quantity ?? item.qty ?? "";
                  const dosage = item.dosage ?? item.dose ?? "";
                  const freq = item.frequency ?? item.frequencyInDay ?? "";
                  const duration = item.duration ?? item.days ?? "";
                  return (
                  <div key={idx} className="p-3 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800/50 text-sm">
                    <p className="font-semibold text-zinc-900 dark:text-zinc-50">{name}</p>
                    <div className="mt-1 flex flex-wrap gap-x-4 gap-y-0 text-zinc-600 dark:text-zinc-400">
                      {qty && <span>Qty: {qty}</span>}
                      {dosage && <span>Dosage: {dosage}</span>}
                      {freq && <span>Frequency: {freq}</span>}
                      {duration && <span>Duration: {duration}</span>}
                    </div>
                    {item.notes && <p className="mt-1 text-zinc-500">{item.notes}</p>}
                  </div>
                  );
                })
              ) : (
                <p className="text-zinc-500 text-sm">No items.</p>
              )}
            </div>
            {pharmacies.length > 0 && !selectedPrescription.pharmacyId && (
              <div className="mt-4 pt-4 border-t border-zinc-200 dark:border-zinc-700">
                <p className="text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2">Send to pharmacy (for medicine)</p>
                <select
                  id="pharmacy-select-modal"
                  className="w-full rounded-lg border border-zinc-300 dark:border-zinc-600 bg-white dark:bg-zinc-800 px-3 py-2 text-sm text-zinc-900 dark:text-zinc-50 mb-2"
                >
                  <option value="">Select pharmacy</option>
                  {pharmacies.map((ph) => (
                    <option key={ph._id || ph.id} value={ph._id || ph.id}>{ph.name} {ph.address ? `— ${ph.address}` : ""}</option>
                  ))}
                </select>
                <button
                  type="button"
                  onClick={() => {
                    const sel = document.getElementById("pharmacy-select-modal");
                    const pharmacyId = sel?.value;
                    if (pharmacyId) sendPrescriptionToPharmacy(selectedPrescription._id || selectedPrescription.id, pharmacyId);
                    else setMessage({ type: "error", text: "Select a pharmacy" });
                  }}
                  disabled={sendingToPharmacy}
                  className="w-full rounded-lg bg-blue-600 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
                >
                  {sendingToPharmacy ? "Sending…" : "Send to pharmacy"}
                </button>
              </div>
            )}
            <button type="button" onClick={() => setSelectedPrescription(null)} className="mt-4 w-full rounded-lg border border-zinc-300 dark:border-zinc-600 py-2.5 text-sm font-medium text-zinc-700 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-800">
              Close
            </button>
          </div>
        </div>
        );
      })()}

      {sendToPharmacyModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50" onClick={() => !sendingToPharmacy && setSendToPharmacyModal(null)}>
          <div className="bg-white dark:bg-zinc-900 rounded-2xl shadow-xl border border-zinc-200 dark:border-zinc-800 max-w-md w-full p-6" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-lg font-bold text-zinc-900 dark:text-zinc-50">Send prescription to pharmacy</h3>
            <p className="mt-1 text-sm text-zinc-500">Patient: {getPatientName(sendToPharmacyModal.patientId)}. Select pharmacy to assign. They will see it in their panel for medicine fulfillment.</p>
            <div className="mt-4">
              <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2">Pharmacy</label>
              <select id="send-pharmacy-select" className="w-full rounded-lg border border-zinc-300 dark:border-zinc-600 bg-white dark:bg-zinc-800 px-4 py-2 text-zinc-900 dark:text-zinc-50">
                <option value="">Select pharmacy</option>
                {pharmacies.map((ph) => (
                  <option key={ph._id || ph.id} value={ph._id || ph.id}>
                    {ph.name} {ph.phone ? ` — ${ph.phone}` : ""} {ph.address ? ` — ${ph.address}` : ""}
                  </option>
                ))}
              </select>
            </div>
            <div className="mt-6 flex gap-2">
              <button type="button" onClick={() => setSendToPharmacyModal(null)} disabled={sendingToPharmacy} className="flex-1 rounded-lg border border-zinc-300 dark:border-zinc-600 py-2.5 text-sm font-medium text-zinc-700 dark:text-zinc-300">
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  const sel = document.getElementById("send-pharmacy-select");
                  const pharmacyId = sel?.value;
                  if (!pharmacyId) { setMessage({ type: "error", text: "Select a pharmacy" }); return; }
                  sendPrescriptionToPharmacy(sendToPharmacyModal._id || sendToPharmacyModal.id, pharmacyId);
                }}
                disabled={sendingToPharmacy}
                className="flex-1 rounded-lg bg-blue-600 py-2.5 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-50"
              >
                {sendingToPharmacy ? "Sending…" : "Send to pharmacy"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
