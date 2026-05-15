import type { Tool } from "@/types";

import { toolSupportsInAppRuntime } from "@/lib/first-party-inapp";



type RuntimeRolloutTool = Pick<

  Tool,

  "slug" | "runtime_supported" | "runtime_entrypoint" | "runtime_manifest"

>;



export interface RuntimeRolloutDecision {

  enabled: boolean;

  reason?: string;

}



function parseSlugSet(raw: string | undefined): Set<string> {

  const out = new Set<string>();

  for (const part of String(raw ?? "").split(",")) {

    const slug = part.trim().toLowerCase();

    if (slug) out.add(slug);

  }

  return out;

}



/**

 * Runtime rollout guard:

 * - global gate via NEXT_PUBLIC_RUNTIME_BETA

 * - per-tool gate via runtime_supported

 * - first-party `/runtime` entry validation

 * - optional progressive allowlist (RUNTIME_ROLLOUT_ALLOWLIST_SLUGS)

 * - operational kill switch (RUNTIME_KILL_SWITCH_SLUGS)

 */

export function resolveRuntimeRollout(

  tool: RuntimeRolloutTool,

  env: NodeJS.ProcessEnv = process.env

): RuntimeRolloutDecision {

  if (env.NEXT_PUBLIC_RUNTIME_BETA !== "1") {

    return { enabled: false, reason: "Runtime beta is globally disabled." };

  }



  if (!tool.runtime_supported) {

    return { enabled: false, reason: "Runtime is disabled for this tool." };

  }



  if (!toolSupportsInAppRuntime(tool)) {

    return {

      enabled: false,

      reason: "Runtime entry is not an allowed first-party /runtime path.",

    };

  }



  const killSwitch = parseSlugSet(env.RUNTIME_KILL_SWITCH_SLUGS);

  if (killSwitch.has(tool.slug.toLowerCase())) {

    return { enabled: false, reason: "Runtime kill switch disabled this tool." };

  }



  const allowlist = parseSlugSet(env.RUNTIME_ROLLOUT_ALLOWLIST_SLUGS);

  if (allowlist.size > 0 && !allowlist.has(tool.slug.toLowerCase())) {

    return { enabled: false, reason: "Tool is not in the runtime rollout allowlist." };

  }



  return { enabled: true };

}

