import { assertEquals } from "https://deno.land/std@0.224.0/assert/mod.ts";
import { mergeCsvHeaderValues } from "../validation.ts";

Deno.test("mergeCsvHeaderValues: normaliza casing e remove duplicados", () => {
  const merged = mergeCsvHeaderValues(
    "Authorization, Content-Type, X-Request-Id",
    "authorization,content-type, x-request-id",
  );

  assertEquals(merged, "authorization, content-type, x-request-id");
});

Deno.test("mergeCsvHeaderValues: ignora valores vazios e espaços extras", () => {
  const merged = mergeCsvHeaderValues(
    "  authorization  ,   content-type  ",
    undefined,
    "",
    "x-client-info,   ",
  );

  assertEquals(merged, "authorization, content-type, x-client-info");
});

Deno.test("mergeCsvHeaderValues: preserva ordem de primeira ocorrência", () => {
  const merged = mergeCsvHeaderValues(
    "x-custom-b, x-custom-a",
    "x-custom-a, x-custom-c",
    "x-custom-b",
  );

  assertEquals(merged, "x-custom-b, x-custom-a, x-custom-c");
});
