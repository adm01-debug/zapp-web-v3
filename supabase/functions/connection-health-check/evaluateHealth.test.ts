import { assertEquals } from "https://deno.land/std@0.224.0/assert/mod.ts";
import { evaluateHealth } from "./index.ts";

const NOW = new Date("2026-04-27T12:00:00Z");
const minutesAgo = (m: number) => new Date(NOW.getTime() - m * 60_000);
const hoursAgo = (h: number) => new Date(NOW.getTime() - h * 3600_000);

Deno.test("socket close → disconnected/socket_closed", () => {
  const r = evaluateHealth({ socketState: "close", ownerJid: null, lastActivityAt: null, now: NOW });
  assertEquals(r.healthStatus, "disconnected");
  assertEquals(r.dbStatus, "disconnected");
  assertEquals(r.reason, "socket_closed");
});

Deno.test("HTTP error → error/http_error", () => {
  const r = evaluateHealth({ socketState: null, ownerJid: null, lastActivityAt: null, now: NOW });
  assertEquals(r.healthStatus, "error");
  assertEquals(r.dbStatus, "disconnected");
  assertEquals(r.reason, "http_error");
});

Deno.test("socket open + sem owner → degraded/phantom_session (status=disconnected)", () => {
  const r = evaluateHealth({ socketState: "open", ownerJid: null, lastActivityAt: minutesAgo(1), now: NOW });
  assertEquals(r.healthStatus, "degraded");
  assertEquals(r.dbStatus, "disconnected");
  assertEquals(r.reason, "phantom_session");
});

Deno.test("socket open + owner + atividade recente → healthy", () => {
  const r = evaluateHealth({
    socketState: "open",
    ownerJid: "5511999998888@s.whatsapp.net",
    lastActivityAt: minutesAgo(5),
    now: NOW,
  });
  assertEquals(r.healthStatus, "healthy");
  assertEquals(r.dbStatus, "connected");
  assertEquals(r.reason, null);
});

Deno.test("socket open + owner + 1h sem msg → degraded/webhook_silent (ainda connected)", () => {
  const r = evaluateHealth({
    socketState: "open",
    ownerJid: "5511999998888@s.whatsapp.net",
    lastActivityAt: hoursAgo(1),
    now: NOW,
  });
  assertEquals(r.healthStatus, "degraded");
  assertEquals(r.dbStatus, "connected");
  assertEquals(r.reason, "webhook_silent");
});

Deno.test("socket open + owner + 8h sem msg → disconnected/stale_session", () => {
  const r = evaluateHealth({
    socketState: "open",
    ownerJid: "5511999998888@s.whatsapp.net",
    lastActivityAt: hoursAgo(8),
    now: NOW,
  });
  assertEquals(r.healthStatus, "disconnected");
  assertEquals(r.dbStatus, "disconnected");
  assertEquals(r.reason, "stale_session");
});

Deno.test("socket open + owner + sem atividade conhecida → healthy (não punir baixo volume sem dados)", () => {
  const r = evaluateHealth({
    socketState: "open",
    ownerJid: "5511999998888@s.whatsapp.net",
    lastActivityAt: null,
    now: NOW,
  });
  assertEquals(r.healthStatus, "healthy");
  assertEquals(r.dbStatus, "connected");
  assertEquals(r.reason, null);
});
