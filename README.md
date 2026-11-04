# 🌦️ Weather API MCP

A zero-configuration Model Context Protocol (MCP) weather server for Claude and other MCP clients. It provides current conditions and forecasts using the free Open-Meteo APIs—no weather API key required.

## Features

- Current weather for locations worldwide
- Forecasts for 1–7 days
- Celsius or Fahrenheit temperatures
- No weather API key required
- Python implementation using the MCP Python SDK

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

Location lookup and weather data are provided by [Open-Meteo](https://open-meteo.com/). Internet access is required; no account or API key is needed.
