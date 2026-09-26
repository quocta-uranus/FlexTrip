"use client";

import { Reveal, LiveDot } from"@/components/profile/wow";

const forecastData = [
  { month:"Oct 2024", predicted: 520, lower: 480, upper: 560, actual: null },
  { month:"Nov 2024", predicted: 580, lower: 530, upper: 630, actual: null },
  { month:"Dec 2024", predicted: 720, lower: 660, upper: 780, actual: null },
  { month:"Jan 2025", predicted: 490, lower: 440, upper: 540, actual: null },
  { month:"Feb 2025", predicted: 540, lower: 490, upper: 590, actual: null },
  { month:"Mar 2025", predicted: 620, lower: 560, upper: 680, actual: null },
];

const historicalData = [
  { month:"Apr", revenue: 295 },
  { month:"May", revenue: 340 },
  { month:"Jun", revenue: 380 },
  { month:"Jul", revenue: 420 },
  { month:"Aug", revenue: 395 },
  { month:"Sep", revenue: 450 },
];

const maxForecast = Math.max(...forecastData.map(d => d.upper), ...historicalData.map(d => d.revenue));

export default function AIForecastPage() {
  return (
    <div className="p-8">
      {/* Header */}
      <div className="mb-8 flex items-start justify-between">
        <div>
          <div className="mb-1 flex items-center gap-3">
            <span className="rounded-lg bg-[#0f1729] px-2.5 py-1 text-xs font-bold uppercase tracking-wider text-white">ADMIN-07</span>
            <LiveDot label="AI ACTIVE" tone="blue" />
          </div>
          <h1 className="text-3xl font-bold text-slate-900 dark:text-slate-100">AI Revenue Forecast</h1>
          <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">Dự báo doanh thu/tăng trưởng dựa trên dữ liệu lịch sử</p>
        </div>
        <div className="flex gap-2">
          <select className="rounded-xl border bg-white px-4 py-2 text-sm outline-none dark:bg-[#121A2C] dark:text-white dark:border-white/10" style={{ borderColor:"#e2e8f3" }}>
            <option>Next 6 months</option>
            <option>Next 12 months</option>
            <option>Quarterly</option>
          </select>
          <button className="inline-flex items-center gap-2 rounded-full bg-[#2a7bd9] px-4 py-2 text-sm font-semibold text-white transition-all hover:bg-[#1e5aa8]">
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182m0-4.991v4.99" /></svg>
            Retrain Model
          </button>
        </div>
      </div>

      {/* Forecast Summary */}
      <div className="mb-8 grid gap-4 sm:grid-cols-4">
        {[
          { label:"Predicted Revenue (6mo)", value:"₫3.37B", confidence:"94%", color:"#2a7bd9" },
          { label:"Growth Rate", value:"+18.5%", confidence:"High", color:"#16a34a" },
          { label:"Peak Month", value:"Dec 2024", confidence:"₫720M", color:"#7c3aed" },
          { label:"Model Accuracy", value:"92.3%", confidence:"MAPE: 7.7%", color:"#ca8a04" },
        ].map((kpi) => (
          <Reveal key={kpi.label}>
            <div className="rounded-2xl border bg-white p-5 dark:bg-[#121A2C] dark:text-white dark:border-white/10" style={{ borderColor:"#e2e8f3" }}>
              <div className="text-xs font-medium text-slate-600 dark:text-slate-300">{kpi.label}</div>
              <div className="mt-2 text-2xl font-bold" style={{ color: kpi.color }}>{kpi.value}</div>
              <div className="mt-1 text-xs text-slate-500 dark:text-slate-400">{kpi.confidence}</div>
            </div>
          </Reveal>
        ))}
      </div>

      {/* Forecast Chart */}
      <div className="mb-8 rounded-2xl border bg-white p-6 dark:bg-[#121A2C] dark:text-white dark:border-white/10" style={{ borderColor:"#e2e8f3" }}>
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100">Revenue Forecast</h3>
            <p className="text-xs text-slate-600 dark:text-slate-300">Historical data (solid) + AI prediction (dashed)</p>
          </div>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <div className="h-1 w-8 rounded-full bg-[#2a7bd9]" />
              <span className="text-xs text-slate-600 dark:text-slate-300">Historical</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="h-1 w-8 rounded-full bg-dashed" style={{ background:"repeating-linear-gradient(90deg, #92eee8 0, #92eee8 4px, transparent 4px, transparent 8px)" }} />
              <span className="text-xs text-slate-600 dark:text-slate-300">Predicted</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="h-1 w-8 rounded-full bg-[#f1f5fa]" />
              <span className="text-xs text-slate-600 dark:text-slate-300">Confidence</span>
            </div>
          </div>
        </div>
        <div className="flex items-end gap-4" style={{ height:"280px" }}>
          {/* Historical bars */}
          {historicalData.map((d, i) => (
            <div key={`h-${d.month}`} className="relative flex flex-1 flex-col items-center">
              <div className="w-full rounded-t-lg bg-gradient-to-t from-[#2a7bd9] to-[#93c5fd]" style={{ height: `${(d.revenue / maxForecast) * 100}%` }} />
              <div className="mt-2 text-[10px] font-medium text-slate-600 dark:text-slate-300">{d.month}</div>
            </div>
          ))}
          {/* Forecast bars */}
          {forecastData.map((d, i) => (
            <div key={`f-${d.month}`} className="relative flex flex-1 flex-col items-center">
              {/* Confidence range */}
              <div className="absolute bottom-8 w-full rounded-t-lg opacity-20" style={{ height: `${((d.upper - d.lower) / maxForecast) * 100}%`, background:"#92eee8" }} />
              {/* Prediction */}
              <div className="relative w-full rounded-t-lg border-2 border-dashed" style={{ height: `${(d.predicted / maxForecast) * 100}%`, background:"linear-gradient(to top, #92eee8, #c0f5f0)", borderColor:"#5fd6cd" }}>
                <div className="absolute -top-6 left-1/2 -translate-x-1/2 rounded-lg bg-[#0f1729] px-2 py-1 text-xs font-bold text-white">
                  ₫{d.predicted}M
                </div>
              </div>
              <div className="mt-2 text-[10px] font-medium text-slate-600 dark:text-slate-300">{d.month.split("")[0]}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Insights */}
      <div className="grid gap-6 lg:grid-cols-2">
        <Reveal>
          <div className="rounded-2xl border bg-white p-6 dark:bg-[#121A2C] dark:text-white dark:border-white/10" style={{ borderColor:"#e2e8f3" }}>
            <h3 className="mb-4 flex items-center gap-2 text-lg font-bold text-slate-900 dark:text-slate-100">
              <span className="text-xl">💡</span> AI Insights
            </h3>
            <div className="space-y-4">
              {[
                { icon:"📈", insight:"Strong growth momentum", detail:"Revenue expected to grow 15.5% YoY based on current trajectory" },
                { icon:"🎄", insight:"Seasonal peak in Dec", detail:"Holiday season drives 38% higher bookings vs monthly average" },
                { icon:"⚠️", insight:"Jan dip anticipated", detail:"Post-holiday slowdown expected, plan marketing accordingly" },
                { icon:"🎯", insight:"Growth opportunity", detail:"STAY category shows highest growth potential (+24%)" },
              ].map((item, i) => (
                <div key={i} className="flex items-start gap-3 rounded-xl border p-4" style={{ borderColor:"#f1f5fa" }}>
                  <span className="text-2xl">{item.icon}</span>
                  <div>
                    <div className="font-semibold text-slate-900 dark:text-slate-100">{item.insight}</div>
                    <div className="mt-1 text-sm text-slate-600 dark:text-slate-300">{item.detail}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </Reveal>

        <Reveal delay={100}>
          <div className="rounded-2xl border bg-white p-6 dark:bg-[#121A2C] dark:text-white dark:border-white/10" style={{ borderColor:"#e2e8f3" }}>
            <h3 className="mb-4 flex items-center gap-2 text-lg font-bold text-slate-900 dark:text-slate-100">
              <span className="text-xl">📊</span> Forecast Confidence
            </h3>
            <div className="space-y-4">
              {forecastData.map((d) => (
                <div key={d.month} className="rounded-xl border p-4" style={{ borderColor:"#f1f5fa" }}>
                  <div className="mb-2 flex items-center justify-between">
                    <span className="font-semibold text-slate-900 dark:text-slate-100">{d.month}</span>
                    <span className="font-bold" style={{ color:"#2a7bd9" }}>₫{d.predicted}M</span>
                  </div>
                  <div className="h-2 w-full overflow-hidden rounded-full bg-[#f1f5fa]">
                    <div className="h-full rounded-full bg-gradient-to-r from-[#2a7bd9] to-[#92eee8]" style={{ width:"85%" }} />
                  </div>
                  <div className="mt-2 flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
                    <span>Lower: ₫{d.lower}M</span>
                    <span>Upper: ₫{d.upper}M</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </Reveal>
      </div>
    </div>
  );
}
