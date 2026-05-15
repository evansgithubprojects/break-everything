import type { RuntimeManifest, Tool } from "@/types";

import { resolveRuntimePolicy } from "@/server/runtime-policy";



type PolicyTool = Pick<Tool, "slug" | "sandbox_level" | "trusted_domains">;



const fpOrigin = "http://localhost:3000";



const baseManifest: RuntimeManifest = {

  version: 1,

  entry: "/runtime/tool/index.html",

  executionMode: "iframe",

  permissions: {},

  allowedOrigins: [],

  storagePolicy: "session",

  capabilities: [],

};



function policyOpts(overrides: { moduleBetaEnabled: boolean; rollout?: { enabled: boolean; reason?: string } } = {

  moduleBetaEnabled: false,

}) {

  return { ...overrides, firstPartyOrigin: fpOrigin };

}



function makeTool(overrides: Partial<PolicyTool> = {}): PolicyTool {

  return {

    slug: "runtime-tool",

    sandbox_level: "strict",

    ...overrides,

  };

}



describe("resolveRuntimePolicy", () => {

  it("enforces deny-by-default for strict sandbox permissions and capabilities", () => {

    const policy = resolveRuntimePolicy(

      makeTool({ sandbox_level: "strict" }),

      {

        ...baseManifest,

        permissions: {

          network: true,

          storage: true,

          clipboard: true,

          downloads: true,

          popups: true,

        },

        capabilities: ["fileOpen", "copyToClipboard", "openExternal"],

      },

      policyOpts({ moduleBetaEnabled: true })

    );



    expect(policy.permissions).toEqual({

      network: false,

      storage: false,

      clipboard: false,

      downloads: false,

      popups: false,

    });

    expect(policy.capabilities).toEqual([]);

    expect(policy.sandbox).toBe("allow-forms allow-modals allow-scripts allow-same-origin allow-downloads");

    expect(policy.entry).toBe("/runtime/tool/index.html");

    expect(policy.entryAppUrl).toBe("http://localhost:3000/runtime/tool/index.html");

  });



  it("allows module mode only for trusted sandbox with beta flag", () => {

    const trustedAllowed = resolveRuntimePolicy(

      makeTool({ sandbox_level: "trusted" }),

      {

        ...baseManifest,

        executionMode: "module",

      },

      policyOpts({ moduleBetaEnabled: true })

    );

    expect(trustedAllowed.executionMode).toBe("module");

    expect(trustedAllowed.deniedReasons).toEqual([]);



    const strictDenied = resolveRuntimePolicy(

      makeTool({ sandbox_level: "strict" }),

      {

        ...baseManifest,

        executionMode: "module",

      },

      policyOpts({ moduleBetaEnabled: true })

    );

    expect(strictDenied.executionMode).toBe("iframe");

    expect(strictDenied.deniedReasons).toContain("Module mode requires trusted sandbox level.");

  });



  it("includes rollout denial reason from server controls", () => {

    const policy = resolveRuntimePolicy(

      makeTool({ sandbox_level: "trusted" }),

      {

        ...baseManifest,

      },

      {

        moduleBetaEnabled: true,

        rollout: { enabled: false, reason: "Runtime kill switch disabled this tool." },

        firstPartyOrigin: fpOrigin,

      }

    );

    expect(policy.deniedReasons).toContain("Runtime kill switch disabled this tool.");

  });



  it("denies absolute URLs; only relative /runtime paths are allowed", () => {

    const policy = resolveRuntimePolicy(

      makeTool(),

      {

        ...baseManifest,

        entry: "http://localhost:3000/apps/wrong",

      },

      policyOpts({ moduleBetaEnabled: false })

    );

    expect(policy.deniedReasons.some((r) => /relative path/i.test(r))).toBe(true);

  });



  it("adds allow-downloads to iframe sandbox when downloads permission survives clamping", () => {
    const policy = resolveRuntimePolicy(
      makeTool({ sandbox_level: "trusted" }),
      {
        ...baseManifest,
        permissions: {
          network: false,
          storage: false,
          clipboard: false,
          downloads: true,
          popups: false,
        },
      },
      policyOpts({ moduleBetaEnabled: false })
    );
    expect(policy.permissions.downloads).toBe(true);
    expect(policy.sandbox).toContain("allow-downloads");
  });

  it("denies bare https entries even when pathname is under /runtime", () => {
    const policy = resolveRuntimePolicy(
      makeTool(),
      {
        ...baseManifest,
        entry: "https://evil.example/runtime/index.html",
        allowedOrigins: [],
      },
      policyOpts({ moduleBetaEnabled: false })
    );
    expect(policy.deniedReasons.some((r) => /relative path/i.test(r))).toBe(true);
  });
});

