import type { Tool } from "@/types";
import ToolRuntimePage, { generateMetadata } from "@/app/tools/[slug]/run/page";
import { getToolBySlug } from "@/server/db";
import { resolveRuntimeRollout } from "@/server/runtime-rollout";
import { notFound } from "next/navigation";

jest.mock("@/server/db", () => ({
  getToolBySlug: jest.fn(),
}));

jest.mock("@/server/runtime-rollout", () => ({
  resolveRuntimeRollout: jest.fn(),
}));

jest.mock("next/navigation", () => ({
  notFound: jest.fn(),
}));

const mockedGetToolBySlug = getToolBySlug as jest.MockedFunction<typeof getToolBySlug>;
const mockedResolveRuntimeRollout = resolveRuntimeRollout as jest.MockedFunction<
  typeof resolveRuntimeRollout
>;
const mockedNotFound = notFound as jest.MockedFunction<typeof notFound>;

function makeTool(overrides: Partial<Tool> = {}): Tool {
  return {
    id: 1,
    name: "Runtime Tool",
    slug: "runtime-tool",
    description: "desc",
    short_description: "short",
    category: "utility",
    categories: ["utility"],
    icon: "🔧",
    tool_kind: "web",
    delivery_mode: "browserRuntime",
    download_url: "",
    web_url: "https://external.example/tool",
    app_store_url: "",
    play_store_url: "",
    embed_allowed: 0,
    embed_url: "",
    runtime_supported: 1,
    runtime_name: "runtime-tool",
    runtime_entrypoint: "/runtime/runtime-tool/index.html",
    runtime_manifest: null,
    sandbox_level: "trusted",
    trusted_domains: "app.example.com",
    vendor: "",
    privacy_summary: "",
    data_handling: "medium",
    review_notes: "",
    last_reviewed_at: null,
    github_url: "",
    platform: "web",
    downloads: 0,
    created_at: "",
    updated_at: "",
    ...overrides,
  };
}

describe("/tools/[slug]/run route", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockedNotFound.mockImplementation(() => {
      throw new Error("NEXT_NOT_FOUND");
    });
  });

  it("generateMetadata includes AdSense meta only when rollout is enabled", async () => {
    mockedGetToolBySlug.mockResolvedValue(makeTool());
    mockedResolveRuntimeRollout.mockReturnValue({ enabled: true });

    const metadata = await generateMetadata({ params: Promise.resolve({ slug: "runtime-tool" }) });
    expect(metadata.other).toMatchObject({
      "google-adsense-account": expect.stringMatching(/^ca-pub-/),
    });
  });

  it("generateMetadata returns noindex not found metadata when rollout is disabled", async () => {
    mockedGetToolBySlug.mockResolvedValue(makeTool());
    mockedResolveRuntimeRollout.mockReturnValue({ enabled: false, reason: "disabled" });

    const metadata = await generateMetadata({ params: Promise.resolve({ slug: "runtime-tool" }) });
    expect(metadata.title).toBe("Not found");
    expect(metadata.robots).toEqual({ index: false, follow: false });
    expect(metadata.other).toBeUndefined();
  });

  it("calls notFound when tool is missing", async () => {
    mockedGetToolBySlug.mockResolvedValue(undefined);

    await expect(
      ToolRuntimePage({
        params: Promise.resolve({ slug: "missing-tool" }),
      })
    ).rejects.toThrow("NEXT_NOT_FOUND");
  });

  it("calls notFound when rollout is disabled for the tool", async () => {
    mockedGetToolBySlug.mockResolvedValue(makeTool());
    mockedResolveRuntimeRollout.mockReturnValue({ enabled: false, reason: "disabled" });

    await expect(
      ToolRuntimePage({
        params: Promise.resolve({ slug: "runtime-tool" }),
      })
    ).rejects.toThrow("NEXT_NOT_FOUND");
  });

  it("renders runtime page when tool exists and rollout is enabled", async () => {
    mockedGetToolBySlug.mockResolvedValue(makeTool());
    mockedResolveRuntimeRollout.mockReturnValue({ enabled: true });

    const page = await ToolRuntimePage({
      params: Promise.resolve({ slug: "runtime-tool" }),
    });

    expect(page).toBeTruthy();
    expect(mockedNotFound).not.toHaveBeenCalled();
  });
});
