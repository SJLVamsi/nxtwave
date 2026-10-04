/**
 * WS6 — LiveRoom Durable Object (SQLite + WebSocket Hibernation).
 * One instance per workshop id. Room state lives in SQLite; per-socket identity
 * lives in the WebSocket attachment so connections survive hibernation.
 */
import { DurableObject } from "cloudflare:workers";
import {
  LiveClientMessageSchema,
  type LiveClientMessage,
  type LiveServerMessage,
} from "../../shared/contracts";
import { getUserByToken, publicName } from "../lib/auth";
import { nowIso } from "../lib/db";
import { recordEvent } from "../lib/events";
import { newId, shortId } from "../lib/ids";
import { qualifyReferral } from "../lib/referral";

const BROADCAST_INTERVAL_MS = 500;
const MIN_STEP = 1;
const MAX_STEP = 6;
const STUCK_QUEUE_LIMIT = 50;
const SHIPPED_FEED_LIMIT = 30;
const LEADERBOARD_LIMIT = 20;

interface SocketAttachment {
  role: "participant" | "host";
  userId: string | null;
  participantId: string;
  name: string;
  checkedIn: boolean;
}

interface ActiveQuestion {
  id: string;
  question: string;
  options: string[];
  correct: number | null;
}

type DirtyChannel = "state" | "poll" | "quiz" | "leaderboard" | "stuck" | "shipped";

export class LiveRoom extends DurableObject<Env> {
  constructor(ctx: DurableObjectState, env: Env) {
    super(ctx, env);
    ctx.blockConcurrencyWhile(async () => {
      this.migrate();
    });
  }

  /* ------------------------------- storage -------------------------------- */

  private migrate(): void {
    this.ctx.storage.sql.exec(
      `CREATE TABLE IF NOT EXISTS room_state (
        key TEXT PRIMARY KEY,
        value TEXT NOT NULL
      )`,
    );
    this.ctx.storage.sql.exec(
      `CREATE TABLE IF NOT EXISTS participants (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        role TEXT NOT NULL,
        checked_in INTEGER NOT NULL DEFAULT 0,
        joined_at TEXT NOT NULL,
        last_seen_at TEXT NOT NULL
      )`,
    );
    this.ctx.storage.sql.exec(
      `CREATE TABLE IF NOT EXISTS checkins (
        user_id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        checked_in_at TEXT NOT NULL,
        is_simulated INTEGER NOT NULL DEFAULT 0
      )`,
    );
    this.ctx.storage.sql.exec(
      `CREATE TABLE IF NOT EXISTS poll_answers (
        question_id TEXT NOT NULL,
        participant_id TEXT NOT NULL,
        option INTEGER NOT NULL,
        answered_at TEXT NOT NULL,
        PRIMARY KEY (question_id, participant_id)
      )`,
    );
    this.ctx.storage.sql.exec(
      `CREATE TABLE IF NOT EXISTS quiz_answers (
        question_id TEXT NOT NULL,
        participant_id TEXT NOT NULL,
        option INTEGER NOT NULL,
        is_correct INTEGER NOT NULL,
        answered_at TEXT NOT NULL,
        PRIMARY KEY (question_id, participant_id)
      )`,
    );
    this.ctx.storage.sql.exec(
      `CREATE TABLE IF NOT EXISTS quiz_scores (
        participant_id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        score INTEGER NOT NULL DEFAULT 0,
        updated_at TEXT NOT NULL
      )`,
    );
    this.ctx.storage.sql.exec(
      `CREATE TABLE IF NOT EXISTS stuck (
        id TEXT PRIMARY KEY,
        participant_id TEXT NOT NULL,
        name TEXT NOT NULL,
        note TEXT,
        resolved INTEGER NOT NULL DEFAULT 0,
        created_at TEXT NOT NULL
      )`,
    );
    this.ctx.storage.sql.exec(
      `CREATE TABLE IF NOT EXISTS shipped (
        id TEXT PRIMARY KEY,
        participant_id TEXT NOT NULL,
        name TEXT NOT NULL,
        url TEXT NOT NULL,
        created_at TEXT NOT NULL
      )`,
    );
    this.ctx.storage.sql.exec("INSERT OR IGNORE INTO room_state (key, value) VALUES ('step', '1')");
    this.ctx.storage.sql.exec(
      "INSERT OR IGNORE INTO room_state (key, value) VALUES ('dirty', '[]')",
    );
    this.ctx.storage.sql.exec(
      "INSERT OR IGNORE INTO room_state (key, value) VALUES ('last_broadcast_at', '0')",
    );
  }

