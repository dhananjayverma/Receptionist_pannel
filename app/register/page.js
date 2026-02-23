"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function RegisterRedirect() {
  const router = useRouter();
  useEffect(() => { router.replace("/dashboard/register"); }, [router]);
  return null;
}
