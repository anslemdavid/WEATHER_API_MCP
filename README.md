# 🌦️ Weather API MCP

A zero-API-key weather MCP server rewritten in Python, backed by live data from [Open-Meteo](https://open-meteo.com/). It also includes a responsive weather dashboard with animated 3D scenes, interactive forecasts, and location search.

## What’s included

- **Live weather, not mock data:** current conditions and forecasts come from Open-Meteo.
- **MCP tools:** `get_weather` and `get_forecast`, available over stdio for Claude Desktop and other MCP clients.
- **No weather API key:** Open-Meteo’s public endpoints provide geocoding and forecast data without a key.
- **Animated 3D dashboard:** Three.js sky, animated weather particles, live clock, location search, geolocation, and Celsius/Fahrenheit toggle.
- **Python-first setup:** install with `uv` or `pip`; no Node runtime required for the Python server or dashboard.

## Run the MCP server

Python 3.10+ and [uv](https://docs.astral.sh/uv/) are recommended:

```bash
uv sync
uv run weather-mcp
```

Or install with pip:

```bash
python -m pip install .
weather-mcp
```

The MCP server uses stdio. Configure your MCP client with the absolute repository path:

```json
{
  "mcpServers": {
    "weather": {
      "command": "uv",
      "args": [
        "--directory",
        "/absolute/path/to/WEATHER_API_MCP",
        "run",
        "weather-mcp"
      ]
    }
  }
}
```

The repository `.mcp.json` is a template; replace `/ABSOLUTE/PATH/TO/WEATHER_API_MCP` with your local checkout path before using it.

### MCP tools

- `get_weather(location, unit="celsius")` — live conditions, humidity, feels-like temperature, wind, pressure, precipitation, and local observation time. `unit` accepts `celsius` or `fahrenheit`.
- `get_forecast(location, days=5, unit="celsius")` — daily highs/lows, condition, precipitation chance, sunrise/sunset, UV index, and wind for 1–7 days.

Locations are resolved using Open-Meteo geocoding. The server reports an error for unknown locations instead of silently returning unrelated weather. Network/API failures are reported clearly; no fake readings are generated.

## Run the 3D dashboard

```bash
uv run weather-dashboard
```

Open <http://127.0.0.1:8000>. To choose a different port:

```bash
uv run weather-dashboard --port 8080
```

The dashboard retrieves live data directly from Open-Meteo in your browser. The Three.js library is loaded from a CDN, so the 3D scene requires an internet connection; the weather details and responsive layout remain usable if the animation library is unavailable. Use the location search, **Use my location**, or the °C/°F switch. Geolocation requires localhost or HTTPS and your permission.

## Development

```bash
uv sync --extra dev
uv run pytest
```

## Data and privacy

Weather and location searches are sent to Open-Meteo. The dashboard only requests browser location after you click **Use my location**. No API key, account, or location storage is used by this project.

## License

MIT
