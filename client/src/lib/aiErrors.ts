/**
 * A message worth showing when an AI request fails. The server already words
 * the useful cases ("AI feature not configured", "Too many AI requests...",
 * "The AI returned an unexpected response"), so those are passed through.
 */
export function aiErrorMessage(err: unknown, fallback = "Couldn't reach the AI right now. Please try again."): string {
  const { status, data } = (err ?? {}) as { status?: number; data?: { error?: string; details?: { fieldErrors?: Record<string, string[]> } } };
  if (data?.error && data.error !== "Validation failed") return data.error;
  const firstField = Object.values(data?.details?.fieldErrors ?? {})[0]?.[0];
  if (firstField) return firstField;
  if (status === 401) return "Your session has expired. Please sign in again.";
  return fallback;
}
