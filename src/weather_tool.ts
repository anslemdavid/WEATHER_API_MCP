import Anthropic from "@anthropic-ai/sdk";

const client = new Anthropic();

const MODEL_NAME = "claude-3-5-sonnet-20241022";

// Define weather tools
const tools: Anthropic.Tool[] = [
  {
    name: "get_weather",
    description:
      "Get weather for a location. Temperature is in Celsius, wind speed is in km/h.",
    input_schema: {
      type: "object" as const,
      properties: {
        location: {
          type: "string",
          description: "Location to get weather for (e.g., 'London', 'New York', 'Tokyo')",
        },
        unit: {
          type: "string",
          enum: ["celsius", "fahrenheit"],
          description: "Temperature unit (celsius or fahrenheit)",
        },
      },
      required: ["location"],
    },
  },
  {
    name: "get_forecast",
    description: "Get weather forecast for a location for the next 5 days",
    input_schema: {
      type: "object" as const,
      properties: {
        location: {
          type: "string",
          description: "Location to get forecast for",
        },
        days: {
          type: "number",
          description: "Number of days to forecast (1-7)",
        },
      },
      required: ["location", "days"],
    },
  },
];

// Mock weather data
function getWeather(location: string, unit: string = "celsius"): object {
  const weatherData: { [key: string]: object } = {
    london: {
      location: "London, UK",
      temperature: 15,
      condition: "Partly Cloudy",
      humidity: 65,
      wind_speed: 12,
      pressure: 1013,
    },
    newyork: {
      location: "New York, USA",
      temperature: 22,
      condition: "Sunny",
      humidity: 45,
      wind_speed: 8,
      pressure: 1015,
    },
    tokyo: {
      location: "Tokyo, Japan",
      temperature: 18,
      condition: "Rainy",
      humidity: 80,
      wind_speed: 15,
      pressure: 1010,
    },
    paris: {
      location: "Paris, France",
      temperature: 16,
      condition: "Cloudy",
      humidity: 70,
      wind_speed: 10,
      pressure: 1012,
    },
  };

  const data =
    weatherData[location.toLowerCase()] ||
    weatherData[Object.keys(weatherData)[0]];

  if (unit === "fahrenheit" && "temperature" in data) {
    return {
      ...data,
      temperature: Math.round(((data.temperature as number) * 9) / 5 + 32),
    };
  }

  return data;
}

function getForecast(
  location: string,
  days: number
): { location: string; forecast: object[] } {
  const forecastData = [];
  const conditions = [
    "Sunny",
    "Cloudy",
    "Rainy",
    "Partly Cloudy",
    "Stormy",
  ];

  for (let i = 1; i <= Math.min(days, 7); i++) {
    const date = new Date();
    date.setDate(date.getDate() + i);
    forecastData.push({
      date: date.toISOString().split("T")[0],
      high_temp: Math.floor(Math.random() * 15) + 15,
      low_temp: Math.floor(Math.random() * 10) + 5,
      condition: conditions[Math.floor(Math.random() * conditions.length)],
      precipitation_chance: Math.floor(Math.random() * 100),
    });
  }

  return {
    location: location,
    forecast: forecastData,
  };
}

function processToolCall(
  toolName: string,
  toolInput: Record<string, string | number>
): object {
  if (toolName === "get_weather") {
    return getWeather(
      toolInput.location as string,
      (toolInput.unit as string) || "celsius"
    );
  } else if (toolName === "get_forecast") {
    return getForecast(
      toolInput.location as string,
      (toolInput.days as number) || 5
    );
  }
  return { error: "Unknown tool" };
}

async function weatherAssistant(userMessage: string): Promise<void> {
  console.log(`\nUser: ${userMessage}\n`);

  const messages: Anthropic.MessageParam[] = [
    { role: "user", content: userMessage },
  ];

  const response = await client.messages.create({
    model: MODEL_NAME,
    max_tokens: 1024,
    tools: tools,
    messages: messages,
  });

  console.log(`\nInitial Response:`);
  console.log(`Stop Reason: ${response.stop_reason}`);

  let continueLoop = true;

  while (continueLoop) {
    if (response.stop_reason === "end_turn") {
      const finalResponse = response.content
        .filter((block): block is Anthropic.TextBlock => block.type === "text")
        .map((block) => block.text)
        .join("");

      console.log(`\nAssistant: ${finalResponse}`);
      continueLoop = false;
    } else if (response.stop_reason === "tool_use") {
      const toolUseBlock = response.content.find(
        (block): block is Anthropic.ToolUseBlock => block.type === "tool_use"
      );

      if (toolUseBlock) {
        const toolName = toolUseBlock.name;
        const toolInput = toolUseBlock.input as Record<string, string | number>;

        console.log(`\nTool Used: ${toolName}`);
        console.log(`Tool Input: ${JSON.stringify(toolInput)}`);

        const toolResult = processToolCall(toolName, toolInput);

        console.log(`\nTool Result: ${JSON.stringify(toolResult)}`);

        messages.push({ role: "assistant", content: response.content });
        messages.push({
          role: "user",
          content: [
            {
              type: "tool_result",
              tool_use_id: toolUseBlock.id,
              content: JSON.stringify(toolResult),
            },
          ],
        });

        const nextResponse = await client.messages.create({
          model: MODEL_NAME,
          max_tokens: 1024,
          tools: tools,
          messages: messages,
        });

        Object.assign(response, nextResponse);
      } else {
        continueLoop = false;
      }
    } else {
      continueLoop = false;
    }
  }
}

// Main execution
async function main(): Promise<void> {
  await weatherAssistant("What's the weather like in London?");
  await weatherAssistant(
    "Can you get me the forecast for Tokyo for the next 3 days?"
  );
  await weatherAssistant("Compare the weather between Paris and New York");
}

main().catch(console.error);