  private getStateValue(key: string): string | null {
    const rows = this.ctx.storage.sql
      .exec<{ value: string }>("SELECT value FROM room_state WHERE key = ?", key)
      .toArray();
    return rows[0]?.value ?? null;
  }

  private setStateValue(key: string, value: string): void {
    this.ctx.storage.sql.exec(
      "INSERT INTO room_state (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value",
      key,
      value,
    );
  }

  private currentStep(): number {
    const value = Number(this.getStateValue("step") ?? "1");
    if (!Number.isFinite(value)) return MIN_STEP;
    return Math.min(MAX_STEP, Math.max(MIN_STEP, Math.round(value)));
  }

  private attendance(): number {
    const rows = this.ctx.storage.sql
      .exec<{ n: number }>("SELECT COUNT(*) AS n FROM checkins")
      .toArray();
    return rows[0]?.n ?? 0;
  }

  private attachment(ws: WebSocket): SocketAttachment | null {
    return ws.deserializeAttachment() as SocketAttachment | null;
  }

  private touchParticipant(att: SocketAttachment): void {
    const now = nowIso();
    this.ctx.storage.sql.exec(
      `INSERT INTO participants (id, name, role, checked_in, joined_at, last_seen_at)
       VALUES (?, ?, ?, ?, ?, ?)
       ON CONFLICT(id) DO UPDATE SET
         name = excluded.name,
         role = excluded.role,
         checked_in = excluded.checked_in,
         last_seen_at = excluded.last_seen_at`,
      att.participantId,
      att.name,
      att.role,
      att.checkedIn ? 1 : 0,
      now,
      now,
    );
  }

  /* ------------------------------ broadcast ------------------------------- */

  private markDirty(channel: DirtyChannel): void {
    const current = new Set<DirtyChannel>(
      JSON.parse(this.getStateValue("dirty") ?? "[]") as DirtyChannel[],
    );
    current.add(channel);
    this.setStateValue("dirty", JSON.stringify([...current]));
    this.scheduleBroadcast();
  }

  private scheduleBroadcast(): void {
    const last = Number(this.getStateValue("last_broadcast_at") ?? 0);
    const now = Date.now();
    const due = last + BROADCAST_INTERVAL_MS;
    if (due <= now) {
      this.flushBroadcasts(now);
    } else {
      this.ctx.waitUntil(this.ctx.storage.setAlarm(due));
    }
  }

  async alarm(): Promise<void> {
    this.flushBroadcasts(Date.now());
  }

  private flushBroadcasts(now: number): void {
    const dirty = JSON.parse(this.getStateValue("dirty") ?? "[]") as DirtyChannel[];
    if (dirty.length === 0) return;
    this.setStateValue("dirty", "[]");
    this.setStateValue("last_broadcast_at", String(now));
    const channels = new Set(dirty);
    if (channels.has("state")) this.broadcastState();
    if (channels.has("poll")) this.broadcastPoll();
    if (channels.has("quiz")) this.broadcastQuiz();
    if (channels.has("leaderboard")) this.broadcastLeaderboard();
    if (channels.has("stuck")) this.broadcastStuckQueue();
    if (channels.has("shipped")) this.broadcastShippedFeed();
  }

  private send(ws: WebSocket, message: LiveServerMessage): void {
    try {
      ws.send(JSON.stringify(message));
    } catch {
      /* socket already closed */
    }
  }

  private sendError(ws: WebSocket, code: string, message: string): void {
    this.send(ws, { type: "error", code, message });
  }

  private broadcastState(): void {
    const step = this.currentStep();
    const attendance = this.attendance();
    const serverTime = nowIso();
    for (const ws of this.ctx.getWebSockets()) {
      const att = this.attachment(ws);
      if (!att) continue;
      this.send(ws, {
        type: "state",
        step,
        attendance,
        checkedIn: att.checkedIn,
        role: att.role,
        serverTime,
      });
    }
  }

