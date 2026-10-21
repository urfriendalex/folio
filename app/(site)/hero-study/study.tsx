"use client";

import { useLayoutEffect, useRef, useState, useSyncExternalStore, type CSSProperties } from "react";
import Link from "next/link";
import { RevealLines } from "@/components/motion/RevealLines/RevealLines";
import ASCIIAnimation from "@/components/Preloader/ascii";
import { LIGHT_FRAME_FOLDER } from "@/components/Preloader/frameFolder";
import { usePreloaderComplete } from "@/lib/preloaderComplete";
import { heroContent } from "@/content/hero";
import { HOME_RECENT_PROJECT_COUNT, projects } from "@/content/projects";
import { WorkSection } from "@/components/sections/Work/WorkSection";
import styles from "./study.module.scss";

const focus = "E-commerce, portfolios, and product UI for brands, studios, and product teams.";
const touchQuery = "(hover: none), (max-width: 48rem)";
function subscribeTouch(callback: () => void) {
  const query = window.matchMedia(touchQuery);
  query.addEventListener("change", callback);
  return () => query.removeEventListener("change", callback);
}
function getTouch() { return window.matchMedia(touchQuery).matches; }
function getServerTouch() { return false; }

export function HeroStudy({ option }: { option: number }) {
  const ready = usePreloaderComplete();
  const [accent, setAccent] = useState(false);
  const [hovered, setHovered] = useState(false);
  const [railRight, setRailRight] = useState(98);
  const heroRef = useRef<HTMLElement>(null);
  const touch = useSyncExternalStore(subscribeTouch, getTouch, getServerTouch);
  const walkerVisible = ready && (touch || hovered);
  useLayoutEffect(() => {
    const align = () => {
      const hero = heroRef.current;
      const archive = document.querySelector('nav a[href="/archive"], [aria-label="Primary"] a[href="/archive"]');
      if (hero && archive) setRailRight(Math.max(0, hero.getBoundingClientRect().right - archive.getBoundingClientRect().right));
    };
    align();
    window.addEventListener("resize", align);
    return () => window.removeEventListener("resize", align);
  }, []);
  return (
    <div className={styles.study} data-hero-study={option}>
      <section ref={heroRef} className={styles.hero} aria-label={`Hero layout option ${option}`}
        style={{ "--ascii-rail-right": `${railRight}px` } as CSSProperties}
        onPointerEnter={() => setHovered(true)} onPointerLeave={() => setHovered(false)}>
        <div className={styles.copy}>
          <RevealLines as="p" className={styles.intro} text={heroContent.position} lines={[heroContent.position]} visible={ready} offset={0}
            renderToken={() => <>Independent Developer<br className={styles.mobileBreak} /><span className={styles.desktopSpace}> </span>&amp; Creative Technologist</>} />
          <RevealLines as="h1" className={styles.heading} text={"I build websites\nand other cool stuff."} visible={ready} offset={1} />
          <div className={styles.details}>
            {option === 4 && <RevealLines as="p" className={styles.label} text="Focus" visible={ready} offset={3} />}
            <RevealLines as="p" className={styles.description} text={focus} visible={ready} offset={option === 4 ? 4 : 3} />
          </div>
          {option === 4 && <div className={styles.location}>
            <RevealLines as="p" className={styles.label} text="Based" visible={ready} offset={7} />
            <RevealLines as="p" className={styles.description} text="Warsaw, Poland" visible={ready} offset={8} />
          </div>}
          <RevealLines as="p" className={styles.cta} text="LET’S BUILD SOMETHING TOGETHER ↗" visible={ready} offset={option === 4 ? 9 : 6}
            renderToken={(token) => <Link href="/#contact" className="link-underline" onPointerEnter={() => setAccent(true)} onPointerLeave={() => setAccent(false)}>{token}</Link>} />
        </div>
        <div className={styles.visual} aria-hidden="true" data-visible={walkerVisible}>
          <ASCIIAnimation className={styles.walkerShell} preClassName={styles.walker} frameFolder={LIGHT_FRAME_FOLDER}
            quality="high" frameCount={37} fps={20} lazy={false} visible={walkerVisible} paused={!walkerVisible} anchorEnd={!touch}
            randomVisibilityReveal randomVisibilityDurationMs={520} scrollDissolve touchWave
            color={accent ? "var(--signal-color)" : "#101010"} />
        </div>
      </section>
      <WorkSection projects={projects.slice(0, HOME_RECENT_PROJECT_COUNT)} />
    </div>
  );
}
