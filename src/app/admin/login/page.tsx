import type { Metadata } from "next";

import { AdminLoginForm } from "./login-form";

export const metadata: Metadata = {
  title: "Admin — DoctorY",
  robots: { index: false, follow: false },
};

export default function AdminLoginPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-6">
      <AdminLoginForm />
    </div>
  );
}
