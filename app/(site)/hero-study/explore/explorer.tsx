"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { BookingButtonAscii } from "@/components/layout/Footer/BookingButtonAscii";
import { HeroSection, HeroDetailText } from "@/components/sections/Hero/HeroSection";
import { WorkSection } from "@/components/sections/Work/WorkSection";
import { ContactSectionGooey } from "@/components/sections/Contact/ContactSectionGooey";
import { HeroRevealTimelineProvider } from "@/lib/heroRevealTimeline";
import { lockBodyScroll, unlockBodyScroll } from "@/lib/scrollLock";
import { getLenis } from "@/lib/smoothScroll";
import { heroContent } from "@/content/hero";
import { contactContent } from "@/content/contact";
import { projects, HOME_RECENT_PROJECT_COUNT } from "@/content/projects";
import styles from "./explorer.module.scss";

const options = [
  ["Basic current", "Your current scale and large ASCII, with the original invitation and its familiar underline."],
  ["Reference · original small type", "The original reference composition with its small heading, subtitle, and information columns."],
  ["Reference · compact type", "A first step up from option 02, scaling the heading, supporting copy, and details together."],
  ["Reference · middle type", "A middle scale between the compact and larger reference compositions."],
  ["Reference · generous type", "The largest reference scale, with a prominent heading and larger supporting copy and details."],
  ["Reference hierarchy", "The reference’s low, wide introduction and a small information rail, with a compact ASCII on the right."],
  ["Statement + brackets", "A strong headline paired with a compact, bracketed invitation."],
  ["Compact + ASCII underline", "A tighter text stack with a moving ASCII trace beneath the project invitation."],
  ["Open + contact field", "More breathing room and a fine outlined CTA using the contact section’s directional glyph field."],
  ["Quiet + terminal", "Understated details and a command-like invitation with a short ASCII trace."],
  ["Balanced + glyph reveal", "An aligned text invitation, with a borderless ASCII field appearing on hover or keyboard focus."],
] as const;

const ctas = [
  { id: 10, name: "Glyph reveal · borderless", text: "Let's make it happen ↗", style: "ctaGlitch", field: true },
  { id: 7, name: "Terminal prompt", text: "> Let's talk ↗", style: "ctaTerminal", field: false },
  { id: 5, name: "Contact field", text: "Start a project ↗", style: "ctaField", field: true },
  { id: 4, name: "ASCII underline", text: "Tell me about your project ↗", style: "ctaUnderline", field: true },
  { id: 3, name: "Bracketed invitation", text: "[ Let's talk ↗ ]", style: "ctaBracket", field: false },
  { id: 1, name: "Original · underline", text: "Let's build something together ↗", style: "ctaOriginal", field: false },
] as const;

const pairedCtas = [1, 10, 10, 10, 10, 10, 3, 4, 5, 7, 10];
const layoutIds = [1, 2, 2, 2, 2, 6, 3, 4, 5, 7, 10];
const screenshotSource = (number: number) => `/hero-explorations/curated-${number}.png?v=curated-directions`;

