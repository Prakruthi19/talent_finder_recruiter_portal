import { ServiceUnavailableError } from "./errors";

export interface ChatMessage {
  role: "system" | "user";
  content: string;
}

export interface ChatOptions {
  /** Upper bound on the reply length. Keep it tight: it is also a cost cap. */
  maxTokens?: number;
  temperature?: number;
}

interface ChatCompletionResponse {
  choices: { message: { content: string } }[];
}

/** Features that call the model are on only when a key is configured (see GET /api/features). */
export function isAiConfigured(env: NodeJS.ProcessEnv = process.env): boolean {
  return Boolean(env.AI_API_KEY);
}

/**
 * Thin wrapper around any OpenAI-compatible /chat/completions endpoint
 * (OpenAI itself, Groq, OpenRouter, a local Ollama server, ...). Provider
 * is chosen purely by env vars so swapping providers never touches calling
 * code.
 */
export async function generateChatCompletion(messages: ChatMessage[], options: ChatOptions = {}): Promise<string> {
  const apiKey = process.env.AI_API_KEY;
  if (!apiKey) {
    throw new ServiceUnavailableError(
      "AI feature not configured. Set AI_API_KEY in server/.env to enable it."
    );
  }

  const baseUrl = process.env.AI_API_BASE_URL ?? "https://api.openai.com/v1";
  const model = process.env.AI_MODEL ?? "gpt-4o-mini";

  let response: Response;
  try {
    response = await fetch(`${baseUrl}/chat/completions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model,
        messages,
        temperature: options.temperature ?? 0.4,
        max_tokens: options.maxTokens ?? 200,
      }),
    });
  } catch {
    throw new ServiceUnavailableError("Could not reach the AI provider.");
  }

  if (!response.ok) {
    throw new ServiceUnavailableError(`AI provider returned an error (HTTP ${response.status}).`);
  }

  const data = (await response.json()) as ChatCompletionResponse;
  const text = data.choices[0]?.message.content?.trim();
  if (!text) {
    throw new ServiceUnavailableError("AI provider returned an empty response.");
  }
  return text;
}
