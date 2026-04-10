import {
  InvalidJsonBodyError,
  isApplicationJsonContentType,
  parseJsonRequestBody,
} from "@/server/parse-json-body";

describe("isApplicationJsonContentType", () => {
  it("accepts application/json", () => {
    expect(isApplicationJsonContentType("application/json")).toBe(true);
  });

  it("accepts application/json with charset", () => {
    expect(isApplicationJsonContentType("application/json; charset=utf-8")).toBe(true);
    expect(isApplicationJsonContentType("application/json;charset=UTF-8")).toBe(true);
  });

  it("rejects missing, empty, and non-json types", () => {
    expect(isApplicationJsonContentType(null)).toBe(false);
    expect(isApplicationJsonContentType("")).toBe(false);
    expect(isApplicationJsonContentType("text/plain")).toBe(false);
    expect(isApplicationJsonContentType("application/problem+json")).toBe(false);
  });
});

describe("parseJsonRequestBody", () => {
  it("parses valid JSON with application/json", () => {
    expect(parseJsonRequestBody('{"a":1}', "application/json")).toEqual({ a: 1 });
  });

  it("allows leading/trailing whitespace in the payload (JSON.parse behavior)", () => {
    expect(parseJsonRequestBody('  {"a":1}  \n', "application/json")).toEqual({ a: 1 });
  });

  it("throws InvalidJsonBodyError for empty body", () => {
    expect(() => parseJsonRequestBody("", "application/json")).toThrow(InvalidJsonBodyError);
    expect(() => parseJsonRequestBody("   \n\t  ", "application/json")).toThrow(
      InvalidJsonBodyError
    );
  });

  it("throws InvalidJsonBodyError when Content-Type is not application/json", () => {
    expect(() => parseJsonRequestBody('{"a":1}', null)).toThrow(InvalidJsonBodyError);
    expect(() => parseJsonRequestBody('{"a":1}', "text/plain")).toThrow(InvalidJsonBodyError);
  });

  it("throws InvalidJsonBodyError for malformed JSON", () => {
    expect(() => parseJsonRequestBody("not-json{", "application/json")).toThrow(
      InvalidJsonBodyError
    );
  });

  it("throws InvalidJsonBodyError for truncated JSON", () => {
    expect(() => parseJsonRequestBody('{"event":', "application/json")).toThrow(
      InvalidJsonBodyError
    );
  });

  it("allows JSON null as a value (caller validates object shape)", () => {
    expect(parseJsonRequestBody("null", "application/json")).toBeNull();
  });

  it("allows JSON array as a value (caller validates object shape)", () => {
    expect(parseJsonRequestBody("[1]", "application/json")).toEqual([1]);
  });
});