export function HeroStudyExplorer({ initialOption, initialCta, initialAscii }: { initialOption: number; initialCta: number | null; initialAscii: "paired" | "large" | "compact" }) {
  const [option, setOption] = useState(initialOption);
  const [asciiMode, setAsciiMode] = useState(initialAscii);
  const [asciiExpanded, setAsciiExpanded] = useState(false);
  const [imagePreview, setImagePreview] = useState<number | null>(null);
  const imageDialogRef = useRef<HTMLDialogElement>(null);
  const compactAscii = asciiMode === "compact" || (asciiMode === "paired" && [2, 3, 4, 5, 6].includes(option));
  const referenceLayout = [2, 3, 4, 5, 6].includes(option);
  useEffect(() => {
    if (!asciiExpanded) return;
    const onKey = (event: KeyboardEvent) => { if (event.key === "Escape") setAsciiExpanded(false); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [asciiExpanded]);
  useEffect(() => {
    const dialog = imageDialogRef.current;
    if (imagePreview !== null) {
      dialog?.showModal();
      lockBodyScroll();
      return () => unlockBodyScroll();
    }
    dialog?.close();
  }, [imagePreview]);
  function chooseAscii(value: "paired" | "large" | "compact") {
    setAsciiExpanded(false);
    setAsciiMode(value);
    const url = new URL(window.location.href);
    if (value === "paired") url.searchParams.delete("ascii");
    else url.searchParams.set("ascii", value);
    window.history.replaceState(window.history.state, "", url);
  }
  const [ctaOverride, setCtaOverride] = useState<number | null>(initialCta);
  const cta = ctas.find(({ id }) => id === (ctaOverride ?? pairedCtas[option - 1])) ?? ctas[0];
  function chooseCta(value: string) {
    const next = value === "paired" ? null : Number(value);
    setCtaOverride(next);
    const url = new URL(window.location.href);
    if (next === null) url.searchParams.delete("cta");
    else url.searchParams.set("cta", String(next));
    window.history.replaceState(window.history.state, "", url);
  }
  function choose(next: number) {
    setAsciiExpanded(false);
    setOption(next);
    const url = new URL(window.location.href);
    url.searchParams.set("option", String(next));
    window.history.replaceState(window.history.state, "", url);
  }
  return (
    <div className={`${styles.preview} ${styles[`layout${layoutIds[option - 1]}`]} ${option === 2 ? styles.typeOriginal : option >= 3 && option <= 5 ? styles[`typeScale${option + 8}`] : ""}`} data-hero-exploration={option} data-ascii-size={compactAscii ? "compact" : "large"} data-ascii-expanded={asciiExpanded}>
      <div className={styles.controls} role="region" aria-label="Hero study controls">
        <Link href="/hero-study">Hero studies</Link>
        <div className={styles.switchers}>
          <div className={styles.picker}>
            <button type="button" aria-label="Previous hero option" onClick={() => choose(option === 1 ? options.length : option - 1)}>←</button>
            <label className={styles.selectLabel}>
              <span className={styles.srOnly}>Hero direction</span>
              <select aria-label="Hero direction" value={option} onChange={(event) => choose(Number(event.target.value))}>
                {[["Current", 0, 1], ["Reference directions", 1, 6], ["Five alternatives", 6, options.length]].map(([label, start, end]) => (
                  <optgroup key={label} label={String(label)}>
                    {options.slice(Number(start), Number(end)).map(([name], index) => {
                      const number = Number(start) + index + 1;
                      return <option key={name} value={number}>{String(number).padStart(2, "0")} / {options.length} · {name}</option>;
                    })}
                  </optgroup>
                ))}
              </select>
            </label>
            <button type="button" aria-label="Next hero option" onClick={() => choose(option === options.length ? 1 : option + 1)}>→</button>
          </div>
          <select className={styles.ctaSelect} aria-label="CTA treatment" value={ctaOverride ?? "paired"} onChange={(event) => chooseCta(event.target.value)}>
            <option value="paired">CTA · suggested pairing</option>
            {ctas.map(({ id, name }) => <option key={id} value={id}>CTA · {name}</option>)}
          </select>
          <select className={styles.asciiSelect} aria-label="ASCII size" value={asciiMode} onChange={(event) => chooseAscii(event.target.value as "paired" | "large" | "compact")}>
            <option value="paired">ASCII · paired</option>
            <option value="large">ASCII · large</option>
            <option value="compact">ASCII · compact</option>
          </select>

        </div>
        <a href="#hero-options">Compare all ↓</a>
      </div>
      <HeroRevealTimelineProvider>
        <HeroSection
          content={{ ...heroContent, statement: referenceLayout ? heroContent.statement.replace("\n", " ") : heroContent.statement, description: referenceLayout ? "You work directly with me, from the first idea to launch." : "Creative websites and e-commerce, with code-driven motion, imagery, and generative video.", ctaLine: cta.text }}
          introClassName={styles.roleLine}
          mobileHeadingBreakBefore={referenceLayout ? "and other cool" : undefined}
          asciiInteraction={compactAscii ? { expanded: asciiExpanded, onToggle: () => setAsciiExpanded((value) => !value) } : undefined}
          supportingContent={referenceLayout ? <dl className={styles.referenceFacts}>
            <div data-dissolve-block=""><dt><HeroDetailText text="Focus" seed={401} /></dt><dd><HeroDetailText text="Websites & e-commerce" seed={409} /><br /><HeroDetailText text="Code-driven motion" seed={419} /><br /><HeroDetailText text="Generative imagery & video" seed={431} /></dd></div>
            <div data-dissolve-block=""><dt><HeroDetailText text="Based" seed={443} /></dt><dd><HeroDetailText text="Warsaw, Poland" seed={449} /></dd></div>
            <div className={styles.contactBlock} data-dissolve-block=""><dt><a className={styles.contactLink} href="#contact" aria-label="Availability: open to new projects. Go to contact."><HeroDetailText text="Availability" seed={457} /></a></dt><dd><HeroDetailText text="Open to new projects" seed={463} /></dd></div>
          </dl> : undefined}
          ctaClassName={`${styles.cta} ${styles[cta.style]}`}
          ctaAdornment={cta.field ? <BookingButtonAscii key={cta.style} className={styles.ctaAscii}
            accent="--signal-color" clearance="box" directional glitch={cta.style === "ctaGlitch"} touchOrbit={cta.style === "ctaGlitch"} /> : undefined}
        />
        <section className={`page-shell ${styles.board}`} id="hero-options" aria-labelledby="hero-options-title">
          <div className={styles.boardHeading}>
            <h2 id="hero-options-title">Your hero, eleven directions.</h2>
            <p>01 keeps the current composition. 02–06 preserve every reference direction, from the original small type to larger scales and an alternative information layout. 07–11 are five distinct alternatives. Mix any direction with your preferred CTA and ASCII size.</p>
          </div>
          <div className={styles.options}>
            {options.map(([name, description], index) => (
              <article key={name} className={styles.card}>
              <button type="button" className={styles.cardChoice} aria-pressed={option === index + 1}
                onClick={() => {
                  choose(index + 1);
                  const lenis = getLenis();
                  if (lenis) lenis.scrollTo(0, { immediate: true, force: true });
                  else window.scrollTo({ top: 0, behavior: "instant" });
                }}>
                <span className={styles.cardMeta}><span>{String(index + 1).padStart(2, "0")} · {name}</span><span>{option === index + 1 ? "Viewing" : "Try in hero ↗"}</span></span>
                <Image className={styles.thumbnail} src={screenshotSource(index + 1)}
                  alt={`${name}: complete hero composition`} width={1440} height={848}
                  sizes="(max-width: 48rem) 100vw, 50vw" unoptimized />
              </button>
              <p className={styles.description}>{description}</p>
              <button type="button" className={styles.fitButton} onClick={() => setImagePreview(index + 1)}>Fit screenshot to screen ↗</button>
              </article>
            ))}
          </div>
        </section>
        <WorkSection projects={projects.slice(0, HOME_RECENT_PROJECT_COUNT)} />
      </HeroRevealTimelineProvider>
      <ContactSectionGooey content={contactContent} hoverPhrase={contactContent.emailHoverPhrase} />
      <dialog ref={imageDialogRef} className={styles.imageDialog} onCancel={() => setImagePreview(null)} onClose={() => setImagePreview(null)} aria-label="Hero screenshot preview">
        <div className={styles.imageToolbar}>
          <span>{imagePreview ? `${String(imagePreview).padStart(2, "0")} · ${options[imagePreview - 1][0]}` : ""}</span>
          <button type="button" onClick={() => setImagePreview(null)}>Close ×</button>
        </div>
        {imagePreview ? <Image src={screenshotSource(imagePreview)} alt={options[imagePreview - 1][0]} width={1440} height={848} unoptimized /> : null}
      </dialog>
    </div>
  );
}
