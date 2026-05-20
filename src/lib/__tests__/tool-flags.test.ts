import { isRuntimeTool } from "@/lib/tool-flags";

describe("isRuntimeTool", () => {
  it("returns true for browserRuntime delivery", () => {
    expect(
      isRuntimeTool({
        delivery_mode: "browserRuntime",
        runtime_supported: 0,
        runtime_name: "",
      })
    ).toBe(true);
  });

  it("returns true when runtime_supported is enabled", () => {
    expect(
      isRuntimeTool({
        delivery_mode: "download",
        runtime_supported: 1,
        runtime_name: "",
      })
    ).toBe(true);
  });

  it("returns true when a runtime folder name is configured", () => {
    expect(
      isRuntimeTool({
        delivery_mode: "download",
        runtime_supported: 0,
        runtime_name: "audio-converter",
      })
    ).toBe(true);
  });

  it("returns false for ordinary download tools", () => {
    expect(
      isRuntimeTool({
        delivery_mode: "download",
        runtime_supported: 0,
        runtime_name: "",
      })
    ).toBe(false);
  });
});
