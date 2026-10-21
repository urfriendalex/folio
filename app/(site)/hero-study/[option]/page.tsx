import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { HeroOptionPreview } from "../option-preview";
import { heroOptions, isHeroOption } from "../options";

export function generateStaticParams() { return heroOptions.map(({ id }) => ({ option: String(id) })); }

export async function generateMetadata({ params }: { params: Promise<{ option: string }> }): Promise<Metadata> {
  const { option } = await params;
  const selected = heroOptions.find(({ id }) => String(id) === option);
  return { title: selected ? `Hero ${option}: ${selected.name}` : "Hero option", robots: { index: false, follow: false } };
}

export default async function HeroOptionPage({ params }: { params: Promise<{ option: string }> }) {
  const { option } = await params;
  if (!isHeroOption(option)) notFound();
  return <HeroOptionPreview option={Number(option)} />;
}
