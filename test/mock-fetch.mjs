// Preloaded into the server process during tests (node --import). Replaces fetch
// so tests run offline, and fails loudly if the server requests any other URL.
import { readFileSync } from "node:fs";

const fixture = readFileSync(new URL("./fixtures/resume.json", import.meta.url), "utf8");
let calls = 0;

globalThis.fetch = async (url) => {
  calls++;
  process.stderr.write(`[mock-fetch] call ${calls}: ${url}\n`);
  if (String(url) !== "https://kaunteyacharya.com/resume.json") throw new Error(`Unexpected network call to ${url}`);
  if (process.env.MOCK_RESUME === "down") return new Response("Service Unavailable", { status: 503 });
  return new Response(fixture, { status: 200, headers: { "content-type": "application/json" } });
};