  private countsFor(
    table: "poll_answers" | "quiz_answers",
    questionId: string,
    size: number,
  ): number[] {
    const counts = new Array<number>(size).fill(0);
    const rows = this.ctx.storage.sql
      .exec<{ option: number; n: number }>(
        `SELECT option, COUNT(*) AS n FROM ${table} WHERE question_id = ? GROUP BY option`,
        questionId,
      )
      .toArray();
    for (const row of rows) {
      if (row.option >= 0 && row.option < size) counts[row.option] = row.n;
    }
    return counts;
  }

  private broadcastPoll(): void {
    const poll = this.activeQuestion("active_poll");
    if (!poll) return;
    const counts = this.countsFor("poll_answers", poll.id, poll.options.length);
    for (const ws of this.ctx.getWebSockets()) {
      this.send(ws, {
        type: "poll",
        questionId: poll.id,
        question: poll.question,
        options: poll.options,
        counts,
      });
    }
  }

  private broadcastQuiz(): void {
    const quiz = this.activeQuestion("active_quiz");
    if (!quiz) return;
    const counts = this.countsFor("quiz_answers", quiz.id, quiz.options.length);
    for (const ws of this.ctx.getWebSockets()) {
      this.send(ws, {
        type: "quiz",
        questionId: quiz.id,
        question: quiz.question,
        options: quiz.options,
        counts,
      });
    }
  }

  private broadcastLeaderboard(): void {
    const rows = this.ctx.storage.sql
      .exec<{ name: string; score: number }>(
        "SELECT name, score FROM quiz_scores ORDER BY score DESC, updated_at ASC LIMIT ?",
        LEADERBOARD_LIMIT,
      )
      .toArray();
    const message: LiveServerMessage = {
      type: "leaderboard",
      rows: rows.map((row, index) => ({ rank: index + 1, name: row.name, score: row.score })),
    };
    for (const ws of this.ctx.getWebSockets()) this.send(ws, message);
  }

  private broadcastStuckQueue(): void {
    const items = this.ctx.storage.sql
      .exec<{ id: string; name: string; note: string | null }>(
        "SELECT id, name, note FROM stuck WHERE resolved = 0 ORDER BY created_at ASC LIMIT ?",
        STUCK_QUEUE_LIMIT,
      )
      .toArray()
      .map((row) => ({ id: row.id, name: row.name, note: row.note }));
    const message: LiveServerMessage = { type: "stuck_queue", items };
    for (const ws of this.ctx.getWebSockets()) {
      if (this.attachment(ws)?.role === "host") this.send(ws, message);
    }
  }

  private broadcastShippedFeed(): void {
    const items = this.ctx.storage.sql
      .exec<{ name: string; url: string; created_at: string }>(
        "SELECT name, url, created_at FROM shipped ORDER BY created_at DESC LIMIT ?",
        SHIPPED_FEED_LIMIT,
      )
      .toArray()
      .map((row) => ({ name: row.name, url: row.url, at: row.created_at }));
    const message: LiveServerMessage = { type: "shipped_feed", items };
    for (const ws of this.ctx.getWebSockets()) {
      if (this.attachment(ws)?.role === "host") this.send(ws, message);
    }
  }

  private activeQuestion(key: "active_poll" | "active_quiz"): ActiveQuestion | null {
    const raw = this.getStateValue(key);
    if (!raw) return null;
    try {
      const parsed = JSON.parse(raw) as Partial<ActiveQuestion>;
      if (
        typeof parsed.id !== "string" ||
        typeof parsed.question !== "string" ||
        !Array.isArray(parsed.options)
      ) {
        return null;
      }
      return {
        id: parsed.id,
        question: parsed.question,
        options: parsed.options.filter((option): option is string => typeof option === "string"),
        correct: typeof parsed.correct === "number" ? parsed.correct : null,
      };
    } catch {
      return null;
    }
  }

  /* -------------------------------- fetch --------------------------------- */

