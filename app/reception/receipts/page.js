"use client";

import { useState, useEffect } from "react";
import { toast } from "react-toastify";
import SuccessModal from "../../components/SuccessModal";

export default function ReceiptsPage() {
  const [receiptId, setReceiptId] = useState("");
  const [storedReceipts, setStoredReceipts] = useState([]);
  const [successModal, setSuccessModal] = useState({ open: false, title: "", message: "" });

  useEffect(() => {
    try {
      const s = localStorage.getItem("reception_receipts");
      setStoredReceipts(s ? JSON.parse(s) : []);
    } catch (e) {}
  }, []);

  function printReceipt(receipt) {
    if (!receipt) return;
    const w = window.open("", "_blank");
    w.document.write(`
      <!DOCTYPE html><html><head><title>Receipt ${receipt.id}</title></head><body style="font-family:sans-serif;padding:24px;max-width:400px;">
        <h2>OPD Receipt</h2>
        <p><strong>Receipt:</strong> ${receipt.id}</p>
        <p><strong>Date:</strong> ${receipt.date ? new Date(receipt.date).toLocaleString() : ""}</p>
        <p><strong>Patient:</strong> ${receipt.patientName || "—"}</p>
        <hr/>
        <p>Consultation: ₹${receipt.consultationFee || 0}</p>
        <p>Registration: ₹${receipt.registrationFee || 0}</p>
        ${(receipt.followUpFee || 0) > 0 ? `<p>Follow-up: ₹${receipt.followUpFee}</p>` : ""}
        <p><strong>Total: ₹${receipt.total || 0}</strong></p>
        <p>Payment: ${receipt.paymentMode || "—"}</p>
        <hr/>
        <p style="font-size:12px;color:#666;">Thank you.</p>
      </body></html>
    `);
    w.document.close();
    w.print();
    w.close();
  }

  function handleReprint() {
    if (!receiptId.trim()) {
      toast.error("Enter receipt ID");
      return;
    }
    const found = storedReceipts.find((r) => (r.id || "").toString() === receiptId.trim());
    if (found) {
      printReceipt(found);
      setSuccessModal({ open: true, title: "Reprint", message: "Receipt print window opened. Use Print or Save as PDF." });
    } else {
      toast.error("Receipt not found. Use a receipt ID from OPD & Billing (e.g. RCP-...).");
    }
  }

  return (
    <div className="space-y-6">
      <SuccessModal open={successModal.open} title={successModal.title} message={successModal.message} onClose={() => setSuccessModal({ open: false, title: "", message: "" })} />
      <div>
        <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-50">Receipts</h1>
        <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">Reprint OPD receipts by ID (from OPD & Billing) or use list below</p>
      </div>

      <div className="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-6 shadow-sm max-w-md">
        <h2 className="font-semibold text-zinc-900 dark:text-zinc-50 mb-4">Reprint receipt</h2>
        <p className="text-sm text-zinc-500 dark:text-zinc-400 mb-4">Enter receipt ID (e.g. RCP-1234567890) to reprint. Receipts are generated on the OPD & Billing page.</p>
        <div className="flex gap-2">
          <input
            type="text"
            value={receiptId}
            onChange={(e) => setReceiptId(e.target.value)}
            placeholder="RCP-..."
            className="flex-1 rounded-lg border border-zinc-300 dark:border-zinc-600 bg-white dark:bg-zinc-800 px-4 py-2 text-zinc-900 dark:text-zinc-50 placeholder:text-zinc-400 focus:ring-2 focus:ring-emerald-500"
          />
          <button type="button" onClick={handleReprint} className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700">
            Reprint
          </button>
        </div>
      </div>

      {storedReceipts.length > 0 && (
        <div className="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-6 shadow-sm">
          <h2 className="font-semibold text-zinc-900 dark:text-zinc-50 mb-2">Recent receipts (reprint)</h2>
          <ul className="space-y-2 max-h-48 overflow-y-auto">
            {storedReceipts.slice(-20).reverse().map((r, i) => (
              <li key={i} className="flex justify-between items-center text-sm py-2 border-b border-zinc-100 dark:border-zinc-800 last:border-0">
                <span className="text-zinc-700 dark:text-zinc-300">{r.id} — {r.patientName} — ₹{r.total}</span>
                <button type="button" onClick={() => { setReceiptId(r.id); printReceipt(r); setSuccessModal({ open: true, title: "Reprint", message: "Receipt print window opened." }); }} className="text-emerald-600 dark:text-emerald-400 hover:underline text-xs">
                  Reprint
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-6 shadow-sm max-w-md">
        <h2 className="font-semibold text-zinc-900 dark:text-zinc-50 mb-2">Download invoice</h2>
        <p className="text-sm text-zinc-500 dark:text-zinc-400">Connect to your backend payment/invoice API to list and download invoices here.</p>
      </div>
    </div>
  );
}
