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
  if (process.env.MOCK_RESUME === "extended") {
    // Simulates Kauntey adding new details to resume.json after publishing.
    const resume = JSON.parse(fixture);
    resume.education = [{ institution: "Example University", studyType: "MSc", area: "Physics" }];
    resume.basics.availability.noticePeriod = "30 days";
    resume.basics.workAuthorization = "India";
    resume.certificates = [{ name: "Example Certificate" }];
    return new Response(JSON.stringify(resume), { status: 200, headers: { "content-type": "application/json" } });
  }
  return new Response(fixture, { status: 200, headers: { "content-type": "application/json" } });
};
