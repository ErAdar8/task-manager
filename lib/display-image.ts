/**
 * Normalize image refs for display in <img src={...} /> (data URLs and same-origin paths).
 */
export function displayImageSrc(ref: string): string {
  if (!ref || typeof ref !== "string") return "";
  if (ref.startsWith("data:")) return ref;
  if (ref.startsWith("/") || ref.startsWith("http://") || ref.startsWith("https://")) {
    return ref;
  }
  return ref;
}