  async fetch(request: Request): Promise<Response> {
    const url = new URL(request.url);
    if (url.pathname === "/state") {
      const userId = request.headers.get("x-s60-user-id");
      let checkedIn = false;
      if (userId) {
        const row = this.ctx.storage.sql
          .exec<{ user_id: string }>("SELECT user_id FROM checkins WHERE user_id = ?", userId)
          .toArray()[0];
        checkedIn = Boolean(row);
      }
      return Response.json({
        workshopId: this.env.WORKSHOP_ID,
        step: this.currentStep(),
        attendance: this.attendance(),
        checkedIn,
        hasSeat: Boolean(userId),
        serverTime: nowIso(),
      });
    }

    const isUpgrade =
      request.headers.get("Upgrade")?.toLowerCase() === "websocket" ||
      request.headers.get("x-s60-upgrade") === "1";
    if (!isUpgrade) {
      return Response.json(
        { error: { code: "INVALID_INPUT", message: "Expected a WebSocket upgrade." } },
        { status: 400 },
      );
    }

    const role = request.headers.get("x-s60-role") === "host" ? "host" : "participant";
    const userId = request.headers.get("x-s60-user-id");
    const rawName = (request.headers.get("x-s60-user-name") ?? "").trim();
    const participantId = userId ?? `anon_${shortId(12)}`;
    const attachment: SocketAttachment = {
      role,
      userId: userId ?? null,
      participantId,
      name: rawName ? publicName(rawName.slice(0, 80)) : role === "host" ? "Host" : "Guest",
      checkedIn: false,
    };
    const pair = new WebSocketPair();
    const [client, server] = Object.values(pair);
    server.serializeAttachment(attachment);
    this.ctx.acceptWebSocket(server);
    this.touchParticipant(attachment);
    this.markDirty("state");
    return new Response(null, { status: 101, webSocket: client });
  }

  /* ------------------------------ websockets ------------------------------- */

  async webSocketMessage(ws: WebSocket, message: string | ArrayBuffer): Promise<void> {
    if (typeof message !== "string") {
      this.sendError(ws, "INVALID_INPUT", "Expected a JSON text message.");
      return;
    }
    let parsed: LiveClientMessage;
    try {
      const result = LiveClientMessageSchema.safeParse(JSON.parse(message));
      if (!result.success) {
        this.sendError(ws, "INVALID_INPUT", result.error.issues[0]?.message ?? "Invalid message.");
        return;
      }
      parsed = result.data;
    } catch {
      this.sendError(ws, "INVALID_INPUT", "Expected a JSON message.");
      return;
    }

    const att = this.attachment(ws);
    if (!att) return;

    switch (parsed.type) {
      case "join":
        await this.handleJoin(ws, att, parsed);
        return;
      case "checkin":
        await this.handleCheckin(ws, att);
        return;
      case "poll_answer":
        this.handlePollAnswer(ws, att, parsed);
        return;
      case "quiz_answer":
        this.handleQuizAnswer(ws, att, parsed);
        return;
      case "stuck":
        this.handleStuck(ws, att, parsed);
        return;
      case "resolve_stuck":
        this.handleResolveStuck(ws, att, parsed);
        return;
      case "shipped":
        this.handleShipped(ws, att, parsed);
        return;
      case "advance_step":
        this.handleAdvanceStep(ws, att, parsed);
        return;
      case "launch_poll":
        this.handleLaunchPoll(ws, att, parsed);
        return;
      case "launch_quiz":
        this.handleLaunchQuiz(ws, att, parsed);
        return;
      case "ping":
        this.send(ws, { type: "pong" });
        return;
    }
  }

  async webSocketClose(
    ws: WebSocket,
    _code: number,
    _reason: string,
    _wasClean: boolean,
  ): Promise<void> {
    const att = this.attachment(ws);
    if (!att) return;
    this.ctx.storage.sql.exec(
      "UPDATE participants SET last_seen_at = ? WHERE id = ?",
      nowIso(),
      att.participantId,
    );
  }

  async webSocketError(ws: WebSocket, _error: unknown): Promise<void> {
    const att = this.attachment(ws);
    if (!att) return;
    this.ctx.storage.sql.exec(
      "UPDATE participants SET last_seen_at = ? WHERE id = ?",
      nowIso(),
      att.participantId,
    );
  }

  /* ------------------------------- handlers -------------------------------- */

