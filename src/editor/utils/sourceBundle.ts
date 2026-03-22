import JSZip from "jszip";

type SourceCategory = {
  label: string;
  count: number;
};

const SOURCE_CATEGORIES: SourceCategory[] = [
  { label: "Engine", count: 34 },
  { label: "Editor", count: 62 },
  { label: "Runtime", count: 7 },
  { label: "Shared", count: 11 },
  { label: "UI Components", count: 61 },
  { label: "Pages, hooks, lib", count: 6 },
  { label: "Sample project", count: 3 },
  { label: "Scripts and config", count: 9 },
];

const SOURCE_README = [
  "# Adventure Engine - Source Snapshot",
  "",
  "This standalone build does not embed the full repository contents into the",
  "browser bundle, so the in-app source download falls back to a lightweight",
  "snapshot manifest instead of shipping every source file.",
  "",
  "Included here:",
  "- high-level source categories",
  "- total file count used by the docs UI",
  "- guidance for obtaining the full source from the repository checkout",
  "",
  "To work with the real source locally, use the repository files directly",
  "from your project checkout rather than this browser-generated archive.",
].join("\n");

export function getSourceCategories(): SourceCategory[] {
  return SOURCE_CATEGORIES;
}

export function getSourceFileCount(): number {
  return SOURCE_CATEGORIES.reduce((sum, category) => sum + category.count, 0);
}

export async function generateSourceZip(): Promise<Blob> {
  const zip = new JSZip();
  const root = zip.folder("adventure-engine-source")!;

  root.file("README.md", SOURCE_README);
  root.file(
    "source-manifest.json",
    JSON.stringify(
      {
        generatedAt: new Date().toISOString(),
        totalFiles: getSourceFileCount(),
        categories: SOURCE_CATEGORIES,
      },
      null,
      2
    )
  );

  return zip.generateAsync({ type: "blob" });
}
