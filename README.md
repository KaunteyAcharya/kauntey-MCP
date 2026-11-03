# kauntey-mcp

**My resume, as an MCP server.** Add it to Claude Desktop or Cursor and ask your own AI about my work, projects, and papers.

[![npm](https://img.shields.io/npm/v/kauntey-mcp)](https://www.npmjs.com/package/kauntey-mcp)
[![license](https://img.shields.io/npm/l/kauntey-mcp)](LICENSE)

I'm [Kauntey Acharya](https://kaunteyacharya.com), an AI Automation Engineer & Analyst at Innodata Inc., an AI strategist and consultant, and a quantitative analyst. Before that I was a theoretical physics researcher with four peer-reviewed papers on naked singularities and black-hole mimickers. Rather than reading a PDF, you can let your assistant query my profile directly and decide for yourself.

## Add it to Claude Desktop

Open **Settings → Developer → Edit Config** (this opens `claude_desktop_config.json`), add the `kauntey` entry, and restart Claude:

```json
{
  "mcpServers": {
    "kauntey": {
      "command": "npx",
      "args": ["-y", "kauntey-mcp"]
    }
  }
}
```

### Cursor

Add the same block to `~/.cursor/mcp.json` (all projects) or `.cursor/mcp.json` (one project).

### Claude Code

```bash
claude mcp add kauntey -- npx -y kauntey-mcp
```

You need Node.js 18 or newer. No API keys, no sign-up.

## Things to ask

> What has Kauntey built with RAG, and where can I see the code?

> Here's our job description: *[paste it]*. Which of Kauntey's projects and skills are relevant to it?

> Summarise Kauntey's physics papers in plain English, with DOIs.

## Tools

| Tool | What it returns |
| --- | --- |
| `get_profile` | Who I am: headline, bio, current role, location and time zone, and availability |
| `get_experience` | Work history with dates and highlights |
| `get_projects` | Projects with descriptions, tech used, and GitHub / demo / write-up links. Optional `technology` filter |
| `get_publications` | My 4 peer-reviewed physics papers with authors, journal, year, and DOI |
| `get_skills` | Skills grouped by area |
| `get_services` | What I offer as an AI consultant, each linked to real work, plus how an engagement runs |
| `find_relevant_work` | Takes a topic, a question, or a full job description and returns the matching projects, notes, experience, papers, and skills, with the terms each one matched |
| `get_contact` | Email, LinkedIn, GitHub, and a booking link when available |

## How it works

- **Always current.** The package contains no data about me. At runtime it fetches [`kaunteyacharya.com/resume.json`](https://kaunteyacharya.com/resume.json) and caches it in memory for 5 minutes. When I update my site, every install picks up the change within minutes, with no reinstall or update needed.
- **Facts, not verdicts.** No tool scores, rates, or judges my suitability for anything. They return facts and links; your model does the reasoning, and you can check every claim against its source.
- **No made-up answers.** If the site is unreachable, tools return a clear error pointing to [kaunteyacharya.com](https://kaunteyacharya.com). There is no fallback copy.
- **Private.** No telemetry, no analytics. The only network request it ever makes is that one `GET` for `resume.json`.

## Development

```bash
npm install
npm test
```

`npm test` builds the server and runs it end to end over stdio with a real MCP client. Network access is stubbed, so the tests run offline and fail if the server requests any URL other than `resume.json`.

## Contact

[kaunteyacharya2000@gmail.com](mailto:kaunteyacharya2000@gmail.com) · [LinkedIn](https://www.linkedin.com/in/kauntey-acharya) · [kaunteyacharya.com](https://kaunteyacharya.com)

MIT licensed.
