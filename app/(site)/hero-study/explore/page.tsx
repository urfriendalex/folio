import type { Metadata } from "next";
import { HeroStudyExplorer } from "./explorer";

export const metadata: Metadata = {
  title: "Hero layout and type studies",
  robots: { index: false, follow: false },
};

export default async function HeroStudyExplorerPage({ searchParams }: {
  searchParams: Promise<{ option?: string; cta?: string; ascii?: string }>;
}) {
  const { option, cta, ascii } = await searchParams;
  const ctaValue = Number(cta);
  const value = Number(option);
  return <HeroStudyExplorer initialAscii={ascii === "large" ? "large" : ascii === "compact" ? "compact" : "paired"} initialCta={[1, 3, 4, 5, 7, 10].includes(ctaValue) ? ctaValue : null} initialOption={Number.isInteger(value) && value >= 1 && value <= 11 ? value : 1} />;
}
