"use client";

import { useEffect, useState } from "react";

/**
 * Hook quản lý state "đang chỉnh sửa" + persist vào sessionStorage.
 * Dùng cho cả 3 trang profile để state editing KHÔNG bị reset khi navigate.
 */
export function useEditingProfile<T>(
  storageKey: string,
  initial: T
): {
  data: T;
  setData: React.Dispatch<React.SetStateAction<T>>;
  editing: boolean;
  setEditing: (v: boolean) => void;
  save: () => void;
  cancel: () => void;
  savedAt: string | null;
  reset: () => void;
} {
  const [data, setData] = useState<T>(initial);
  const [editing, setEditing] = useState(false);
  const [savedAt, setSavedAt] = useState<string | null>(null);
  const [hydrated, setHydrated] = useState(false);

  // Hydrate from sessionStorage on mount
  useEffect(() => {
    try {
      const raw = sessionStorage.getItem(storageKey);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed?.data) setData(parsed.data as T);
        if (parsed?.savedAt) setSavedAt(parsed.savedAt as string);
      }
    } catch {
      /* ignore */
    }
    setHydrated(true);
  }, [storageKey]);

  // Persist every change
  useEffect(() => {
    if (!hydrated) return;
    try {
      sessionStorage.setItem(storageKey, JSON.stringify({ data, savedAt }));
    } catch {
      /* ignore quota errors */
    }
  }, [data, savedAt, storageKey, hydrated]);

  function save() {
    setEditing(false);
    setSavedAt(new Date().toLocaleTimeString("vi-VN"));
  }
  function cancel() {
    try {
      const raw = sessionStorage.getItem(storageKey);
      if (raw) {
        const parsed = JSON.parse(raw);
        // Keep the LAST saved snapshot, discard in-memory edits
        if (parsed?.lastSaved) setData(parsed.lastSaved as T);
      }
    } catch {
      /* ignore */
    }
    setEditing(false);
  }
  function reset() {
    setData(initial);
    setSavedAt(null);
    try {
      sessionStorage.removeItem(storageKey);
    } catch {
      /* ignore */
    }
  }

  // Snapshot lastSaved khi save xong
  useEffect(() => {
    if (!editing && savedAt) {
      try {
        const raw = sessionStorage.getItem(storageKey);
        const parsed = raw ? JSON.parse(raw) : {};
        parsed.lastSaved = data;
        sessionStorage.setItem(storageKey, JSON.stringify(parsed));
      } catch {
        /* ignore */
      }
    }
  }, [editing, savedAt, data, storageKey]);

  return { data, setData, editing, setEditing, save, cancel, savedAt, reset };
}
