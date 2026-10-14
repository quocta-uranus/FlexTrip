"use client";

import { createContext, useContext, useState, type ReactNode } from "react";
import { cn } from "cn";

type TabsContextValue = { value: string; onChange: (v: string) => void };
const TabsContext = createContext<TabsContextValue>({ value: "", onChange: () => {} });

function Tabs({
  defaultValue,
  value: controlled,
  onValueChange,
  className,
  children,
}: {
  defaultValue?: string;
  value?: string;
  onValueChange?: (v: string) => void;
  className?: string;
  children: ReactNode;
}) {
  const [internal, setInternal] = useState(defaultValue ?? "");
  const value = controlled ?? internal;
  const onChange = onValueChange ?? setInternal;
  return (
    <TabsContext.Provider value={{ value, onChange }}>
      <div data-slot="tabs" className={cn("flex flex-col gap-0", className)}>
        {children}
      </div>
    </TabsContext.Provider>
  );
}

function TabsList({ className, children }: { className?: string; children: ReactNode }) {
  return (
    <div
      data-slot="tabs-list"
      className={cn(
        "flex items-center gap-1 border-b border-[#e2e8f3] pb-0",
        className
      )}
    >
      {children}
    </div>
  );
}

function TabsTrigger({
  value,
  children,
  className,
}: {
  value: string;
  children: ReactNode;
  className?: string;
}) {
  const ctx = useContext(TabsContext);
  const active = ctx.value === value;
  return (
    <button
      type="button"
      role="tab"
      aria-selected={active}
      data-slot="tabs-trigger"
      onClick={() => ctx.onChange(value)}
      className={cn(
        "relative -mb-px px-4 py-2.5 text-sm font-medium transition-colors focus-visible:outline-none",
        active
          ? "border-b-2 border-[#2a7bd9] text-[#2a7bd9]"
          : "border-b-2 border-transparent text-[#5a6b85] hover:text-[#0f1729]",
        className
      )}
    >
      {children}
    </button>
  );
}

function TabsContent({
  value,
  children,
  className,
}: {
  value: string;
  children: ReactNode;
  className?: string;
}) {
  const ctx = useContext(TabsContext);
  if (ctx.value !== value) return null;
  return (
    <div data-slot="tabs-content" className={cn("flex-1 pt-5", className)}>
      {children}
    </div>
  );
}

export { Tabs, TabsList, TabsTrigger, TabsContent };
