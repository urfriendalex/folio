import Link from "next/link";
import { HeroSection } from "@/components/sections/Hero/HeroSection";
import { WorkSection } from "@/components/sections/Work/WorkSection";
import { ContactSectionGooey } from "@/components/sections/Contact/ContactSectionGooey";
import { heroContent } from "@/content/hero";
import { contactContent } from "@/content/contact";
import { HOME_RECENT_PROJECT_COUNT, projects } from "@/content/projects";
import { HeroRevealTimelineProvider } from "@/lib/heroRevealTimeline";
import { HeroStudy } from "./study";
import { heroOptions } from "./options";
import styles from "./review.module.scss";
import studyStyles from "./study.module.scss";

export function HeroOptionPreview({ option }: { option: number }) {
  return (
    <>
      <nav className={styles.navigation} aria-label="Hero options">
        <Link href="/hero-study">← All options</Link>
        <div>{heroOptions.map(({ id }) => <Link key={id} href={`/hero-study/${id}`} aria-current={id === option ? "page" : undefined} aria-label={`Hero option ${id}${id === 2 ? ", selected" : ""}`}>{String(id).padStart(2, "0")}</Link>)}</div>
      </nav>
      {option === 2 ? (
        <div className={studyStyles.study} data-hero-option="2">
          <HeroRevealTimelineProvider>
            <HeroSection content={heroContent} />
            <WorkSection projects={projects.slice(0, HOME_RECENT_PROJECT_COUNT)} />
          </HeroRevealTimelineProvider>
          <ContactSectionGooey content={contactContent} hoverPhrase={contactContent.emailHoverPhrase ?? "Let's work together"} />
        </div>
      ) : <HeroStudy option={option} />}
    </>
  );
}
