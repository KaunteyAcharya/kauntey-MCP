# kauntey-mcp

**Ask your AI about Kauntey Acharya's work, projects, and papers.**

You need [Node.js](https://nodejs.org) 18 or newer. No API key or sign-up.

## Claude Desktop

Open **Settings → Developer → Edit Config**, add this, and restart Claude:

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

## Claude Code

```bash
claude mcp add kauntey -- npx -y kauntey-mcp
```

## Cursor

Add the same JSON block as Claude Desktop to `~/.cursor/mcp.json`.

## Other MCP clients

Any app that supports local (stdio) MCP servers can use this command:

```bash
npx -y kauntey-mcp
```

## Things to ask

> What has Kauntey built with RAG, and where can I see the code?

> Here's our job description: *[paste it]*. Which of Kauntey's projects and skills are relevant to it?

> Summarise Kauntey's physics papers in plain English, with DOIs.

## Tools

| Tool | What it returns |
| --- | --- |
| `get_profile` | Headline, bio, current role, location, availability, and notice period |
| `get_experience` | Work history and education |
| `get_projects` | Projects with tech used and links |
| `get_publications` | Peer-reviewed physics papers with DOIs |
| `get_skills` | Skills grouped by area |
| `get_services` | Consulting services and how an engagement runs |
| `find_relevant_work` | Matching work for a topic, question, or job description |
| `get_contact` | Email, LinkedIn, GitHub, and booking link when available |

## Contact

[kaunteyacharya2000@gmail.com](mailto:kaunteyacharya2000@gmail.com) · [LinkedIn](https://www.linkedin.com/in/kauntey-acharya) · [kaunteyacharya.com](https://kaunteyacharya.com)
