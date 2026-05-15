import { validateFirstPartyInApp } from "@/server/first-party-tool-validation";

describe("validateFirstPartyInApp", () => {
  it("accepts redirect without runtime payloads", () => {
    expect(
      validateFirstPartyInApp({
        delivery_mode: "download",
        runtime_supported: false,
        runtime_entrypoint: "",
        runtime_manifest: null,
      })
    ).toBeNull();
  });

  it("rejects runtime when entry is not under /runtime", () => {
    const err = validateFirstPartyInApp({
      delivery_mode: "download",
      runtime_supported: true,
      runtime_entrypoint: "/apps/bad.js",
      runtime_manifest: null,
    });
    expect(err).toMatch(/\/runtime/);
  });
});
