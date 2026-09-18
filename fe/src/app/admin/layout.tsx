"use client";

import { AdminSidebar } from "@/components/admin/AdminSidebar";

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-[#f8fafc]">
      <AdminSidebar />
      <main className="min-h-screen transition-all duration-300 lg:ml-72">
        {children}
      </main>
    </div>
  );
}
