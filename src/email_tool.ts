import Anthropic from "@anthropic-ai/sdk";
import * as fs from "fs";
import * as path from "path";

const client = new Anthropic();

const MODEL_NAME = "claude-3-5-sonnet-20241022";

interface EmailMessage {
  id: string;
  from: string;
  subject: string;
  body: string;
  timestamp: string;
}

interface DraftEmail {
  to: string;
  subject: string;
  body: string;
}

// Mock email data storage
const emailDatabase: { inbox: EmailMessage[]; sent: DraftEmail[] } = {
  inbox: [
    {
      id: "1",
      from: "customer@example.com",
      subject: "Support Request - Product Issue",
      body: "Hi, I'm having issues with my order #12345. The product arrived damaged. Can you help?",
      timestamp: new Date().toISOString(),
    },
    {
      id: "2",
      from: "support@client.com",
      subject: "RE: Follow-up on previous issue",
      body: "Just checking in on the status of my refund request from last week.",
      timestamp: new Date().toISOString(),
    },
  ],
  sent: [],
};

// Define email tools
const tools: Anthropic.Tool[] = [
  {
    name: "read_email",
    description: "Read an email from the inbox",
    input_schema: {
      type: "object" as const,
      properties: {
        email_id: {
          type: "string",
          description: "The ID of the email to read",
        },
      },
      required: ["email_id"],
    },
  },
  {
    name: "list_emails",
    description: "List all emails in the inbox",
    input_schema: {
      type: "object" as const,
      properties: {
        limit: {
          type: "number",
          description: "Number of emails to retrieve (default: 10)",
        },
      },
      required: [],
    },
  },
  {
    name: "search_emails",
    description: "Search for emails by subject or sender",
    input_schema: {
      type: "object" as const,
      properties: {
        query: {
          type: "string",
          description: "Search term",
        },
      },
      required: ["query"],
    },
  },
  {
    name: "draft_response",
    description: "Draft a response email",
    input_schema: {
      type: "object" as const,
      properties: {
        to: {
          type: "string",
          description: "Recipient email address",
        },
        subject: {
          type: "string",
          description: "Email subject",
        },
        body: {
          type: "string",
          description: "Email body",
        },
      },
      required: ["to", "subject", "body"],
    },
  },
  {
    name: "send_email",
    description: "Send the drafted email",
    input_schema: {
      type: "object" as const,
      properties: {
        draft_index: {
          type: "number",
          description: "Index of the draft to send",
        },
      },
      required: ["draft_index"],
    },
  },
];

function readEmail(emailId: string): EmailMessage | { error: string } {
  const email = emailDatabase.inbox.find((e) => e.id === emailId);
  return email || { error: "Email not found" };
}

function listEmails(limit: number = 10): EmailMessage[] {
  return emailDatabase.inbox.slice(0, limit);
}

function searchEmails(query: string): EmailMessage[] {
  return emailDatabase.inbox.filter(
    (e) =>
      e.subject.toLowerCase().includes(query.toLowerCase()) ||
      e.from.toLowerCase().includes(query.toLowerCase()) ||
      e.body.toLowerCase().includes(query.toLowerCase())
  );
}

function draftResponse(
  to: string,
  subject: string,
  body: string
): { status: string; index: number } {
  emailDatabase.sent.push({ to, subject, body });
  return {
    status: "Draft created",
    index: emailDatabase.sent.length - 1,
  };
}

function sendEmail(draftIndex: number): { status: string; message: string } {
  if (draftIndex < 0 || draftIndex >= emailDatabase.sent.length) {
    return { status: "error", message: "Invalid draft index" };
  }
  const draft = emailDatabase.sent[draftIndex];
  return {
    status: "success",
    message: `Email sent to ${draft.to} with subject: "${draft.subject}"`,
  };
}

function processToolCall(
  toolName: string,
  toolInput: Record<string, string | number>
): object {
  switch (toolName) {
    case "read_email":
      return readEmail(toolInput.email_id as string);
    case "list_emails":
      return listEmails((toolInput.limit as number) || 10);
    case "search_emails":
      return searchEmails(toolInput.query as string);
    case "draft_response":
      return draftResponse(
        toolInput.to as string,
        toolInput.subject as string,
        toolInput.body as string
      );
    case "send_email":
      return sendEmail(toolInput.draft_index as number);
    default:
      return { error: "Unknown tool" };
  }
}

async function emailAssistant(userMessage: string): Promise<void> {
  console.log(`\nUser: ${userMessage}\n`);

  const messages: Anthropic.MessageParam[] = [
    { role: "user", content: userMessage },
  ];

  const response = await client.messages.create({
    model: MODEL_NAME,
    max_tokens: 2048,
    tools: tools,
    messages: messages,
  });

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
          max_tokens: 2048,
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

async function main(): Promise<void> {
  await emailAssistant("Check my inbox for any new support requests.");
  await emailAssistant(
    "Please search for emails from customers about refunds and draft a helpful response."
  );
  await emailAssistant(
    "Read the first email and send a professional response thanking them for their patience."
  );
}

main().catch(console.error);