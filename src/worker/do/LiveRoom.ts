/**
 * WS6 — LiveRoom Durable Object (SQLite + WebSocket Hibernation).
 * Phase 0 stub; WS6 replaces this file.
 */
import { DurableObject } from "cloudflare:workers";

export class LiveRoom extends DurableObject<Env> {
  async fetch(): Promise<Response> {
    return Response.json({ error: { code: "NOT_FOUND", message: "LiveRoom stub" } }, { status: 501 });
  }
}
