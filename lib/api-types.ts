export type ErrorReason =
  | "timeout"
  | "response_truncated"
  | "no_json_found"
  | "parse_failed"
  | "upstream_error";

export type ResponseEnvelope<T> =
  | { success: true; data: T }
  | {
      success: false;
      error: string;
      reason?: ErrorReason;
      partial?: boolean;
    };

export function ok<T>(data: T): ResponseEnvelope<T> {
  return { success: true, data };
}

export function err(
  message: string,
  meta?: { reason?: ErrorReason; partial?: boolean }
): ResponseEnvelope<never> {
  return { success: false, error: message, ...(meta ?? {}) };
}
