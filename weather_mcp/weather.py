"""Live weather lookups using Open-Meteo's free geocoding and forecast APIs."""

from __future__ import annotations

from datetime import datetime
from typing import Any
from zoneinfo import ZoneInfo, ZoneInfoNotFoundError

import httpx

GEOCODING_URL = "https://geocoding-api.open-meteo.com/v1/search"
FORECAST_URL = "https://api.open-meteo.com/v1/forecast"
TIMEOUT = httpx.Timeout(15.0, connect=5.0)


class WeatherError(Exception):
    """A useful, user-facing weather lookup error."""


def _get_json(url: str, params: dict[str, Any]) -> dict[str, Any]:
    try:
        response = httpx.get(
            url,
            params=params,
            timeout=TIMEOUT,
            headers={"User-Agent": "weather-api-mcp/2.0 (Open-Meteo client)"},
        )
        response.raise_for_status()
        return response.json()
    except httpx.TimeoutException as exc:
        raise WeatherError("The weather service took too long to respond. Please try again.") from exc
    except httpx.HTTPStatusError as exc:
        raise WeatherError(f"The weather service returned HTTP {exc.response.status_code}.") from exc
    except (httpx.RequestError, ValueError) as exc:
        raise WeatherError("Could not reach the weather service. Check your internet connection and try again.") from exc


def geocode(location: str) -> dict[str, Any]:
    query = " ".join(location.split()) if isinstance(location, str) else ""
    if not query:
        raise WeatherError("Enter a city or place name to look up weather.")
    data = _get_json(
        GEOCODING_URL,
        {"name": query, "count": 1, "language": "en", "format": "json"},
    )
    results = data.get("results") or []
    if not results:
        raise WeatherError(f"No location found for “{query}”. Try a city and country, such as “Paris, France”.")
    place = results[0]
    return {
        "name": place.get("name", query),
        "admin1": place.get("admin1"),
        "country": place.get("country"),
        "latitude": place["latitude"],
        "longitude": place["longitude"],
        "timezone": place.get("timezone", "auto"),
    }


def _place_label(place: dict[str, Any]) -> str:
    parts = [place.get("name"), place.get("admin1"), place.get("country")]
    label = ", ".join(dict.fromkeys(part for part in parts if part))
    return label or "Unknown location"


def _weather_description(code: int | None) -> str:
    if code is None:
        return "Unknown"
    if code == 0:
        return "Clear sky"
    if code in (1, 2):
        return "Mainly clear" if code == 1 else "Partly cloudy"
    if code == 3:
        return "Overcast"
    if code in (45, 48):
        return "Fog"
    if code in (51, 53, 55, 56, 57):
        return "Drizzle"
    if code in (61, 63, 65, 66, 67):
        return "Rain"
    if code in (71, 73, 75, 77):
        return "Snow"
    if code in (80, 81, 82):
        return "Rain showers"
    if code in (85, 86):
        return "Snow showers"
    if code in (95, 96, 99):
        return "Thunderstorm"
    return "Unknown"


def _timezone_time(iso_time: str | None, timezone: str) -> str | None:
    if not iso_time:
        return None
    try:
        parsed = datetime.fromisoformat(iso_time)
        return parsed.replace(tzinfo=ZoneInfo(timezone)).isoformat() if parsed.tzinfo is None else parsed.isoformat()
    except (ValueError, ZoneInfoNotFoundError):
        return iso_time


def get_weather(location: str, unit: str = "celsius") -> dict[str, Any]:
    """Return current live weather conditions for a named location."""
    unit = unit.lower().strip() if isinstance(unit, str) else ""
    if unit not in ("celsius", "fahrenheit"):
        raise WeatherError("Unit must be either 'celsius' or 'fahrenheit'.")
    place = geocode(location)
    temperature_unit = "fahrenheit" if unit == "fahrenheit" else "celsius"
    data = _get_json(
        FORECAST_URL,
        {
            "latitude": place["latitude"],
            "longitude": place["longitude"],
            "current": (
                "temperature_2m,relative_humidity_2m,apparent_temperature,is_day,"
                "precipitation,rain,weather_code,cloud_cover,pressure_msl,"
                "wind_speed_10m,wind_direction_10m"
            ),
            "temperature_unit": temperature_unit,
            "wind_speed_unit": "kmh",
            "timezone": place["timezone"],
        },
    )
    current = data.get("current")
    if not current:
        raise WeatherError("The weather service did not return current conditions for this location.")
    return {
        "location": _place_label(place),
        "latitude": place["latitude"],
        "longitude": place["longitude"],
        "observed_at": current.get("time"),
        "timezone": data.get("timezone", place["timezone"]),
        "temperature": current.get("temperature_2m"),
        "temperature_unit": "°F" if unit == "fahrenheit" else "°C",
        "feels_like": current.get("apparent_temperature"),
        "condition": _weather_description(current.get("weather_code")),
        "weather_code": current.get("weather_code"),
        "is_day": bool(current.get("is_day")),
        "humidity_percent": current.get("relative_humidity_2m"),
        "precipitation_mm": current.get("precipitation"),
        "rain_mm": current.get("rain"),
        "cloud_cover_percent": current.get("cloud_cover"),
        "wind_speed_kmh": current.get("wind_speed_10m"),
        "wind_direction_degrees": current.get("wind_direction_10m"),
        "pressure_hpa": current.get("pressure_msl"),
        "source": "Open-Meteo",
    }


def get_forecast(location: str, days: int = 5, unit: str = "celsius") -> dict[str, Any]:
    """Return a live daily forecast, including sunrise, sunset, and UV index."""
    if isinstance(days, bool) or not isinstance(days, int) or not 1 <= days <= 7:
        raise WeatherError("Days must be a whole number between 1 and 7.")
    unit = unit.lower().strip() if isinstance(unit, str) else ""
    if unit not in ("celsius", "fahrenheit"):
        raise WeatherError("Unit must be either 'celsius' or 'fahrenheit'.")
    place = geocode(location)
    data = _get_json(
        FORECAST_URL,
        {
            "latitude": place["latitude"],
            "longitude": place["longitude"],
            "daily": (
                "weather_code,temperature_2m_max,temperature_2m_min,"
                "precipitation_probability_max,sunrise,sunset,uv_index_max,wind_speed_10m_max"
            ),
            "temperature_unit": "fahrenheit" if unit == "fahrenheit" else "celsius",
            "wind_speed_unit": "kmh",
            "timezone": place["timezone"],
            "forecast_days": days,
        },
    )
    daily = data.get("daily") or {}
    dates = daily.get("time") or []
    forecast = []
    for index, date in enumerate(dates):
        def at(key: str) -> Any:
            values = daily.get(key) or []
            return values[index] if index < len(values) else None

        forecast.append({
            "date": date,
            "high": at("temperature_2m_max"),
            "low": at("temperature_2m_min"),
            "condition": _weather_description(at("weather_code")),
            "weather_code": at("weather_code"),
            "precipitation_probability_percent": at("precipitation_probability_max"),
            "sunrise": at("sunrise"),
            "sunset": at("sunset"),
            "uv_index_max": at("uv_index_max"),
            "wind_speed_max_kmh": at("wind_speed_10m_max"),
        })
    return {
        "location": _place_label(place),
        "timezone": data.get("timezone", place["timezone"]),
        "temperature_unit": "°F" if unit == "fahrenheit" else "°C",
        "forecast": forecast,
        "source": "Open-Meteo",
    }
