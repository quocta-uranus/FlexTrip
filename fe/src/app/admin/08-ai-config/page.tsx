"use client";

import { useState } from "react";
import { Reveal, LiveDot } from "@/components/profile/wow";

const configGroups = [
  {
    id: "fraud",
    name: "Fraud Detection",
    icon: "🛡️",
    configs: [
      { id: "fraud_threshold", label: "Fraud Score Threshold", value: 75, min: 0, max: 100, unit: "%", description: "Block transactions with fraud score above this threshold" },
      { id: "velocity_limit", label: "Velocity Limit", value: 5, min: 1, max: 20, unit: "books/day", description: "Max bookings per user per day before flagging" },
      { id: "chargeback_window", label: "Chargeback Window", value: 30, min: 7, max: 90, unit: "days", description: "Days to investigate chargebacks after transaction" },
    ],
  },
  {
    id: "moderation",
    name: "Content Moderation",
    icon: "🔍",
    configs: [
      { id: "nsfw_threshold", label: "NSFW Detection Sensitivity", value: 60, min: 0, max: 100, unit: "%", description: "AI sensitivity for inappropriate content detection" },
      { id: "fake_listing_score", label: "Fake Listing Score", value: 70, min: 0, max: 100, unit: "%", description: "Threshold to auto-flag suspicious listings" },
      { id: "auto_hide_days", label: "Auto-Hide Pending Days", value: 48, min: 12, max: 168, unit: "hours", description: "Hours before auto-hiding flagged content" },
    ],
  },
  {
    id: "policies",
    name: "Operational Policies",
    icon: "📋",
    configs: [
      { id: "cancel_window", label: "Cancellation Window", value: 7, min: 1, max: 14, unit: "days", description: "Days before check-in to allow free cancellation" },
      { id: "high_value_threshold", label: "High Value Threshold", value: 2000000, min: 500000, max: 10000000, unit: "VND", description: "Items above this value require insurance (CONTR-05)" },
      { id: "response_time_sla", label: "Response Time SLA", value: 24, min: 1, max: 72, unit: "hours", description: "Max response time for provider to respond" },
    ],
  },
  {
    id: "commission",
    name: "Commission & Fees",
    icon: "💰",
    configs: [
      { id: "platform_fee", label: "Platform Commission Rate", value: 10, min: 1, max: 25, unit: "%", description: "Percentage taken from each transaction" },
      { id: "payout_frequency", label: "Payout Frequency", value: 7, min: 1, max: 30, unit: "days", description: "Days between provider payouts" },
      { id: "min_payout", label: "Minimum Payout", value: 100000, min: 50000, max: 500000, unit: "VND", description: "Minimum amount before payout is triggered" },
    ],
  },
];

