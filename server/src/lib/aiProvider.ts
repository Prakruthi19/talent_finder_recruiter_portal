import { ServiceUnavailableError } from "./errors";

export interface ChatMessage {
  role: "system" | "user";
  content: string;
}

interface ChatCompletionResponse {
  choices: { message: { content: string } }[];
}

/**
 * Thin wrapper around any OpenAI-compatible /chat/completions endpoint
 * (Groq, OpenRouter, a local Ollama server, ...). Provider is chosen purely
 * by env vars so swapping providers never touches calling code.
 */
export async function generateChatCompletion(messages: ChatMessage[]): Promise<string> {
  const apiKey = process.env.AI_API_KEY;
  if (!apiKey) {
    throw new ServiceUnavailableError(
      "AI feature not configured. Set AI_API_KEY in server/.env to enable it."
    );
  }

  const baseUrl = process.env.AI_API_BASE_URL ?? "https://api.groq.com/openai/v1";
  const model = process.env.AI_MODEL ?? "llama-3.1-8b-instant";

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
        temperature: 0.4,
        max_tokens: 200,
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
