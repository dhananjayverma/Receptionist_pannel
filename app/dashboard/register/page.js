"use client";

import { useState } from "react";
import { buildApiUrl } from "@/lib/api";
import { savePatientProfile } from "@/lib/clinicStore";

const initialForm = {
  name: "",
  email: "",
  phone: "",
  password: "",
  age: "",
  dob: "",
  gender: "",
  address: "",
  emergencyContact: "",
  aadhaar: "",
};

export default function RegisterPatientPage() {
  const [form, setForm] = useState(initialForm);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);

  const onChange = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  const submit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setResult(null);
    try {
      const res = await fetch(buildApiUrl("/api/users/signup"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: form.name,
          email: form.email,
          phone: form.phone || undefined,
          password: form.password,
          role: "PATIENT",
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.message || "Registration failed");
      const patientId = data._id || data.id;
      savePatientProfile(patientId, {
        age: form.age,
        dob: form.dob,
        gender: form.gender,
        address: form.address,
        emergencyContact: form.emergencyContact,
        aadhaar: form.aadhaar,
      });
      setResult({ success: true, data: { ...data, patientId } });
      setForm(initialForm);
    } catch (err) {
      const msg = err.message || "Unknown error";
      const isNetwork = msg === "Failed to fetch" || err.name === "TypeError";
      setResult({
        success: false,
        message: isNetwork
          ? "Backend unreachable. Set NEXT_PUBLIC_API_BASE in .env.local and ensure the backend is running."
          : msg,
      });
    } finally {
      setLoading(false);
    }
  };

  const copyToken = () => {
    if (result?.success && result?.data?.token) {
      navigator.clipboard.writeText(result.data.token);
      alert("Token copied.");
    }
  };

  const patientIdShort = result?.success && result?.data?.patientId
    ? String(result.data.patientId).slice(-8).toUpperCase()
    : "";

  return (
    <div className="max-w-2xl">
      <h1 className="page-title mb-2">Add New Patient</h1>
      <p className="page-desc mb-6">Register walk-in patients. Patient ID is auto-generated.</p>

      <div className="card p-6">
        <form onSubmit={submit} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="sm:col-span-2">
              <label className="label">Full Name *</label>
              <input name="name" value={form.name} onChange={onChange} required className="input" placeholder="Full name" />
            </div>
            <div>
              <label className="label">Age</label>
              <input name="age" type="number" min="0" max="150" value={form.age} onChange={onChange} className="input" placeholder="Years" />
            </div>
            <div>
              <label className="label">Date of Birth</label>
              <input name="dob" type="date" value={form.dob} onChange={onChange} className="input" />
            </div>
            <div>
              <label className="label">Gender</label>
              <select name="gender" value={form.gender} onChange={onChange} className="input">
                <option value="">Select</option>
                <option value="Male">Male</option>
                <option value="Female">Female</option>
                <option value="Other">Other</option>
              </select>
            </div>
            <div>
              <label className="label">Phone Number *</label>
              <input name="phone" type="tel" value={form.phone} onChange={onChange} className="input" placeholder="10-digit mobile" />
            </div>
            <div className="sm:col-span-2">
              <label className="label">Address</label>
              <input name="address" value={form.address} onChange={onChange} className="input" placeholder="Full address" />
            </div>
            <div>
              <label className="label">Emergency Contact</label>
              <input name="emergencyContact" type="tel" value={form.emergencyContact} onChange={onChange} className="input" placeholder="Phone number" />
            </div>
            <div>
              <label className="label">Aadhaar / ID (optional)</label>
              <input name="aadhaar" value={form.aadhaar} onChange={onChange} className="input" placeholder="Last 4 digits or full" />
            </div>
            <div>
              <label className="label">Email *</label>
              <input name="email" type="email" value={form.email} onChange={onChange} required className="input" placeholder="For login / records" />
            </div>
            <div>
              <label className="label">Password *</label>
              <input name="password" type="password" value={form.password} onChange={onChange} required className="input" placeholder="Min 6 characters" />
            </div>
          </div>
          <div className="flex gap-3 pt-2">
            <button type="submit" disabled={loading} className="btn-primary">
              {loading ? "Registering…" : "Add Patient"}
            </button>
            <button type="button" onClick={() => setForm(initialForm)} className="btn-secondary">
              Reset
            </button>
          </div>
        </form>

        {result && (
          <div className={`mt-6 p-4 rounded-lg border ${result.success ? "bg-blue-50 border-blue-200 text-blue-900" : "bg-red-50 border-red-200 text-red-800"}`}>
            {result.success ? (
              <div>
                <p className="font-semibold">Patient registered</p>
                <p className="text-sm mt-1">{result.data.name} – {result.data.email}</p>
                {patientIdShort && <p className="text-sm mt-1"><span className="text-gray-600">Patient ID:</span> <strong>{patientIdShort}</strong></p>}
                {result.data.token && (
                  <div className="mt-3">
                    <p className="text-xs text-gray-600 mb-1">Auth token (for billing):</p>
                    <div className="flex gap-2 items-center">
                      <code className="text-xs bg-white border border-gray-200 px-2 py-1.5 rounded flex-1 truncate">{result.data.token}</code>
                      <button type="button" onClick={copyToken} className="btn-secondary text-sm py-1.5 px-3">Copy</button>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <p>{result.message}</p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
