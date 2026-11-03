import { test } from "node:test";
import assert from "node:assert/strict";
import { fileURLToPath } from "node:url";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";

const server = fileURLToPath(new URL("../dist/index.js", import.meta.url));
const mock = new URL("./mock-fetch.mjs", import.meta.url).href;

async function connect(mode = "ok") {
  const transport = new StdioClientTransport({
    command: process.execPath,
    args: ["--import", mock, server],
    env: { ...process.env, MOCK_RESUME: mode },
    stderr: "pipe",
  });
  let log = "";
  transport.stderr?.on("data", (d) => (log += d));
  const client = new Client({ name: "test", version: "0.0.0" });
  await client.connect(transport);
  const close = async () => {
    await client.close();
    transport.stderr?.destroy(); // an open stderr pipe would keep the test runner alive
  };
  return { client, close, fetchCalls: () => (log.match(/\[mock-fetch\] call/g) ?? []).length };
}

const parse = (res) => JSON.parse(res.content[0].text);
const TOOLS = [
  "get_profile", "get_experience", "get_projects", "get_publications",
  "get_skills", "get_services", "find_relevant_work", "get_contact",
];
// Design rule: no verdicts, scores, or judgements anywhere in the output.
const FORBIDDEN_KEY = /score|rating|fit|weakness|verdict|recommend|suitab|hire/i;

function assertNoVerdictKeys(value, path = "$") {
  if (Array.isArray(value)) return value.forEach((v, i) => assertNoVerdictKeys(v, `${path}[${i}]`));
  if (value && typeof value === "object") {
    for (const [k, v] of Object.entries(value)) {
      assert.ok(!FORBIDDEN_KEY.test(k), `forbidden key ${path}.${k}`);
      assertNoVerdictKeys(v, `${path}.${k}`);
    }
  }
}

test("exposes exactly the eight tools, all read-only", async () => {
  const { client, close } = await connect();
  const { tools } = await client.listTools();
  assert.deepEqual(tools.map((t) => t.name).sort(), [...TOOLS].sort());
  for (const t of tools) assert.equal(t.annotations?.readOnlyHint, true, t.name);
  await close();
});

test("every tool returns live data, no verdict fields, and one cached fetch", async () => {
  const { client, close, fetchCalls } = await connect();
  for (const name of TOOLS) {
    const args = name === "find_relevant_work" ? { topic: "RAG" } : {};
    const res = await client.callTool({ name, arguments: args });
    assert.ok(!res.isError, `${name}: ${res.content[0].text}`);
    const data = parse(res);
    assert.equal(data.source, "https://kaunteyacharya.com/resume.json");
    assertNoVerdictKeys(data);
  }
  assert.equal(fetchCalls(), 1, "resume should be fetched once and cached");
  await close();
});

test("profile, publications and contact carry the expected facts", async () => {
  const { client, close } = await connect();
  const profile = parse(await client.callTool({ name: "get_profile", arguments: {} }));
  assert.equal(profile.name, "Kauntey Acharya");
  assert.equal(profile.currentRole.organization, "Innodata Inc.");
  const pubs = parse(await client.callTool({ name: "get_publications", arguments: {} }));
  assert.equal(pubs.count, 4);
  assert.ok(pubs.publications.every((p) => p.doi));
  const contact = parse(await client.callTool({ name: "get_contact", arguments: {} }));
  assert.equal(contact.email, "kaunteyacharya2000@gmail.com");
  assert.equal(contact.bookingUrl, null);
  await close();
});

test("get_projects filters by technology", async () => {
  const { client, close } = await connect();
  const res = parse(await client.callTool({ name: "get_projects", arguments: { technology: "chromadb" } }));
  assert.ok(res.count >= 2);
  assert.ok(res.projects.every((p) => JSON.stringify(p).toLowerCase().includes("chromadb")));
  await close();
});

test("find_relevant_work handles a job description with evidence only", async () => {
  const { client, close } = await connect();
  const jd = `We are hiring an ML Engineer. You will build retrieval-augmented generation pipelines,
    evaluate large language models, monitor model drift in production, and automate workflows with n8n.
    Strong Python, Docker and PostgreSQL required.`;
  const res = parse(await client.callTool({ name: "find_relevant_work", arguments: { topic: jd } }));
  const skills = res.matchedSkills.map((s) => s.skill);
  for (const s of ["Python", "Docker", "Postgres", "n8n", "RAG"]) assert.ok(skills.includes(s), `missing skill ${s}`);
  const projects = res.projects.map((p) => p.name);
  assert.ok(projects.some((n) => n.includes("RAG")), "RAG project expected");
  assert.ok(projects.some((n) => n.includes("Drift")), "drift project expected");
  assert.ok(res.projects.every((p) => p.matchedTerms.length > 0));
  assertNoVerdictKeys(res);
  await close();
});

test("find_relevant_work returns empty lists, not invented matches, for unrelated topics", async () => {
  const { client, close } = await connect();
  const res = parse(await client.callTool({ name: "find_relevant_work", arguments: { topic: "underwater basket weaving" } }));
  assert.equal(res.projects.length, 0);
  assert.equal(res.matchedSkills.length, 0);
  await close();
});

test("unreachable resume.json gives a clear error pointing to the site", async () => {
  const { client, close } = await connect("down");
  const res = await client.callTool({ name: "get_profile", arguments: {} });
  assert.equal(res.isError, true);
  assert.match(res.content[0].text, /kaunteyacharya\.com/);
  assert.match(res.content[0].text, /HTTP 503/);
  assert.doesNotMatch(res.content[0].text, /Innodata/);
  await close();
});
