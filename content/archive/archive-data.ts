import { archiveManifest } from "@/lib/generated/archive-manifest";

const repeatedItems = [...archiveManifest, ...archiveManifest, ...archiveManifest];

export const archiveEntries = repeatedItems.map((item, index) => ({
  id: `${item.src}-${index}`,
  image: item.src,
  width: item.width,
  height: item.height,
  title: `Study ${String(index + 1).padStart(2, "0")}`,
  year: index % 2 === 0 ? "2025" : undefined,
}));
