# 🌦️ Weather API MCP

A zero-configuration Model Context Protocol (MCP) weather server for Claude and other MCP clients. It provides current conditions and forecasts using the free Open-Meteo APIs—no weather API key required.

## Features

- Current weather for locations worldwide
- Forecasts for 1–7 days
- Celsius or Fahrenheit temperatures
- No weather API key required
- Python implementation using the MCP Python SDK

## SkyWear browser preview

The project also has a standalone **SkyWear** weather-and-outfit preview: a responsive, animated interface that pairs weather conditions with practical clothing suggestions. Its design includes current conditions, hourly and 7-day forecasts, sunrise and sunset, wind, humidity, UV and air-quality details, location favorites, temperature-unit switching, sharing, and English, German, French, Spanish, and Kiswahili language options.

The supplied preview is currently configured with `DEMO=true`. It shows sample data for Ingolstadt, hides the city-search form, and does not make live weather requests. The HTML contains a live-data path using Open-Meteo geocoding, forecast, and air-quality APIs; set `DEMO=false` to use that path. Browser geolocation requires the page to be served from a secure context (HTTPS or localhost).

The browser preview is a separate frontend concept; it is not the MCP server itself. The MCP server continues to run over stdio for MCP clients.

## Requirements

- Python 3.10+
- [`uv`](https://docs.astral.sh/uv/)

## Install and run

```bash
uv sync
uv run weather-mcp
```

The server uses stdio transport for MCP clients. To install it into the active Python environment instead, run `pip install -e .` and then `weather-mcp`.

## Configure Claude Desktop

After installing the project with `uv sync`, add the following to your Claude Desktop MCP configuration, replacing `/absolute/path/to/WEATHER_API_MCP` with this repository's directory:

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

## Tools

### `get_weather`

Parameters: `location` (string), `unit` (`celsius` or `fahrenheit`, optional; defaults to Celsius).

Returns the resolved location, temperature, apparent temperature, weather condition, humidity, wind speed, and pressure.

### `get_forecast`

Parameters: `location` (string), `days` (integer from 1 to 7, optional; defaults to 5), and `unit` (`celsius` or `fahrenheit`, optional; defaults to Celsius).

Returns daily high and low temperatures, conditions, and precipitation probabilities.

## Data source

Location lookup and weather data are provided by [Open-Meteo](https://open-meteo.com/). Internet access is required for live weather; no account or API key is needed.
