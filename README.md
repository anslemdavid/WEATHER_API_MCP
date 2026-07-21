# 🌦️ weather-api-mcp

> Give Claude (or any MCP-compatible AI) live, real-world weather data — no API key, no signup, no cost.

---

## ✨ What is this?

This repo is a **ready-to-use MCP (Model Context Protocol) server configuration**. Drop it into Claude Code or Claude Desktop, and your AI assistant instantly gains the ability to check real weather — forecasts, alerts, air quality, and more — for anywhere in the world.

| | |
|---|---|
| 🔌 **Server** | [`@dangahagan/weather-mcp`](https://www.npmjs.com/package/@dangahagan/weather-mcp) |
| 🌍 **Coverage** | Worldwide (NOAA for the US, Open-Meteo globally) |
| 🔑 **API key needed** | **None** — completely free, zero signup |
| ⚙️ **Setup time** | ~2 minutes |

---

## 📦 What's inside

```
weather-api-mcp/
├── .mcp.json     ← tells Claude how to launch the weather server
└── README.md     ← you are here
```

---

## 🚀 Quick Start

### Option A — Claude Code

```bash
git clone <this-repo-url>
cd weather-api-mcp
claude
```

Claude Code auto-detects `.mcp.json`. If prompted, approve the project's MCP servers — or add this to `.claude/settings.json`:

```json
{
  "enableAllProjectMcpServers": true
}
```

### Option B — Claude Desktop

Copy the contents of `.mcp.json` into your Claude Desktop config file:

| OS | Config location |
|---|---|
| 🍎 macOS/Linux | `~/Library/Application Support/Claude/claude_desktop_config.json` |
| 🪟 Windows | `%AppData%\Claude\claude_desktop_config.json` |

Then **restart Claude Desktop**.

---

## ✅ Requirements

- Node.js installed (so `npx` can fetch and run the server)

That's it — no accounts, no API keys, no billing.

---

## 💬 Try it out

Once connected, just ask naturally:

> 🌤️ *"What's the weather in Munich this weekend?"*
> ⚠️ *"Any active weather alerts in Bavaria right now?"*
> 🌫️ *"What's the air quality like in Ingolstadt today?"*

The server fetches live data and Claude answers directly — no manual lookups needed.

---

## 🛠️ Troubleshooting

| Issue | Fix |
|---|---|
| Server doesn't show up | Restart Claude Code/Desktop after editing `.mcp.json` |
| `npx` command not found | Install Node.js from [nodejs.org](https://nodejs.org) |
| No weather data returned | Check your internet connection — the server calls NOAA/Open-Meteo live |

---

## 📄 License

This configuration is free to use, modify, and share. The underlying weather server (`@dangahagan/weather-mcp`) is MIT licensed.
