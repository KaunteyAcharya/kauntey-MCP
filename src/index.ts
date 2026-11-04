#!/usr/bin/env node
// kauntey-mcp: an MCP server that answers questions about Kauntey Acharya.
// All data is fetched live from https://kaunteyacharya.com/resume.json.
// Tools return facts and evidence only, never a verdict about suitability.

import { createRequire } from "node:module";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import { getResume, RESUME_URL, ResumeUnavailableError, type Resume } from "./resume.js";
import { findRelevantWork } from "./search.js";

const { version } = createRequire(import.meta.url)("../package.json") as { version: string };

const server = new McpServer(
  { name: "kauntey-mcp", version },
  {
    instructions:
      "These tools return facts about Kauntey Acharya (AI Automation Engineer, AI strategist and consultant, " +
      `quantitative analyst, former theoretical physics researcher), fetched live from ${RESUME_URL}. ` +
      "They return evidence only and never judge suitability for a role: do that reasoning yourself, " +
      "and cite the project, paper, and note links they return.",
  },
);

const READ_ONLY = { readOnlyHint: true, openWorldHint: true, idempotentHint: true } as const;

// Sections with a dedicated tool. Anything else in resume.json goes out through get_profile.
const SECTIONS_WITH_TOOLS = new Set([
  "$schema", "basics", "work", "education", "skills", "projects", "publications",
  "services", "engagementProcess", "notes", "interests", "meta",
]);

type ToolResult = { content: { type: "text"; text: string }[]; isError?: boolean };

/** Runs a tool body against the live resume, turning fetch failures into a clear tool error. */
async function answer(build: (resume: Resume) => unknown): Promise<ToolResult> {
  try {
    const data = build(await getResume());
    return { content: [{ type: "text", text: JSON.stringify({ ...(data as object), source: RESUME_URL }, null, 2) }] };
  } catch (err) {
    const message =
      err instanceof ResumeUnavailableError ? err.message : `Unexpected error: ${err instanceof Error ? err.message : err}`;
    return { content: [{ type: "text", text: message }], isError: true };
  }
}

server.registerTool(
  "get_profile",
  {
    title: "Profile",
    description:
      "Who Kauntey Acharya is: name, headline, positioning line, bio, current role, location and time zone, availability status and notice period, " +
      "plus any other details and sections published in his resume.",
    annotations: READ_ONLY,
  },
  () =>
    answer((resume) => {
      const { basics = {}, work = [], interests = [] } = resume;
      const { name, label, positioning, summary, location, timezone, availability, url, profiles, image, email, contact, ...otherDetails } = basics;
      const current = work.find((w) => !w.endDate);
      const otherSections = Object.entries(resume).filter(([key]) => !SECTIONS_WITH_TOOLS.has(key));
      return {
        name,
        headline: label,
        positioning,
        summary,
        currentRole: current ? { position: current.position, organization: current.name, since: current.startDate } : null,
        location,
        timezone,
        availability,
        website: url,
        profiles,
        interests: interests.map((i) => i.name),
        ...otherDetails,
        ...Object.fromEntries(otherSections),
      };
    }),
);

server.registerTool(
  "get_experience",
  {
    title: "Work experience",
    description: "Kauntey's work history, most recent first (organization, position, dates, summary, highlights), and his education.",
    annotations: READ_ONLY,
  },
  () => answer(({ work = [], education = [] }) => ({ experience: work, education })),
);

server.registerTool(
  "get_projects",
  {
    title: "Projects",
    description:
      "Kauntey's projects with descriptions, technologies used, and links (GitHub repo, live demo, write-up note). " +
      "Optionally filter by a technology such as 'n8n', 'RAG', or 'Postgres'.",
    inputSchema: {
      technology: z.string().optional().describe("Only return projects whose tech tags or description mention this."),
    },
    annotations: READ_ONLY,
  },
  ({ technology }) =>
    answer(({ projects = [] }) => {
      const needle = technology?.trim().toLowerCase();
      const list = needle
        ? projects.filter((p) =>
            [p.name, p.description, ...(p.keywords ?? [])].some((s) => s?.toLowerCase().includes(needle)),
          )
        : projects;
      return { filter: technology ?? null, count: list.length, projects: list };
    }),
);

server.registerTool(
  "get_publications",
  {
    title: "Publications",
    description:
      "Kauntey's peer-reviewed theoretical physics papers (naked singularities, black-hole mimickers, energy extraction) with authors, journal, year, and DOI.",
    annotations: READ_ONLY,
  },
  () => answer(({ publications = [] }) => ({ count: publications.length, publications })),
);

server.registerTool(
  "get_skills",
  {
    title: "Skills",
    description: "Kauntey's skills grouped by area (AI & agents, automation & engineering, languages & data, quant & research, physics).",
    annotations: READ_ONLY,
  },
  () => answer(({ skills = [] }) => ({ skills: skills.map((s) => ({ area: s.name, skills: s.keywords ?? [] })) })),
);

server.registerTool(
  "get_services",
  {
    title: "Consulting services",
    description:
      "What Kauntey offers as an AI consultant, each with links to work that shows it, plus how an engagement runs and current availability.",
    annotations: READ_ONLY,
  },
  () =>
    answer(({ services = [], engagementProcess = [], basics = {} }) => ({
      services,
      howItWorks: engagementProcess,
      availability: basics.availability,
    })),
);

server.registerTool(
  "find_relevant_work",
  {
    title: "Find relevant work",
    description:
      "Search Kauntey's projects, notes, experience, education, papers, services, and skills for a topic, question, or pasted job description. " +
      "Returns the matching items and which terms each matched, as evidence. It does not score or judge fit.",
    inputSchema: {
      topic: z
        .string()
        .min(1)
        .max(20_000)
        .describe("A topic ('RAG', 'model monitoring'), a question, or a full job description."),
      limit: z.number().int().min(1).max(20).optional().describe("Max items per category (default 5)."),
    },
    annotations: READ_ONLY,
  },
  ({ topic, limit }) => answer((resume) => findRelevantWork(resume, topic, limit ?? 5)),
);

server.registerTool(
  "get_contact",
  {
    title: "Contact",
    description: "How to reach Kauntey: email, LinkedIn, GitHub, website, and a booking link when one is available.",
    annotations: READ_ONLY,
  },
  () =>
    answer(({ basics = {} }) => ({
      ...basics.contact,
      email: basics.contact?.email ?? basics.email,
      bookingUrl: basics.contact?.bookingUrl ?? null,
      timezone: basics.timezone,
      profiles: basics.profiles,
    })),
);

await server.connect(new StdioServerTransport());
