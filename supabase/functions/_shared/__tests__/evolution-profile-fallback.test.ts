import { assertEquals } from "https://deno.land/std@0.224.0/assert/mod.ts";
import {
  mapFetchInstancesToProfile,
  shouldFallbackForProfile,
} from "../evolution-profile-fallback.ts";

const INSTANCE = "wpp2";

Deno.test("mapFetchInstancesToProfile: array of `{instance: ...}` (v2 default)", () => {
  const data = [{
    instance: {
      instanceName: INSTANCE,
      ownerJid: "5511999999999@s.whatsapp.net",
      profileName: "Promo Brindes",
      profilePicUrl: "https://x/pic.jpg",
      profileStatus: "Disponível",
    },
  }];
  const r = mapFetchInstancesToProfile(data, INSTANCE);
  assertEquals(r, {
    wuid: "5511999999999@s.whatsapp.net",
    name: "Promo Brindes",
    picture: "https://x/pic.jpg",
    status: { status: "Disponível" },
    _source: "fetchInstances-fallback",
  });
});

Deno.test("mapFetchInstancesToProfile: bare instance objects (no `instance` wrapper)", () => {
  const data = [{
    instanceName: INSTANCE,
    ownerJid: "5511@s.whatsapp.net",
    profileName: "X",
    profilePicUrl: null,
    profileStatus: null,
  }];
  const r = mapFetchInstancesToProfile(data, INSTANCE);
  assertEquals(r?.wuid, "5511@s.whatsapp.net");
  assertEquals(r?.name, "X");
  assertEquals(r?.picture, null);
  assertEquals(r?.status, null);
  assertEquals(r?._source, "fetchInstances-fallback");
});

Deno.test("mapFetchInstancesToProfile: single-instance object (`{instance: ...}`)", () => {
  const data = {
    instance: {
      instanceName: INSTANCE,
      ownerJid: "5511@s.whatsapp.net",
      profileName: "Y",
      profilePicUrl: "https://x/y.jpg",
    },
  };
  const r = mapFetchInstancesToProfile(data, INSTANCE);
  assertEquals(r?.wuid, "5511@s.whatsapp.net");
  assertEquals(r?.name, "Y");
});

Deno.test("mapFetchInstancesToProfile: `{data: [...]}` proxy wrapper", () => {
  const data = {
    data: [{
      instance: {
        instanceName: INSTANCE,
        ownerJid: "5511@s.whatsapp.net",
        profileName: "Z",
      },
    }],
  };
  const r = mapFetchInstancesToProfile(data, INSTANCE);
  assertEquals(r?.wuid, "5511@s.whatsapp.net");
  assertEquals(r?.name, "Z");
});

Deno.test("mapFetchInstancesToProfile: instanceName mismatch returns null when multiple candidates", () => {
  const data = [
    { instance: { instanceName: "other", ownerJid: "x" } },
    { instance: { instanceName: "another", ownerJid: "y" } },
  ];
  const r = mapFetchInstancesToProfile(data, INSTANCE);
  assertEquals(r, null);
});

Deno.test("mapFetchInstancesToProfile: single candidate without name match falls back to it", () => {
  // Single-instance query — even if the name doesn't match, the only result
  // is what the user asked for (Evolution sometimes drops the filter).
  const data = [{ instance: { ownerJid: "5511@s.whatsapp.net", profileName: "Sole" } }];
  const r = mapFetchInstancesToProfile(data, INSTANCE);
  assertEquals(r?.wuid, "5511@s.whatsapp.net");
  assertEquals(r?.name, "Sole");
});

Deno.test("mapFetchInstancesToProfile: empty array returns null", () => {
  assertEquals(mapFetchInstancesToProfile([], INSTANCE), null);
});

Deno.test("mapFetchInstancesToProfile: null/undefined returns null", () => {
  assertEquals(mapFetchInstancesToProfile(null, INSTANCE), null);
  assertEquals(mapFetchInstancesToProfile(undefined, INSTANCE), null);
});

Deno.test("mapFetchInstancesToProfile: instance present but all profile fields empty returns null", () => {
  const data = [{ instance: { instanceName: INSTANCE } }];
  assertEquals(mapFetchInstancesToProfile(data, INSTANCE), null);
});

Deno.test("shouldFallbackForProfile: error envelope with status 404 → true", () => {
  assertEquals(
    shouldFallbackForProfile({ error: true, status: 404, message: "Not Found" }),
    true,
  );
});

Deno.test("shouldFallbackForProfile: error envelope with status 410/501 → true", () => {
  assertEquals(shouldFallbackForProfile({ error: true, status: 410 }), true);
  assertEquals(shouldFallbackForProfile({ error: true, status: 501 }), true);
});

Deno.test("shouldFallbackForProfile: 'Cannot GET' message → true", () => {
  assertEquals(
    shouldFallbackForProfile({ error: true, status: 200, message: "Cannot GET /profile/x" }),
    true,
  );
});

Deno.test("shouldFallbackForProfile: empty envelope (just `version`) → true", () => {
  assertEquals(shouldFallbackForProfile({ version: 1 }), true);
});

Deno.test("shouldFallbackForProfile: real profile payload → false", () => {
  assertEquals(
    shouldFallbackForProfile({
      version: 1,
      wuid: "5511@s.whatsapp.net",
      name: "X",
      picture: "https://x/y.jpg",
    }),
    false,
  );
});

Deno.test("shouldFallbackForProfile: error 500 → false (server error, not missing route)", () => {
  assertEquals(
    shouldFallbackForProfile({ error: true, status: 500, message: "Internal" }),
    false,
  );
});

Deno.test("shouldFallbackForProfile: null/non-object → false", () => {
  assertEquals(shouldFallbackForProfile(null), false);
  assertEquals(shouldFallbackForProfile("string"), false);
});
