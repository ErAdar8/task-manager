/**
 * Helpers for attaching images to Claude message content (data URLs from task card / notes).
 */

export function parseDataUrl(dataUrl: string): { media_type: string; data: string } | null {
  const match = dataUrl.match(/^data:(image\/[a-z+]+);base64,(.+)$/i);
  if (!match) return null;
  const [, mediaType, base64] = match;
  if (!mediaType || !base64) return null;
  const allowed = ["image/jpeg", "image/png", "image/gif", "image/webp"];
  const normalized = mediaType.toLowerCase().split("+")[0];
  if (!allowed.includes(normalized)) return null;
  return { media_type: normalized, data: base64 };
}

export function dataUrlToClaudeImageBlock(
  dataUrl: string
): { type: "image"; source: { type: "base64"; media_type: string; data: string } } | null {
  const parsed = parseDataUrl(dataUrl);
  if (!parsed) return null;
  return {
    type: "image",
    source: { type: "base64", media_type: parsed.media_type, data: parsed.data },
  };
}

export async function dataUrlOrPathToClaudeImage(
  ref: string
): Promise<
  { type: "image"; source: { type: "base64"; media_type: string; data: string } } | null
> {
  if (ref.startsWith("data:")) {
    return dataUrlToClaudeImageBlock(ref);
  }
  return null;
}
