import Link from "next/link";
import { projects } from "@/content/projects";
import { SITE_LAST_UPDATED, SITE_URL } from "@/lib/site";
import styles from "./HomeSeoIntro.module.scss";

const faqItems = [
  {
    question: "What kinds of projects do you take on?",
    answer:
      "I work on marketing sites, portfolios, e-commerce, and product UI—anything where structure, UX, and performance matter. Briefs range from brand-led launches to more technical dashboards and internal tools.",
  },
  {
    question: "How should I get in touch for a new project?",
    answer:
      "Email hello@yansons.online with a short note: goals, timeline, budget range if you can share it, and links to references or live products. That context makes the first reply much more useful.",
  },
  {
    question: "Where are you based, and do you work remotely?",
    answer:
      "I am based in Warsaw, Poland, and collaborate with teams and clients internationally. Most work is remote-first; on-site sessions are possible when the project needs them.",
  },
] as const;

function formatDisplayDate(iso: Date) {
  return new Intl.DateTimeFormat("en-GB", {
    dateStyle: "long",
    timeZone: "UTC",
  }).format(iso);
}

export function HomeSeoIntro() {
  const [primaryProject, secondaryProject] = projects;
  const updatedLabel = formatDisplayDate(SITE_LAST_UPDATED);

  const faqSchema = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: faqItems.map((item) => ({
      "@type": "Question",
      name: item.question,
      acceptedAnswer: {
        "@type": "Answer",
        text: item.answer,
      },
    })),
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema) }}
      />
      <section className={styles.section} aria-labelledby="home-seo-intro-heading">
        <div className="page-shell">
          <h2 id="home-seo-intro-heading" className={styles.heading}>
            About this portfolio
          </h2>
          <div className={styles.body}>
            <p>
              Alexander Yansons is an independent web developer and creative technologist. This site is the live portfolio
              at{" "}
              <a href={SITE_URL} className="link-underline">
                yansons.online
              </a>
              : case studies with context on stack and role, plus an{" "}
              <Link href="/archive" className="link-underline">
                archive of experiments and visual studies
              </Link>
              . For a deeper walkthrough of selected builds, start with{" "}
              {primaryProject ? (
                <Link href={`/projects/${primaryProject.slug}`} className="link-underline">
                  {primaryProject.title}
                </Link>
              ) : (
                "recent work"
              )}
              {secondaryProject ? (
                <>
                  {" "}
                  and{" "}
                  <Link href={`/projects/${secondaryProject.slug}`} className="link-underline">
                    {secondaryProject.title}
                  </Link>
                </>
              ) : null}
              . The interface layer here is built with modern front-end practices; when you need durable layout and
              interaction patterns, the{" "}
              <a href="https://developer.mozilla.org/en-US/docs/Web/CSS/CSS_grid_layout" className="link-underline">
                MDN guide to CSS Grid
              </a>{" "}
              and the{" "}
              <a href="https://html.spec.whatwg.org/multipage/" className="link-underline">
                WHATWG HTML living standard
              </a>{" "}
              remain useful references for how resilient markup behaves in real browsers.
            </p>
            <p className={styles.meta}>
              Page overview last revised: <time dateTime={SITE_LAST_UPDATED.toISOString()}>{updatedLabel}</time> (UTC).
            </p>
          </div>
        </div>
      </section>

      <section className={styles.section} aria-labelledby="home-faq-heading">
        <div className="page-shell">
          <h2 id="home-faq-heading" className={styles.heading}>
            Common questions
          </h2>
          <div className={styles.faq}>
            {faqItems.map((item) => (
              <div key={item.question} className={styles.faqItem}>
                <h3 className={styles.question}>{item.question}</h3>
                <p className={styles.answer}>{item.answer}</p>
              </div>
            ))}
          </div>
        </div>
      </section>
    </>
  );
}
