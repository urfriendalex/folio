import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { HeroOptionPreview } from "./option-preview";
import { heroOptions, isHeroOption } from "./options";
import styles from "./review.module.scss";

export const metadata: Metadata = { title: "Hero layout studies", robots: { index: false, follow: false } };

export default async function HeroStudyPage({ searchParams }: { searchParams: Promise<{ option?: string }> }) {
  const { option } = await searchParams;
  if (option && isHeroOption(option)) return <HeroOptionPreview option={Number(option)} />;
  return (
    <div className={`page-shell ${styles.index}`}>
      <header className={styles.heading}>
        <p className={styles.eyebrow}>Hero studies</p>
        <h1>Four ways in.</h1>
        <p>Option 2 is on the homepage. Open any direction to compare the responsive layout and live ASCII animation.</p>
        <Link className="link-underline" href="/">View the homepage ↗</Link>
      </header>
      <div className={styles.grid}>
        {heroOptions.map((option) => (
          <Link className={styles.card} href={`/hero-study/${option.id}`} key={option.id}>
            <Image src={`/hero-options/option-${option.id}.jpg`} alt={`Desktop preview of ${option.name}`} width={1440} height={900} sizes="(max-width: 48rem) 100vw, 50vw" />
            <div className={styles.cardTitle}><h2>{String(option.id).padStart(2, "0")} · {option.name}</h2>{option.id === 2 && <span>Selected</span>}</div>
            <p>{option.description}</p>
            <span className={styles.open}>Open option ↗</span>
          </Link>
        ))}
      </div>
    </div>
  );
}
