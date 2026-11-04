"""Zero-key weather MCP server backed by Open-Meteo."""

from __future__ import annotations

import json
from datetime import date
from typing import Any
from urllib.error import HTTPError, URLError
from urllib.parse import urlencode
from urllib.request import Request, urlopen

from mcp.server.fastmcp import FastMCP

mcp = FastMCP("weather")

_GEOCODING_URL = "https://geocoding-api.open-meteo.com/v1/search"
_FORECAST_URL = "https://api.open-meteo.com/v1/forecast"
_TIMEOUT_SECONDS = 15

_WEATHER_CODES = {
    0: "Clear sky",
    1: "Mainly clear",
    2: "Partly cloudy",
    3: "Overcast",
    45: "Fog",
    48: "Depositing rime fog",
    51: "Light drizzle",
    53: "Moderate drizzle",
    55: "Dense drizzle",
    56: "Light freezing drizzle",
    57: "Dense freezing drizzle",
    61: "Slight rain",
    63: "Moderate rain",
    65: "Heavy rain",
    66: "Light freezing rain",
    67: "Heavy freezing rain",
    71: "Slight snow",
    73: "Moderate snow",
    75: "Heavy snow",
    77: "Snow grains",
    80: "Slight rain showers",
    81: "Moderate rain showers",
    82: "Violent rain showers",
    85: "Slight snow showers",
    86: "Heavy snow showers",
    95: "Thunderstorm",
    96: "Thunderstorm with slight hail",
    99: "Thunderstorm with heavy hail",
}


def _get_json(url: str, params: dict[str, Any]) -> dict[str, Any]:
    request = Request(
        f"{url}?{urlencode(params)}",
        headers={"User-Agent": "weather-api-mcp/1.1"},
    )
    try:
        with urlopen(request, timeout=_TIMEOUT_SECONDS) as response:
            return json.loads(response.read().decode("utf-8"))
    except (HTTPError, URLError, TimeoutError, json.JSONDecodeError) as exc:
        raise ValueError(f"Weather service request failed: {exc}") from exc


def _resolve_location(location: str) -> dict[str, Any]:
    name = location.strip()
    if not name:
        raise ValueError("Location must not be empty.")

    result = _get_json(
        _GEOCODING_URL,
        {"name": name, "count": 1, "language": "en", "format": "json"},
    )
    matches = result.get("results") or []
    if not matches:
        raise ValueError(f"Could not find a location named '{name}'.")
    return matches[0]


def _location_label(place: dict[str, Any]) -> str:
    parts = [place.get("name"), place.get("admin1"), place.get("country")]
    return ", ".join(dict.fromkeys(part for part in parts if part))


def _validated_unit(unit: str) -> str:
    normalized = unit.lower()
    if normalized not in {"celsius", "fahrenheit"}:
        raise ValueError("Unit must be 'celsius' or 'fahrenheit'.")
    return normalized


def _weather_data(place: dict[str, Any], **params: Any) -> dict[str, Any]:
    return _get_json(
        _FORECAST_URL,
        {
            "latitude": place["latitude"],
            "longitude": place["longitude"],
            "timezone": "auto",
            "wind_speed_unit": "kmh",
            **params,
        },
    )


def _condition(code: int | None) -> str:
    return _WEATHER_CODES.get(code, "Unknown")


@mcp.tool()
def get_weather(location: str, unit: str = "celsius") -> dict[str, Any]:
    """Get current weather for a place. Wind speed is returned in km/h."""
    temperature_unit = _validated_unit(unit)
    place = _resolve_location(location)
    data = _weather_data(
        place,
        current=(
            "temperature_2m,apparent_temperature,relative_humidity_2m,"
            "weather_code,wind_speed_10m,pressure_msl"
        ),
        temperature_unit=temperature_unit,
    )
    current = data.get("current")
    if not current:
        raise ValueError("The weather service returned no current conditions.")

    return {
        "location": _location_label(place),
        "temperature": current.get("temperature_2m"),
        "apparent_temperature": current.get("apparent_temperature"),
        "unit": "°F" if temperature_unit == "fahrenheit" else "°C",
        "condition": _condition(current.get("weather_code")),
        "humidity": current.get("relative_humidity_2m"),
        "wind_speed": current.get("wind_speed_10m"),
        "wind_speed_unit": "km/h",
        "pressure": current.get("pressure_msl"),
        "pressure_unit": "hPa",
        "observed_at": current.get("time"),
    }


@mcp.tool()
def get_forecast(
    location: str, days: int = 5, unit: str = "celsius"
) -> dict[str, Any]:
    """Get a daily weather forecast for 1–7 days for a location."""
    if not 1 <= days <= 7:
        raise ValueError("Days must be an integer from 1 to 7.")
    temperature_unit = _validated_unit(unit)
    place = _resolve_location(location)
    data = _weather_data(
        place,
        daily=(
            "temperature_2m_max,temperature_2m_min,weather_code,"
            "precipitation_probability_max"
        ),
        temperature_unit=temperature_unit,
        forecast_days=days,
    )
    daily = data.get("daily")
    if not daily:
        raise ValueError("The weather service returned no forecast data.")

    forecasts = []
    for index, forecast_date in enumerate(daily.get("time", [])):
        forecasts.append(
            {
                "date": date.fromisoformat(forecast_date).isoformat(),
                "high_temp": daily["temperature_2m_max"][index],
                "low_temp": daily["temperature_2m_min"][index],
                "unit": "°F" if temperature_unit == "fahrenheit" else "°C",
                "condition": _condition(daily["weather_code"][index]),
                "precipitation_chance": daily[
                    "precipitation_probability_max"
                ][index],
            }
        )
    return {"location": _location_label(place), "forecast": forecasts}


def main() -> None:
    """Run the MCP server over stdio."""
    mcp.run()


if __name__ == "__main__":
    main()
