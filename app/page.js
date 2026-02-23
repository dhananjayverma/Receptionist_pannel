"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

export default function Home() {
  const router = useRouter();

  useEffect(() => {
    if (typeof window === "undefined") return;
    const token = localStorage.getItem("recption_token");
    if (token) router.replace("/dashboard");
  }, [router]);

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-[var(--bg-page)] px-4 py-12">
      <div className="text-center max-w-md">
        <h1 className="text-3xl font-bold text-blue-900 mb-2">Receptionist</h1>
        <p className="text-gray-600 mb-8">Manage walk-in patients, queue, appointments and billing.</p>
        <Link href="/login" className="btn-primary inline-flex items-center justify-center px-8 py-3 text-base">
          Sign in
        </Link>
      </div>
    </div>
  );
}
