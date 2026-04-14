import type { Metadata } from "next";
import { ArchiveCanvas } from "@/components/Archive/ArchiveCanvas";
import { archiveEntries } from "@/content/archive/archive-data";

export const metadata: Metadata = {
  title: "Archive — Alexander Yansons",
  description: "An infinite spatial archive of experiments, concepts, and supporting visual work.",
};

export default function ArchiveRoute() {
  return <ArchiveCanvas items={archiveEntries} />;
}