export default function AIConfigPage() {
  const [configs, setConfigs] = useState<Record<string, number>>(
    Object.fromEntries(configGroups.flatMap(g => g.configs.map(c => [c.id, c.value])))
  );
  const [changedConfigs, setChangedConfigs] = useState<Set<string>>(new Set());
  const [saving, setSaving] = useState(false);

  function updateConfig(id: string, value: number) {
    setConfigs(prev => ({ ...prev, [id]: value }));
    setChangedConfigs(prev => new Set([...prev, id]));
  }

  async function handleSave() {
    setSaving(true);
    await new Promise(r => setTimeout(r, 1000));
    setSaving(false);
    setChangedConfigs(new Set());
  }

  return (
    <div className="p-8">
      {/* Header */}
      <div className="mb-8 flex items-start justify-between">
        <div>
          <div className="mb-1 flex items-center gap-3">
            <span className="rounded-lg bg-[#0f1729] px-2.5 py-1 text-xs font-bold uppercase tracking-wider text-white">ADMIN-08</span>
            <LiveDot label="CONFIGURING" tone="blue" />
          </div>
          <h1 className="text-3xl font-bold" style={{ color: "#0f1729" }}>AI Model Configuration</h1>
          <p className="mt-1 text-sm" style={{ color: "#5a6b85" }}>Điều chỉnh ngưỡng cảnh báo gian lận, độ nhạy kiểm duyệt AI, và ngưỡng chính sách vận hành</p>
        </div>
        <div className="flex items-center gap-2">
          <button className="inline-flex items-center gap-2 rounded-full border px-4 py-2 text-sm font-semibold transition-all hover:bg-[#f1f5fa]" style={{ borderColor: "#e2e8f3", color: "#5a6b85" }}>
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M3.75 9.776c.112-.017.227-.026.344-.026h15.812c.117 0 .232.009.344.026m-16.5 0a2.25 2.25 0 00-1.883 2.542l.857 6a2.25 2.25 0 002.227 1.932H19.05a2.25 2.25 0 002.227-1.932l.857-6a2.25 2.25 0 00-1.883-2.542m-16.5 0V6A2.25 2.25 0 016 3.75h3.879a1.5 1.5 0 011.06.44l2.122 2.12a1.5 1.5 0 001.06.44H18A2.25 2.25 0 0120.25 9v.776" /></svg>
            Reset to Defaults
          </button>
          <button
            onClick={handleSave}
            disabled={changedConfigs.size === 0 || saving}
            className="inline-flex items-center gap-2 rounded-full bg-[#16a34a] px-5 py-2 text-sm font-semibold text-white shadow-lg transition-all hover:bg-[#15803d] disabled:opacity-50"
          >
            {saving ? (
              <svg className="h-4 w-4 animate-spin" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" /></svg>
            ) : (
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>
            )}
            {saving ? "Saving..." : `Save ${changedConfigs.size > 0 ? `(${changedConfigs.size})` : ""}`}
          </button>
        </div>
      </div>

      {/* Config Groups */}
      <div className="grid gap-6 lg:grid-cols-2">
        {configGroups.map((group, gi) => (
          <Reveal key={group.id} delay={gi * 100}>
            <div className="rounded-2xl border bg-white p-6" style={{ borderColor: "#e2e8f3" }}>
              <div className="mb-5 flex items-center gap-3">
                <span className="text-2xl">{group.icon}</span>
                <h3 className="text-lg font-bold" style={{ color: "#0f1729" }}>{group.name}</h3>
              </div>
              <div className="space-y-5">
                {group.configs.map((config) => (
                  <div key={config.id} className="rounded-xl border p-4 transition-all" style={{ borderColor: changedConfigs.has(config.id) ? "#2a7bd9" : "#f1f5fa", background: changedConfigs.has(config.id) ? "rgba(42,123,217,0.03)" : "#f8fafc" }}>
                    <div className="mb-3 flex items-start justify-between">
                      <div>
                        <label className="text-sm font-semibold" style={{ color: "#0f1729" }}>{config.label}</label>
                        <p className="mt-1 text-xs" style={{ color: "#5a6b85" }}>{config.description}</p>
                      </div>
                      <div className="flex items-center gap-1">
                        <input
                          type="number"
                          value={configs[config.id]}
                          onChange={(e) => updateConfig(config.id, Number(e.target.value))}
                          className="w-24 rounded-lg border bg-white px-3 py-1.5 text-right text-sm font-bold outline-none focus:ring-2"
                          style={{ borderColor: "#e2e8f3", "--tw-ring-color": "#2a7bd9" } as any}
                        />
                        <span className="text-xs font-medium" style={{ color: "#5a6b85" }}>{config.unit}</span>
                      </div>
                    </div>
                    <div className="relative">
                      <input
                        type="range"
                        min={config.min}
                        max={config.max}
                        value={configs[config.id]}
                        onChange={(e) => updateConfig(config.id, Number(e.target.value))}
                        className="w-full cursor-pointer"
                        style={{ accentColor: "#2a7bd9" }}
                      />
                      <div className="mt-1 flex justify-between text-[10px]" style={{ color: "#8694ad" }}>
                        <span>{config.min}</span>
                        <span>{config.max}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </Reveal>
        ))}
      </div>

      {/* Warning Banner */}
      <div className="mt-8 rounded-2xl border border-amber-200 bg-amber-50 p-5">
        <div className="flex items-start gap-3">
          <span className="text-2xl">⚠️</span>
          <div>
            <h4 className="font-bold text-amber-800">Heads up before you save</h4>
            <p className="mt-1 text-sm text-amber-700">Changes to these thresholds will take effect immediately and may impact fraud detection, content moderation, and operational workflows. Consider testing in staging first.</p>
          </div>
        </div>
      </div>
    </div>
  );
}