  private async handleJoin(
    ws: WebSocket,
    att: SocketAttachment,
    msg: LiveClientMessage & { type: "join" },
  ): Promise<void> {
    if (msg.role === "host" && att.role !== "host") {
      this.sendError(ws, "FORBIDDEN", "Host role is assigned by the server.");
      return;
    }
    let changed = false;
    if (!att.userId && msg.token) {
      const user = await getUserByToken(this.env.DB, msg.token);
      if (user) {
        att.userId = user.id;
        att.participantId = user.id;
        att.name = publicName(user.name);
        changed = true;
      }
    }
    if (!att.userId && msg.name) {
      const name = publicName(msg.name.trim().slice(0, 80));
      if (name && name !== att.name) {
        att.name = name;
        changed = true;
      }
    }
    if (att.userId && !att.checkedIn) {
      const row = this.ctx.storage.sql
        .exec<{ user_id: string }>("SELECT user_id FROM checkins WHERE user_id = ?", att.userId)
        .toArray()[0];
      if (row) {
        att.checkedIn = true;
        changed = true;
      }
    }
    if (changed) ws.serializeAttachment(att);
    this.touchParticipant(att);
    this.markDirty("state");
    this.markDirty("poll");
    this.markDirty("quiz");
    this.markDirty("leaderboard");
    if (att.role === "host") {
      this.markDirty("stuck");
      this.markDirty("shipped");
    }
  }

  private async handleCheckin(ws: WebSocket, att: SocketAttachment): Promise<void> {
    if (!att.userId) {
      this.sendError(ws, "UNAUTHORIZED", "Check-in needs a registered account.");
      return;
    }
    if (att.checkedIn) {
      this.markDirty("state");
      return;
    }
    const at = nowIso();
    const result = await this.env.DB.prepare(
      "INSERT OR IGNORE INTO checkins (user_id, workshop_id, checked_in_at, is_simulated) VALUES (?, ?, ?, 0)",
    )
      .bind(att.userId, this.env.WORKSHOP_ID, at)
      .run();
    this.ctx.storage.sql.exec(
      "INSERT OR IGNORE INTO checkins (user_id, name, checked_in_at, is_simulated) VALUES (?, ?, ?, 0)",
      att.userId,
      att.name,
      at,
    );
    att.checkedIn = true;
    ws.serializeAttachment(att);
    this.touchParticipant(att);
    if ((result.meta.changes ?? 0) > 0) {
      await qualifyReferral(this.env.DB, att.userId);
      await Promise.all([
        this.env.CACHE.delete("leaderboard:students"),
        this.env.CACHE.delete("leaderboard:colleges"),
      ]);
      await recordEvent(this.env.DB, {
        type: "checkin",
        userId: att.userId,
        props: { workshopId: this.env.WORKSHOP_ID },
      });
    }
    this.markDirty("state");
  }

  private handlePollAnswer(
    ws: WebSocket,
    att: SocketAttachment,
    msg: LiveClientMessage & { type: "poll_answer" },
  ): void {
    const poll = this.activeQuestion("active_poll");
    if (!poll || poll.id !== msg.questionId) {
      this.sendError(ws, "CONFLICT", "That poll is no longer active.");
      return;
    }
    if (msg.option >= poll.options.length) {
      this.sendError(ws, "INVALID_INPUT", "That option does not exist.");
      return;
    }
    const cursor = this.ctx.storage.sql.exec(
      "INSERT OR IGNORE INTO poll_answers (question_id, participant_id, option, answered_at) VALUES (?, ?, ?, ?)",
      poll.id,
      att.participantId,
      msg.option,
      nowIso(),
    );
    if (cursor.rowsWritten > 0) this.markDirty("poll");
  }

  private handleQuizAnswer(
    ws: WebSocket,
    att: SocketAttachment,
    msg: LiveClientMessage & { type: "quiz_answer" },
  ): void {
    const quiz = this.activeQuestion("active_quiz");
    if (!quiz || quiz.id !== msg.questionId) {
      this.sendError(ws, "CONFLICT", "That quiz question is no longer active.");
      return;
    }
    if (msg.option >= quiz.options.length) {
      this.sendError(ws, "INVALID_INPUT", "That option does not exist.");
      return;
    }
    const isCorrect = quiz.correct === msg.option ? 1 : 0;
    const cursor = this.ctx.storage.sql.exec(
      "INSERT OR IGNORE INTO quiz_answers (question_id, participant_id, option, is_correct, answered_at) VALUES (?, ?, ?, ?, ?)",
      quiz.id,
      att.participantId,
      msg.option,
      isCorrect,
      nowIso(),
    );
    if (cursor.rowsWritten === 0) {
      this.sendError(ws, "CONFLICT", "You already answered this question.");
      return;
    }
    this.ctx.storage.sql.exec(
      `INSERT INTO quiz_scores (participant_id, name, score, updated_at) VALUES (?, ?, ?, ?)
       ON CONFLICT(participant_id) DO UPDATE SET
         score = quiz_scores.score + excluded.score,
         name = excluded.name,
         updated_at = excluded.updated_at`,
      att.participantId,
      att.name,
      isCorrect,
      nowIso(),
    );
    this.markDirty("quiz");
    this.markDirty("leaderboard");
  }

