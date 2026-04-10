/**
 * Thrown when a request body cannot be accepted as JSON for this endpoint:
 * empty/whitespace-only body, non-`application/json` Content-Type (when body is present),
 * or `JSON.parse` failure (malformed / truncated JSON).
 *
 * Use `instanceof InvalidJsonBodyError` instead of matching `SyntaxError` or message regexes;
 * parsing is done with `JSON.parse`, which is stable across Node versions.
 */
export class InvalidJsonBodyError extends Error {
  override readonly name = "InvalidJsonBodyError";

  constructor(readonly cause?: unknown) {
    super("Invalid JSON body");
  }
}

/**
 * True when Content-Type is `application/json`, optionally with parameters (e.g. `charset=utf-8`).
 */
export function isApplicationJsonContentType(contentType: string | null): boolean {
  if (contentType == null || contentType === "") return false;
  const mediaType = contentType.split(";")[0]?.trim().toLowerCase() ?? "";
  return mediaType === "application/json";
}

/**
 * Read a UTF-8 body string as JSON. Does not use `Request.json()` so behavior does not depend
 * on Undici/Next error types for parse failures.
 */
export function parseJsonRequestBody(raw: string, contentType: string | null): unknown {
  const trimmed = raw.trim();
  if (trimmed.length === 0) {
    throw new InvalidJsonBodyError();
  }
  if (!isApplicationJsonContentType(contentType)) {
    throw new InvalidJsonBodyError();
  }
  try {
    return JSON.parse(raw) as unknown;
  } catch (cause) {
    throw new InvalidJsonBodyError(cause);
  }
}
