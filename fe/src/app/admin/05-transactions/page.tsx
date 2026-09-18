"use client";

import { Reveal, LiveDot } from "@/components/profile/wow";

const mockTransactions = [
  { id: "TXN-001", bookingId: "BKG-4421", amount: 450000, platform: 45000, provider: 405000, status: "COMPLETED", date: "2024-09-14", type: "BOOKING", providerName: "Đà Lạt Camping" },
  { id: "TXN-002", bookingId: "BKG-3398", amount: 280000, platform: 28000, provider: 252000, status: "COMPLETED", date: "2024-09-14", type: "BOOKING", providerName: "Thuê xe máy SG" },
  { id: "TXN-003", bookingId: "BKG-2256", amount: 850000, platform: 85000, provider: -85000, status: "REFUNDED", date: "2024-09-13", type: "REFUND", providerName: "Homestay Hội An" },
  { id: "TXN-004", bookingId: "BKG-1198", amount: 1200000, platform: 120000, provider: 1080000, status: "COMPLETED", date: "2024-09-13", type: "BOOKING", providerName: "Tour biển" },
  { id: "TXN-005", bookingId: "BKG-887", amount: 150000, platform: 15000, provider: 135000, status: "PENDING", date: "2024-09-12", type: "BOOKING", providerName: "Thuê xe đạp PQ" },
];

const statusColors: Record<string, { bg: string; text: string }> = {
  COMPLETED: { bg: "rgba(34,197,94,0.1)", text: "#16a34a" },
  PENDING: { bg: "rgba(234,179,8,0.1)", text: "#ca8a04" },
  REFUNDED: { bg: "rgba(42,123,217,0.1)", text: "#2a7bd9" },
  FAILED: { bg: "rgba(239,68,68,0.1)", text: "#dc2626" },
};

