"use client";

import { useEffect, useState } from "react";
import { BookingButtonAscii } from "@/components/layout/Footer/BookingButtonAscii";
import { heroContent } from "@/content/hero";
import { HeroDetailText, HeroSection } from "./HeroSection";
import styles from "./HomeHero.module.scss";

const content = {
  ...heroContent,
  statement: heroContent.statement.replace("\n", " "),
  description: "You work directly with me, from the first idea to launch.",
  ctaLine: "Let's make it happen ↗",
};

const details = (
  <dl className={styles.facts}>
    <div data-dissolve-block="">
      <dt><HeroDetailText text="Focus" seed={401} /></dt>
      <dd><HeroDetailText text="Websites & e-commerce" seed={409} /><br /><HeroDetailText text="Code-driven motion" seed={419} /><br /><HeroDetailText text="Generative imagery & video" seed={431} /></dd>
    </div>
    <div data-dissolve-block="">
      <dt><HeroDetailText text="Based" seed={443} /></dt>
      <dd><HeroDetailText text="Warsaw, Poland" seed={449} /></dd>
    </div>
    <div className={styles.contactBlock} data-dissolve-block="">
      <dt><a className={styles.contactLink} href="#contact" aria-label="Availability: open to new projects. Go to contact."><HeroDetailText text="Availability" seed={457} /></a></dt>
      <dd><HeroDetailText text="Open to new projects" seed={463} /></dd>
    </div>
  </dl>
);

/** Reference study 04, without the study controls or comparison board. */
export function HomeHero() {
  const [expanded, setExpanded] = useState(false);
  useEffect(() => {
    if (!expanded) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setExpanded(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [expanded]);

  return (
    <div className={styles.hero} data-ascii-expanded={expanded}>
      <HeroSection
        content={content}
        mobileHeadingBreakBefore="and other cool"
        introClassName={styles.role}
        ctaClassName={styles.cta}
        ctaAdornment={<BookingButtonAscii className={styles.ctaAscii} accent="--signal-color" clearance="box" directional glitch touchOrbit />}
        supportingContent={details}
        asciiInteraction={{ expanded, onToggle: () => setExpanded((value) => !value) }}
      />
    </div>
  );
}
