/** Split Aicoo agent body from trailing <suggestions> block */
export function splitAgentContent(raw: string): {
  body: string;
  suggestions: string[];
} {
  const match = raw.match(/<suggestions>([\s\S]*?)<\/suggestions>/i);
  if (!match) {
    return { body: raw.trim(), suggestions: [] };
  }

  const body = raw.replace(/<suggestions>[\s\S]*?<\/suggestions>/i, "").trim();
  const suggestions = match[1]
    .split("\n")
    .map((line) => line.replace(/^\s*[-•*]\s*/, "").trim())
    .filter(Boolean);

  return { body, suggestions };
}

/** Hide partial suggestions tag while tokens stream in */
export function displayWhileStreaming(raw: string): string {
  return raw.replace(/<suggestions>[\s\S]*$/i, "").trim();
}