export default function TransactionsPage() {
  return (
    <div className="p-8">
      {/* Header */}
      <div className="mb-8 flex items-start justify-between">
        <div>
          <div className="mb-1 flex items-center gap-3">
            <span className="rounded-lg bg-[#0f1729] px-2.5 py-1 text-xs font-bold uppercase tracking-wider text-white">ADMIN-05</span>
            <LiveDot label="RECONCILING" tone="blue" />
          </div>
          <h1 className="text-3xl font-bold" style={{ color: "#0f1729" }}>Transaction Oversight</h1>
          <p className="mt-1 text-sm" style={{ color: "#5a6b85" }}>Đối soát giao dịch, kiểm tra chênh lệch payout</p>
        </div>
        <div className="flex gap-2">
          <button className="inline-flex items-center gap-2 rounded-full border px-4 py-2 text-sm font-semibold transition-all hover:bg-[#f1f5fa]" style={{ borderColor: "#e2e8f3", color: "#5a6b85" }}>
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" /></svg>
            Export CSV
          </button>
          <button className="inline-flex items-center gap-2 rounded-full bg-[#2a7bd9] px-4 py-2 text-sm font-semibold text-white transition-all hover:bg-[#1e5aa8]">
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182m0-4.991v4.99" /></svg>
            Run Reconciliation
          </button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="mb-8 grid gap-4 sm:grid-cols-4">
        {[
          { label: "Total Revenue (MTD)", value: "₫2.84B", change: "+12.4%", positive: true },
          { label: "Platform Commission", value: "₫284M", change: "+12.4%", positive: true },
          { label: "Provider Payouts", value: "₫2.56B", change: "+11.8%", positive: true },
          { label: "Refund Volume", value: "₫12.8M", change: "-3.2%", positive: false },
        ].map((card) => (
          <Reveal key={card.label}>
            <div className="rounded-2xl border bg-white p-5" style={{ borderColor: "#e2e8f3" }}>
              <div className="text-xs font-medium" style={{ color: "#5a6b85" }}>{card.label}</div>
              <div className="mt-2 text-2xl font-bold tabular-nums" style={{ color: "#0f1729" }}>{card.value}</div>
              <div className="mt-1 text-xs font-semibold" style={{ color: card.positive ? "#16a34a" : "#dc2626" }}>
                {card.change} vs last month
              </div>
            </div>
          </Reveal>
        ))}
      </div>

      {/* Reconciliation Status */}
      <div className="mb-8 grid gap-4 sm:grid-cols-3">
        <div className="rounded-2xl border bg-gradient-to-br from-[#f0fdf4] to-white p-5" style={{ borderColor: "#bbf7d0" }}>
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#16a34a] text-white">
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
            </div>
            <div>
              <div className="text-lg font-bold" style={{ color: "#16a34a" }}>Matched</div>
              <div className="text-2xl font-bold" style={{ color: "#0f1729" }}>1,247 transactions</div>
            </div>
          </div>
        </div>
        <div className="rounded-2xl border bg-gradient-to-br from-[#fefce8] to-white p-5" style={{ borderColor: "#fef08a" }}>
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#ca8a04] text-white">
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126z" /></svg>
            </div>
            <div>
              <div className="text-lg font-bold" style={{ color: "#ca8a04" }}>Pending Review</div>
              <div className="text-2xl font-bold" style={{ color: "#0f1729" }}>12 transactions</div>
            </div>
          </div>
        </div>
        <div className="rounded-2xl border bg-gradient-to-br from-[#fef2f2] to-white p-5" style={{ borderColor: "#fecaca" }}>
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#dc2626] text-white">
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" /></svg>
            </div>
            <div>
              <div className="text-lg font-bold" style={{ color: "#dc2626" }}>Mismatch</div>
              <div className="text-2xl font-bold" style={{ color: "#0f1729" }}>3 transactions</div>
            </div>
          </div>
        </div>
      </div>

      {/* Transactions Table */}
      <Reveal delay={100}>
        <div className="overflow-hidden rounded-2xl border" style={{ borderColor: "#e2e8f3" }}>
          <table className="w-full">
            <thead>
              <tr style={{ background: "#f8fafc" }}>
                <th className="px-6 py-4 text-left text-xs font-bold uppercase tracking-wider" style={{ color: "#5a6b85" }}>Transaction</th>
                <th className="px-6 py-4 text-left text-xs font-bold uppercase tracking-wider" style={{ color: "#5a6b85" }}>Booking</th>
                <th className="px-6 py-4 text-left text-xs font-bold uppercase tracking-wider" style={{ color: "#5a6b85" }}>Provider</th>
                <th className="px-6 py-4 text-right text-xs font-bold uppercase tracking-wider" style={{ color: "#5a6b85" }}>Amount</th>
                <th className="px-6 py-4 text-right text-xs font-bold uppercase tracking-wider" style={{ color: "#5a6b85" }}>Platform Fee</th>
                <th className="px-6 py-4 text-right text-xs font-bold uppercase tracking-wider" style={{ color: "#5a6b85" }}>Provider Payout</th>
                <th className="px-6 py-4 text-center text-xs font-bold uppercase tracking-wider" style={{ color: "#5a6b85" }}>Status</th>
              </tr>
            </thead>
            <tbody className="divide-y" style={{ borderColor: "#e2e8f3" }}>
              {mockTransactions.map((txn) => (
                <tr key={txn.id} className="bg-white transition-colors hover:bg-[#f8fafc]">
                  <td className="px-6 py-4">
                    <div className="flex flex-col gap-1">
                      <span className="font-semibold" style={{ color: "#0f1729" }}>{txn.id}</span>
                      <span className="text-xs" style={{ color: "#8694ad" }}>{txn.date}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span className="rounded-lg bg-[#f1f5fa] px-2 py-1 text-xs font-medium" style={{ color: "#5a6b85" }}>{txn.bookingId}</span>
                  </td>
                  <td className="px-6 py-4">
                    <span className="text-sm">{txn.providerName}</span>
                  </td>
                  <td className="px-6 py-4 text-right font-bold tabular-nums" style={{ color: "#0f1729" }}>
                    {txn.amount.toLocaleString("vi-VN")}đ
                  </td>
                  <td className="px-6 py-4 text-right tabular-nums" style={{ color: "#2a7bd9" }}>
                    {txn.platform.toLocaleString("vi-VN")}đ
                  </td>
                  <td className={`px-6 py-4 text-right font-bold tabular-nums ${txn.provider < 0 ? "text-red-500" : ""}`} style={{ color: txn.provider < 0 ? "#dc2626" : "#16a34a" }}>
                    {Math.abs(txn.provider).toLocaleString("vi-VN")}đ
                    {txn.provider < 0 && " ↩️ refund"}
                  </td>
                  <td className="px-6 py-4 text-center">
                    <span className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold" style={{ ...statusColors[txn.status], color: statusColors[txn.status].text }}>
                      {statusColors[txn.status].text === "#16a34a" && "✓"}
                      {statusColors[txn.status].text === "#ca8a04" && "⏳"}
                      {statusColors[txn.status].text === "#2a7bd9" && "↩️"}
                      {txn.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Reveal>
    </div>
  );
}
