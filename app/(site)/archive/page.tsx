import type { Metadata } from "next";
import { archiveEntries } from "@/content/archive/archive-data";
import { InfiniteGrid } from "@/components/ui/InfiniteGrid/InfiniteGrid";
import styles from "./page.module.scss";

export const metadata: Metadata = {
  title: "Archive — Alexander Yansons",
  description: "Experiments, concepts, and supporting visual work.",
};

export default function ArchiveRoute() {
  return (
    <section className={styles.page}>
      <header className={styles.header}>
        <span className="section-label">Archive</span>
        <h1>Experiments and supporting visual work.</h1>
      </header>
      <InfiniteGrid items={archiveEntries} />
    </section>
  );
}
