# 🌦️ Weather API MCP

A zero-config MCP (Model Context Protocol) weather server for Claude AI. Get real-time weather data without API keys!

## Features

✨ **Zero Configuration** - No API keys needed
✨ **Multi-Location** - Get weather for any location
✨ **Forecast Support** - 5-day weather forecasts
✨ **Unit Conversion** - Celsius and Fahrenheit support
✨ **Tool Use Integration** - Works seamlessly with Claude

## Installation

```bash
cd WEATHER_API_MCP
npm install
```

## Usage

### Development

```bash
npm run dev
```

### Build

```bash
npm run build
npm start
```

## API Functions

### get_weather
Get current weather for a location.

**Parameters:**
- `location` (string): Location name (e.g., 'London', 'New York')
- `unit` (string, optional): 'celsius' or 'fahrenheit' (default: 'celsius')

**Example:**
```typescript
getWeather('London', 'celsius')
// Returns: { location, temperature, condition, humidity, wind_speed, pressure }
```

### get_forecast
Get weather forecast for the next 5 days.

**Parameters:**
- `location` (string): Location name
- `days` (number): Number of days to forecast (1-7)

**Example:**
```typescript
getForecast('Tokyo', 3)
// Returns: { location, forecast: [{ date, high_temp, low_temp, condition, precipitation_chance }] }
```

## Example Output

```json
{
  "location": "London, UK",
  "temperature": 15,
  "condition": "Partly Cloudy",
  "humidity": 65,
  "wind_speed": 12,
  "pressure": 1013
}
```

## Integration with Claude

Use this MCP with Claude by configuring it in your MCP settings. Claude can automatically call weather functions in natural language:

- "What's the weather like in London?"
- "Get me a 5-day forecast for Tokyo"
- "Compare weather between Paris and New York"

## Technical Stack

- **Language**: TypeScript
- **Runtime**: Node.js
- **Protocol**: Model Context Protocol (MCP)
- **AI**: Anthropic Claude API

## License

MIT