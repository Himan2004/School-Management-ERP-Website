/**
 * AttendanceContext
 *
 * Provides a global attendance-session timer used by:
 *   - Navbar (mini widget)
 *   - Any HRM / Attendance page that wants to share the same timer state
 *
 * State is persisted to localStorage keyed by today's date so it survives
 * page refreshes but resets automatically on the next day.
 *
 * Exports:
 *   AttendanceProvider  — wrap your app (or layout) with this
 *   useAttendance()     — returns { status, elapsed, pct, checkIn, pause, resume, checkOut, ... }
 *   formatElapsed(secs) — "HH:MM:SS" formatter helper
 */

import {
  createContext,
  useContext,
  useEffect,
  useRef,
  useState,
  useCallback,
} from "react";

// ── Constants ─────────────────────────────────────────────────────────────────
const TARGET_SECONDS = 8 * 60 * 60; // 8-hour working day
const STORAGE_KEY = "graphura_attendance";

// ── Helpers ───────────────────────────────────────────────────────────────────
function pad(n) {
  return String(n).padStart(2, "0");
}

/**
 * Format a number of seconds as "HH:MM:SS".
 * Exported so Navbar / other components can use it directly.
 */
export function formatElapsed(secs) {
  const s = Math.max(0, Math.floor(secs));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  return `${pad(h)}:${pad(m)}:${pad(sec)}`;
}

function todayKey() {
  return new Date().toISOString().slice(0, 10); // "YYYY-MM-DD"
}

function clockNow() {
  const d = new Date();
  const h = d.getHours();
  const m = d.getMinutes();
  const ampm = h >= 12 ? "PM" : "AM";
  const h12 = h % 12 || 12;
  return `${pad(h12)}:${pad(m)} ${ampm}`;
}

// ── Default persisted shape ───────────────────────────────────────────────────
const DEFAULT_STATE = {
  date: todayKey(),
  status: "idle", // "idle" | "active" | "paused" | "done"
  elapsed: 0,     // net work seconds (excluding pauses)
  breakSeconds: 0,
  overtime: 0,
  checkInAt: "",
  checkOutAt: "",
  lastTick: null, // epoch ms when we last ticked (null if not active)
};

function loadState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { ...DEFAULT_STATE };
    const stored = JSON.parse(raw);
    // Reset if stored date differs from today
    if (stored.date !== todayKey()) return { ...DEFAULT_STATE };
    return { ...DEFAULT_STATE, ...stored };
  } catch {
    return { ...DEFAULT_STATE };
  }
}

function saveState(s) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(s));
  } catch {
    // quota exceeded — ignore
  }
}

// ── Context ───────────────────────────────────────────────────────────────────
const AttendanceContext = createContext(null);

export function AttendanceProvider({ children }) {
  const [state, setState] = useState(() => loadState());
  const intervalRef = useRef(null);

  // Derived values
  const { status, elapsed, breakSeconds, overtime, checkInAt, checkOutAt } =
    state;
  const pct = Math.min((elapsed / TARGET_SECONDS) * 100, 100);
  const remaining = Math.max(TARGET_SECONDS - elapsed, 0);
  const targetReached = elapsed >= TARGET_SECONDS;

  // ── Tick every second while active ─────────────────────────────────────────
  useEffect(() => {
    if (status !== "active") {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
      return;
    }

    intervalRef.current = setInterval(() => {
      setState((prev) => {
        const now = Date.now();
        const delta = prev.lastTick ? Math.round((now - prev.lastTick) / 1000) : 1;
        const newElapsed = prev.elapsed + delta;
        const newOvertime = Math.max(newElapsed - TARGET_SECONDS, 0);
        const next = {
          ...prev,
          elapsed: newElapsed,
          overtime: newOvertime,
          lastTick: now,
        };
        saveState(next);
        return next;
      });
    }, 1000);

    return () => clearInterval(intervalRef.current);
  }, [status]);

  // ── Actions ────────────────────────────────────────────────────────────────
  const checkIn = useCallback(() => {
    setState((prev) => {
      if (prev.status !== "idle") return prev;
      const next = {
        ...prev,
        status: "active",
        checkInAt: clockNow(),
        lastTick: Date.now(),
      };
      saveState(next);
      return next;
    });
  }, []);

  const pause = useCallback(() => {
    setState((prev) => {
      if (prev.status !== "active") return prev;
      const next = { ...prev, status: "paused", lastTick: null };
      saveState(next);
      return next;
    });
  }, []);

  const resume = useCallback(() => {
    setState((prev) => {
      if (prev.status !== "paused") return prev;
      const next = { ...prev, status: "active", lastTick: Date.now() };
      saveState(next);
      return next;
    });
  }, []);

  const checkOut = useCallback(() => {
    setState((prev) => {
      if (prev.status === "idle" || prev.status === "done") return prev;
      const next = {
        ...prev,
        status: "done",
        checkOutAt: clockNow(),
        lastTick: null,
      };
      saveState(next);
      return next;
    });
  }, []);

  const value = {
    // State
    status,
    elapsed,
    breakSeconds,
    overtime,
    pct,
    remaining,
    targetReached,
    checkInAt,
    checkOutAt,
    // Actions
    checkIn,
    pause,
    resume,
    checkOut,
  };

  return (
    <AttendanceContext.Provider value={value}>
      {children}
    </AttendanceContext.Provider>
  );
}

/**
 * useAttendance — consume attendance context.
 * Must be used inside <AttendanceProvider>.
 */
export function useAttendance() {
  const ctx = useContext(AttendanceContext);
  if (!ctx) {
    throw new Error("useAttendance must be used within <AttendanceProvider>");
  }
  return ctx;
}

export default AttendanceContext;
