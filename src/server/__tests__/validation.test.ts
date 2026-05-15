import {
  buildRuntimeManifestFromPreset,
  isAllowedEmbedUrl,
  isValidTrustedDomainEntry,
  normalizeTrustedDomainsInput,
  parseRuntimeManifestPreset,
  parseRuntimeManifestInput,
  parseCsvDomains,
} from "@/server/validation";

describe("isValidTrustedDomainEntry", () => {
  it("rejects bare public suffixes that would match whole TLDs", () => {
    expect(isValidTrustedDomainEntry("com")).toBe(false);
    expect(isValidTrustedDomainEntry("uk")).toBe(false);
    expect(isValidTrustedDomainEntry("co")).toBe(false);
  });

  it("accepts multi-label hostnames and localhost", () => {
    expect(isValidTrustedDomainEntry("github.com")).toBe(true);
    expect(isValidTrustedDomainEntry("app.example.com")).toBe(true);
    expect(isValidTrustedDomainEntry("localhost")).toBe(true);
  });
});

describe("parseCsvDomains", () => {
  it("drops bare TLD entries so embed allowlists cannot be widened accidentally", () => {
    expect(parseCsvDomains("com,github.com")).toEqual(["github.com"]);
    expect(parseCsvDomains("com")).toEqual([]);
  });
});

describe("normalizeTrustedDomainsInput", () => {
  it("rejects when any segment is invalid", () => {
    const r = normalizeTrustedDomainsInput("com,github.com");
    expect(r.ok).toBe(false);
  });

  it("dedupes and lowercases valid lists", () => {
    expect(normalizeTrustedDomainsInput("GitHub.COM, github.com")).toEqual({
      ok: true,
      csv: "github.com",
    });
  });
});

describe("isAllowedEmbedUrl", () => {
  it("does not allow arbitrary hosts when allowlist was only a TLD (filtered to empty)", () => {
    expect(isAllowedEmbedUrl("https://evil.com", parseCsvDomains("com"))).toBe(false);
  });
});

describe("parseRuntimeManifestInput", () => {
  it("accepts null/empty as no manifest", () => {
    expect(parseRuntimeManifestInput(null)).toEqual({ ok: true, manifest: null });
    expect(parseRuntimeManifestInput("")).toEqual({ ok: true, manifest: null });
  });

  it("parses a valid manifest and normalizes arrays", () => {
    const result = parseRuntimeManifestInput({
      entry: "/runtime/tools/calc.js",
      executionMode: "module",
      permissions: { network: false, storage: true },
      allowedOrigins: ["https://app.example.com", "https://app.example.com"],
      storagePolicy: "session",
      capabilities: ["fileOpen", "fileOpen", "share"],
    });
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.manifest?.entry).toBe("/runtime/tools/calc.js");
      expect(result.manifest?.executionMode).toBe("module");
      expect(result.manifest?.allowedOrigins).toEqual(["https://app.example.com"]);
      expect(result.manifest?.capabilities).toEqual(["fileOpen", "share"]);
    }
  });

  it("rejects invalid manifest fields", () => {
    expect(parseRuntimeManifestInput({ entry: "   " }).ok).toBe(false);
    expect(parseRuntimeManifestInput({ entry: "/x.js", executionMode: "worker" }).ok).toBe(false);
    expect(parseRuntimeManifestInput({ entry: "/x.js", allowedOrigins: ["not-a-url"] }).ok).toBe(false);
    expect(parseRuntimeManifestInput({ entry: "/x.js", capabilities: ["rm -rf"] }).ok).toBe(false);
  });
});

describe("runtime manifest presets", () => {
  it("accepts only known preset ids", () => {
    expect(parseRuntimeManifestPreset("localOnly")).toBe("localOnly");
    expect(parseRuntimeManifestPreset("networkedUtility")).toBe("networkedUtility");
    expect(parseRuntimeManifestPreset("trustedEmbeddedApp")).toBe("trustedEmbeddedApp");
    expect(parseRuntimeManifestPreset("nope")).toBeNull();
  });

  it("builds deterministic manifest entries", () => {
    const m = buildRuntimeManifestFromPreset("trustedEmbeddedApp", {
      entry: "/runtime/tool.js",
      trustedDomainsCsv: "app.example.com,cdn.example.com",
    });
    expect(m.entry).toBe("/runtime/tool.js");
    expect(m.executionMode).toBe("iframe");
    expect(m.allowedOrigins).toEqual(["https://app.example.com", "https://cdn.example.com"]);
  });
});
