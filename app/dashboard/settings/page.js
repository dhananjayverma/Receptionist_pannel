"use client";

import { useState, useEffect } from "react";
import { getSettings, saveSettings, resetTokenDaily } from "@/lib/clinicStore";

export default function SettingsPage() {
  const [consultationFee, setConsultationFee] = useState(200);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    const s = getSettings();
    setConsultationFee(s.consultationFee ?? 200);
  }, []);

  const handleSave = () => {
    saveSettings({ consultationFee: Number(consultationFee) || 200, currency: "INR" });
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const handleTokenReset = () => {
    if (confirm("Reset token number for today? Next appointment will get token #1.")) {
      resetTokenDaily();
      alert("Token counter reset.");
    }
  };

  return (
    <div>
      <h1 className="page-title mb-2">Clinic Settings</h1>
      <p className="page-desc mb-6">Consultation fee default, token reset (daily).</p>

      <div className="card p-6 max-w-lg space-y-6">
        <div>
          <label className="label">Default consultation fee (₹)</label>
          <input
            type="number"
            min={0}
            value={consultationFee}
            onChange={(e) => setConsultationFee(e.target.value)}
            className="input w-32"
          />
          <p className="text-xs text-gray-500 mt-1">Used as default in Billing page.</p>
        </div>
        <button type="button" onClick={handleSave} className="btn-primary">
          Save
        </button>
        {saved && <span className="text-green-600 text-sm ml-2">Saved.</span>}

        <div className="border-t border-gray-200 pt-6">
          <h3 className="font-medium text-gray-900 mb-2">Token number</h3>
          <p className="text-sm text-gray-600 mb-2">Token resets automatically each day. To manually reset (e.g. start of day):</p>
          <button type="button" onClick={handleTokenReset} className="btn-secondary">
            Reset token counter for today
          </button>
        </div>
      </div>
    </div>
  );
}
