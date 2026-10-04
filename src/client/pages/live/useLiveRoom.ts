import { useCallback, useEffect, useRef, useState } from "react";
import type { LiveServerMessage } from "../../../shared/contracts";

const MAX_BACKOFF_MS = 15000;

export type LivePoll = Extract<LiveServerMessage, { type: "poll" }>;
export type LiveQuiz = Extract<LiveServerMessage, { type: "quiz" }>;
export type LiveLeaderboardRow = Extract<
  LiveServerMessage,
  { type: "leaderboard" }
>["rows"][number];
export type LiveStuckItem = Extract<LiveServerMessage, { type: "stuck_queue" }>["items"][number];
export type LiveShippedItem = Extract<LiveServerMessage, { type: "shipped_feed" }>["items"][number];

export interface LiveSnapshot {
  step: number;
  attendance: number;
  checkedIn: boolean;
  hasSeat: boolean;
}

export type LiveStatus = "connecting" | "open" | "reconnecting" | "failed";

interface CurrentResponse {
  workshopId: string;
}

interface SnapshotResponse {
  step: number;
  attendance: number;
  checkedIn: boolean;
  hasSeat?: boolean;
}

export function readTokenFromUrl(): string | null {
  const fromQuery = new URLSearchParams(window.location.search).get("t");
  if (fromQuery) return fromQuery;
  try {
    return window.localStorage.getItem("s60_token");
  } catch {
    return null;
  }
}

export function useLiveRoom(role: "participant" | "host", token: string | null) {
  const [snapshot, setSnapshot] = useState<LiveSnapshot>({
    step: 1,
    attendance: 0,
    checkedIn: false,
    hasSeat: false,
  });
  const [status, setStatus] = useState<LiveStatus>("connecting");
  const [poll, setPoll] = useState<LivePoll | null>(null);
  const [quiz, setQuiz] = useState<LiveQuiz | null>(null);
  const [leaderboard, setLeaderboard] = useState<LiveLeaderboardRow[]>([]);
  const [stuck, setStuck] = useState<LiveStuckItem[]>([]);
  const [shipped, setShipped] = useState<LiveShippedItem[]>([]);
  const [error, setError] = useState<string | null>(null);
  const wsRef = useRef<WebSocket | null>(null);
  const timerRef = useRef<number | null>(null);
  const attemptRef = useRef(0);
  const stoppedRef = useRef(false);
  const workshopRef = useRef<string | null>(null);
  const connectRef = useRef<((workshopId: string) => void) | null>(null);

  const apply = useCallback((msg: LiveServerMessage) => {
    switch (msg.type) {
      case "state":
        setSnapshot((prev) => ({
          ...prev,
          step: msg.step,
          attendance: msg.attendance,
          checkedIn: msg.checkedIn,
        }));
        break;
      case "poll":
        setPoll(msg);
        break;
      case "quiz":
        setQuiz(msg);
        break;
      case "leaderboard":
        setLeaderboard(msg.rows);
        break;
      case "stuck_queue":
        setStuck(msg.items);
        break;
      case "shipped_feed":
        setShipped(msg.items);
        break;
      case "error":
        setError(msg.message);
        break;
      case "pong":
        break;
    }
  }, []);

  const connect = useCallback(
    (workshopId: string) => {
      workshopRef.current = workshopId;
      const proto = window.location.protocol === "https:" ? "wss" : "ws";
      const query = new URLSearchParams();
      if (role === "host") query.set("role", "host");
      if (token) query.set("t", token);
      const qs = query.toString();
      const ws = new WebSocket(
        `${proto}://${window.location.host}/api/live/${workshopId}/ws${qs ? `?${qs}` : ""}`,
      );
      wsRef.current = ws;
      setStatus(attemptRef.current === 0 ? "connecting" : "reconnecting");

      ws.onopen = () => {
        attemptRef.current = 0;
        setStatus("open");
        setError(null);
        ws.send(JSON.stringify({ type: "join", role, ...(token ? { token } : {}) }));
      };

      ws.onmessage = (event) => {
        try {
          apply(JSON.parse(String(event.data)) as LiveServerMessage);
        } catch {
          /* ignore malformed frames */
        }
      };

      ws.onclose = () => {
        if (stoppedRef.current) return;
        if (role === "host" && attemptRef.current >= 2) {
          setStatus("failed");
          setError("Host access needs an admin session. Log in at /admin, then retry.");
          return;
        }
        const delay = Math.min(1000 * 2 ** attemptRef.current, MAX_BACKOFF_MS);
        attemptRef.current += 1;
        setStatus("reconnecting");
        timerRef.current = window.setTimeout(() => connectRef.current?.(workshopId), delay);
      };
    },
    [apply, role, token],
  );

  useEffect(() => {
    connectRef.current = connect;
  }, [connect]);

  useEffect(() => {
    stoppedRef.current = false;
    const controller = new AbortController();
    void (async () => {
      try {
        const current = (await fetch("/api/live/current", { signal: controller.signal }).then((r) =>
          r.json(),
        )) as CurrentResponse;
        const stateQuery = token ? `?t=${encodeURIComponent(token)}` : "";
        const snap = (await fetch(`/api/live/${current.workshopId}/state${stateQuery}`, {
          signal: controller.signal,
        }).then((r) => r.json())) as SnapshotResponse;
        if (controller.signal.aborted) return;
        setSnapshot({
          step: snap.step,
          attendance: snap.attendance,
          checkedIn: snap.checkedIn,
          hasSeat: snap.hasSeat === true || Boolean(token),
        });
        connect(current.workshopId);
      } catch {
        if (controller.signal.aborted) return;
        setStatus("failed");
        setError("Could not reach the live room. Check your connection and retry.");
      }
    })();
    return () => {
      stoppedRef.current = true;
      controller.abort();
      if (timerRef.current !== null) window.clearTimeout(timerRef.current);
      wsRef.current?.close();
    };
  }, [connect, token]);

  const send = useCallback((message: unknown): boolean => {
    const ws = wsRef.current;
    if (!ws || ws.readyState !== WebSocket.OPEN) return false;
    ws.send(JSON.stringify(message));
    return true;
  }, []);

  const retry = useCallback(() => {
    attemptRef.current = 0;
    stoppedRef.current = false;
    if (workshopRef.current) connectRef.current?.(workshopRef.current);
    else window.location.reload();
  }, []);

  return { snapshot, status, poll, quiz, leaderboard, stuck, shipped, error, send, retry };
}
