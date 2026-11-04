"""stdio MCP entry point for live Open-Meteo weather tools."""

from __future__ import annotations

from mcp.server.fastmcp import FastMCP

from weather_mcp.weather import WeatherError, get_forecast as fetch_forecast, get_weather as fetch_weather

mcp = FastMCP("weather-mcp")


@mcp.tool()
def get_weather(location: str, unit: str = "celsius") -> dict:
    """Get current live weather for a city or place name. Unit may be celsius or fahrenheit."""
    try:
        return fetch_weather(location, unit)
    except WeatherError as exc:
        return {"error": str(exc)}


@mcp.tool()
def get_forecast(location: str, days: int = 5, unit: str = "celsius") -> dict:
    """Get a live daily forecast for 1–7 days, including conditions, rain chance, sunrise, and UV."""
    try:
        return fetch_forecast(location, days, unit)
    except WeatherError as exc:
        return {"error": str(exc)}


def main() -> None:
    """Run the MCP server over stdio."""
    mcp.run(transport="stdio")


if __name__ == "__main__":
    main()