  private handleStuck(
    ws: WebSocket,
    att: SocketAttachment,
    msg: LiveClientMessage & { type: "stuck" },
  ): void {
    if (att.role !== "participant") {
      this.sendError(ws, "FORBIDDEN", "Only participants can ask for help.");
      return;
    }
    const note = msg.note?.trim() ? msg.note.trim() : null;
    this.ctx.storage.sql.exec(
      "INSERT INTO stuck (id, participant_id, name, note, resolved, created_at) VALUES (?, ?, ?, ?, 0, ?)",
      newId("stuck"),
      att.participantId,
      att.name,
      note,
      nowIso(),
    );
    this.markDirty("stuck");
  }

  private handleResolveStuck(
    ws: WebSocket,
    att: SocketAttachment,
    msg: LiveClientMessage & { type: "resolve_stuck" },
  ): void {
    if (att.role !== "host") {
      this.sendError(ws, "FORBIDDEN", "Host only.");
      return;
    }
    this.ctx.storage.sql.exec("UPDATE stuck SET resolved = 1 WHERE id = ?", msg.entryId);
    this.markDirty("stuck");
  }

  private handleShipped(
    ws: WebSocket,
    att: SocketAttachment,
    msg: LiveClientMessage & { type: "shipped" },
  ): void {
    if (att.role !== "participant") {
      this.sendError(ws, "FORBIDDEN", "Only participants can ship.");
      return;
    }
    const url = msg.url.trim();
    if (!/^https?:\/\/\S+$/i.test(url)) {
      this.sendError(ws, "INVALID_INPUT", "Add a link that starts with http:// or https://");
      return;
    }
    this.ctx.storage.sql.exec(
      "INSERT INTO shipped (id, participant_id, name, url, created_at) VALUES (?, ?, ?, ?, ?)",
      newId("ship"),
      att.participantId,
      att.name,
      url,
      nowIso(),
    );
    this.markDirty("shipped");
  }

  private handleAdvanceStep(
    ws: WebSocket,
    att: SocketAttachment,
    msg: LiveClientMessage & { type: "advance_step" },
  ): void {
    if (att.role !== "host") {
      this.sendError(ws, "FORBIDDEN", "Host only.");
      return;
    }
    const step = Math.min(MAX_STEP, Math.max(MIN_STEP, Math.round(msg.step)));
    this.setStateValue("step", String(step));
    this.markDirty("state");
  }

  private handleLaunchPoll(
    ws: WebSocket,
    att: SocketAttachment,
    msg: LiveClientMessage & { type: "launch_poll" },
  ): void {
    if (att.role !== "host") {
      this.sendError(ws, "FORBIDDEN", "Host only.");
      return;
    }
    const poll: ActiveQuestion = {
      id: `poll_${shortId(10)}`,
      question: msg.question,
      options: msg.options,
      correct: null,
    };
    this.setStateValue("active_poll", JSON.stringify(poll));
    this.markDirty("poll");
  }

  private handleLaunchQuiz(
    ws: WebSocket,
    att: SocketAttachment,
    msg: LiveClientMessage & { type: "launch_quiz" },
  ): void {
    if (att.role !== "host") {
      this.sendError(ws, "FORBIDDEN", "Host only.");
      return;
    }
    if (msg.correct >= msg.options.length) {
      this.sendError(ws, "INVALID_INPUT", "The correct option must be one of the options.");
      return;
    }
    const quiz: ActiveQuestion = {
      id: `quiz_${shortId(10)}`,
      question: msg.question,
      options: msg.options,
      correct: msg.correct,
    };
    this.setStateValue("active_quiz", JSON.stringify(quiz));
    this.markDirty("quiz");
  }
}
