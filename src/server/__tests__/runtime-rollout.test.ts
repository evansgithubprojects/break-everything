import type { Tool } from "@/types";
import { resolveRuntimeRollout } from "@/server/runtime-rollout";

type RolloutTool = Pick<Tool, "slug" | "runtime_supported" | "runtime_entrypoint" | "runtime_manifest">;

function t(overrides: Partial<RolloutTool> = {}): RolloutTool {
  return {
    slug: "runtime-tool",
    runtime_supported: 1,
    runtime_entrypoint: "/runtime/tool/index.html",
    runtime_manifest: null,
    ...overrides,
  };
}

describe("resolveRuntimeRollout", () => {
  it("requires global runtime beta flag", () => {
    const result = resolveRuntimeRollout(t(), { NEXT_PUBLIC_RUNTIME_BETA: "0" });
    expect(result.enabled).toBe(false);
  });

  it("requires per-tool runtime_supported", () => {
    const result = resolveRuntimeRollout(t({ runtime_supported: 0 }), { NEXT_PUBLIC_RUNTIME_BETA: "1" });
    expect(result.enabled).toBe(false);
    expect(result.reason).toMatch(/disabled for this tool/i);
  });

  it("supports progressive allowlist", () => {
    const env = {
      NEXT_PUBLIC_RUNTIME_BETA: "1",
      RUNTIME_ROLLOUT_ALLOWLIST_SLUGS: "alpha-tool,beta-tool",
    };
    expect(resolveRuntimeRollout(t({ slug: "alpha-tool" }), env).enabled).toBe(true);
    expect(resolveRuntimeRollout(t({ slug: "runtime-tool" }), env).enabled).toBe(false);
  });

  it("supports operational kill switch", () => {
    const env = {
      NEXT_PUBLIC_RUNTIME_BETA: "1",
      RUNTIME_KILL_SWITCH_SLUGS: "runtime-tool",
    };
    const result = resolveRuntimeRollout(t(), env);
    expect(result.enabled).toBe(false);
    expect(result.reason).toMatch(/kill switch/i);
  });

  it("disallows runtime when entry is not under /runtime", () => {
    const env = { NEXT_PUBLIC_RUNTIME_BETA: "1" };
    const result = resolveRuntimeRollout(
      t({ runtime_entrypoint: "/apps/bad.js", runtime_manifest: null }),
      env
    );
    expect(result.enabled).toBe(false);
    expect(result.reason).toMatch(/\/runtime/i);
  });
});
