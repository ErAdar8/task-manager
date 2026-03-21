export type ResponseEnvelope<T> =
  | { success: true; data: T }
  | { success: false; error: string };

export function ok<T>(data: T): ResponseEnvelope<T> {
  return { success: true, data };
}

export function err(message: string): ResponseEnvelope<never> {
  return { success: false, error: message };
}
