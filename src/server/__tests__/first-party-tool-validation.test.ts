import { validateFirstPartyInApp } from "@/server/first-party-tool-validation";

describe("validateFirstPartyInApp", () => {
  it("accepts download without runtime", () => {
    expect(
      validateFirstPartyInApp({
        delivery_mode: "download",
        runtime_supported: false,
        runtime_name: "",
      })
    ).toBeNull();
  });

  it("rejects runtime_supported without runtime_name", () => {
    const err = validateFirstPartyInApp({
      delivery_mode: "download",
      runtime_supported: true,
      runtime_name: "",
    });
    expect(err).toMatch(/runtime_name/);
  });

  it("accepts runtime with valid name", () => {
    expect(
      validateFirstPartyInApp({
        delivery_mode: "browserRuntime",
        runtime_supported: true,
        runtime_name: "video-converter",
      })
    ).toBeNull();
  });
});
