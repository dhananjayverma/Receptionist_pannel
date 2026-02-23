"use client";

import { useState, useEffect } from "react";
import { buildApiUrl } from "@/lib/api";
import { useAuth } from "@/components/AuthGuard";

export default function DoctorsPage() {
  const { token } = useAuth();
  const [doctors, setDoctors] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!token) return;
    fetch(buildApiUrl("/api/users/by-role/DOCTOR"), { headers: { Authorization: `Bearer ${token}` } })
      .then((r) => r.json())
      .then((data) => setDoctors(Array.isArray(data) ? data : data?.doctors || []))
      .catch(() => setDoctors([]))
      .finally(() => setLoading(false));
  }, [token]);

  return (
    <div>
      <h1 className="page-title mb-2">Doctors</h1>
      <p className="page-desc mb-6">View available doctors. Working hours and availability are managed in the admin panel.</p>

      <div className="card overflow-hidden">
        {loading ? (
          <div className="p-10 text-center text-gray-500">Loading…</div>
        ) : doctors.length === 0 ? (
          <div className="p-10 text-center text-gray-500">No doctors found.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-blue-50 border-b border-blue-100">
                <tr>
                  <th className="text-left p-3 font-medium text-blue-900">Name</th>
                  <th className="text-left p-3 font-medium text-blue-900">Email</th>
                  <th className="text-left p-3 font-medium text-blue-900">Specialization</th>
                  <th className="text-left p-3 font-medium text-blue-900">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {doctors.map((d) => (
                  <tr key={d._id} className="hover:bg-blue-50/50">
                    <td className="p-3 font-medium text-gray-900">{d.name}</td>
                    <td className="p-3 text-gray-600">{d.email || "—"}</td>
                    <td className="p-3 text-gray-600">{d.specialization || "—"}</td>
                    <td className="p-3">
                      <span className="badge bg-green-100 text-green-800">Available</span>
                    </td>
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
