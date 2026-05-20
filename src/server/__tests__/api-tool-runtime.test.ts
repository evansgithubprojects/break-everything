import { parseToolRuntimeWrite } from "@/server/api-tool-runtime";

describe("parseToolRuntimeWrite", () => {
  it("derives runtime config for browserRuntime without forcing runtime_supported", () => {
    const r = parseToolRuntimeWrite(
      { runtime_name: "video-converter", runtime_supported: false },
      "browserRuntime"
    );
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.value.runtime_name).toBe("video-converter");
    expect(r.value.runtime_entrypoint).toBe("/runtime/video-converter/index.html");
    expect(r.value.runtime_manifest?.entry).toBe("/runtime/video-converter/index.html");
    expect(r.value.sandbox_level).toBe("strict");
    expect(r.value.runtime_supported).toBe(0);
  });

  it("saves runtime_supported from the checkbox state", () => {
    const r = parseToolRuntimeWrite(
      { runtime_name: "video-converter", runtime_supported: true },
      "browserRuntime"
    );
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.value.runtime_supported).toBe(1);
    expect(r.value.sandbox_level).toBe("trusted");
  });

  it("clears runtime when not requested", () => {
    const r = parseToolRuntimeWrite({ runtime_name: "x", runtime_supported: false }, "download");
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.value.runtime_supported).toBe(0);
    expect(r.value.runtime_name).toBe("");
  });

  it("does not treat string false as checked", () => {
    const r = parseToolRuntimeWrite(
      { runtime_name: "video-converter", runtime_supported: "false" },
      "download"
    );
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.value.runtime_supported).toBe(0);
    expect(r.value.runtime_name).toBe("");
  });
});
