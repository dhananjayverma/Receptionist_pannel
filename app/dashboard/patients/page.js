"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { buildApiUrl } from "@/lib/api";
import { useAuth } from "@/components/AuthGuard";
import { getPatientProfile } from "@/lib/clinicStore";

export default function PatientsPage() {
  const { token } = useAuth();
  const [patients, setPatients] = useState([]);
  const [appointments, setAppointments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [searchBy, setSearchBy] = useState("name");
  const [selectedPatient, setSelectedPatient] = useState(null);
  const [visitHistory, setVisitHistory] = useState([]);

  useEffect(() => {
    if (!token) return;
    Promise.all([
      fetch(buildApiUrl("/api/users?role=PATIENT"), { headers: { Authorization: `Bearer ${token}` } }),
      fetch(buildApiUrl("/api/appointments"), { headers: { Authorization: `Bearer ${token}` } }),
    ])
      .then(([uRes, aRes]) => {
        const u = uRes.ok ? uRes.json() : Promise.resolve([]);
        const a = aRes.ok ? aRes.json() : Promise.resolve([]);
        return Promise.all([u, a]);
      })
      .then(([userList, aptList]) => {
        setPatients(Array.isArray(userList) ? userList : userList?.users || []);
        setAppointments(Array.isArray(aptList) ? aptList : aptList?.appointments || []);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [token]);

  useEffect(() => {
    if (!selectedPatient) {
      setVisitHistory([]);
      return;
    }
    const history = appointments.filter((a) => String(a.patientId) === String(selectedPatient._id));
    setVisitHistory(history.sort((a, b) => new Date(b.scheduledAt) - new Date(a.scheduledAt)));
  }, [selectedPatient, appointments]);

  const filtered = patients.filter((p) => {
    if (!search.trim()) return true;
    const q = search.toLowerCase().trim();
    const id = String(p._id || "").slice(-8).toUpperCase();
    const name = (p.name || "").toLowerCase();
    const phone = String(p.phone || "").replace(/\D/g, "");
    const searchNum = q.replace(/\D/g, "");
    if (searchBy === "name") return name.includes(q);
    if (searchBy === "phone") return phone.includes(searchNum) || (p.phone || "").includes(q);
    if (searchBy === "id") return id.includes(q.toUpperCase()) || (p._id || "").toLowerCase().includes(q);
    return name.includes(q) || phone.includes(searchNum) || id.includes(q.toUpperCase());
  });

  return (
    <div>
      <h1 className="page-title mb-2">Patients</h1>
      <p className="page-desc mb-6">Search by name, phone or patient ID. View visit history.</p>

      <div className="card p-4 mb-4">
        <div className="flex flex-wrap gap-3 items-end">
          <div className="flex-1 min-w-[200px]">
            <label className="label">Search</label>
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={searchBy === "name" ? "Patient name" : searchBy === "phone" ? "Phone number" : "Patient ID"}
              className="input"
            />
          </div>
          <div className="w-32">
            <label className="label">By</label>
            <select value={searchBy} onChange={(e) => setSearchBy(e.target.value)} className="input">
              <option value="name">Name</option>
              <option value="phone">Phone</option>
              <option value="id">Patient ID</option>
            </select>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 card overflow-hidden">
          {loading ? (
            <div className="p-8 text-center text-gray-500">Loading…</div>
          ) : filtered.length === 0 ? (
            <div className="p-8 text-center text-gray-500">No patients found.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-blue-50 border-b border-blue-100">
                  <tr>
                    <th className="text-left p-3 font-medium text-blue-900">ID</th>
                    <th className="text-left p-3 font-medium text-blue-900">Name</th>
                    <th className="text-left p-3 font-medium text-blue-900">Phone</th>
                    <th className="text-left p-3 font-medium text-blue-900">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {filtered.map((p) => (
                    <tr
                      key={p._id}
                      className={`hover:bg-blue-50/50 ${selectedPatient?._id === p._id ? "bg-blue-50" : ""}`}
                    >
                      <td className="p-3 font-mono text-gray-600">{String(p._id).slice(-8).toUpperCase()}</td>
                      <td className="p-3 font-medium text-gray-900">{p.name}</td>
                      <td className="p-3 text-gray-600">{p.phone || p.email || "—"}</td>
                      <td className="p-3">
                        <button type="button" onClick={() => setSelectedPatient(p)} className="text-blue-600 hover:underline text-xs font-medium">History</button>
                        {" · "}
                        <Link href={`/dashboard/appointments?patient=${p._id}`} className="text-blue-600 hover:underline text-xs font-medium">Book</Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
        <div className="card p-4">
          <h3 className="font-semibold text-gray-900 mb-3">Visit History</h3>
          {!selectedPatient ? (
            <p className="text-sm text-gray-500">Select a patient to see visit history.</p>
          ) : (
            <>
              <p className="text-sm text-gray-600 mb-2">{selectedPatient.name}</p>
              {visitHistory.length === 0 ? (
                <p className="text-sm text-gray-500">No visits yet.</p>
              ) : (
                <ul className="space-y-2">
                  {visitHistory.slice(0, 10).map((apt) => (
                    <li key={apt._id} className="text-sm border-b border-gray-100 pb-2">
                      <span className="text-gray-500">{new Date(apt.scheduledAt).toLocaleDateString()}</span>
                      <span className="mx-2">·</span>
                      <span className="text-gray-700">{apt.issue || "—"}</span>
                      <span className="badge bg-blue-100 text-blue-800 ml-1">{apt.status || "—"}</span>
                    </li>
                  ))}
                </ul>
              )}
              <Link href={`/dashboard/appointments?patient=${selectedPatient._id}`} className="inline-block mt-3 text-sm text-blue-600 hover:underline font-medium">
                Book appointment →
              </Link>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
