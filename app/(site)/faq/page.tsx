import type { Metadata } from "next";
import Link from "next/link";
import { FaqExperience } from "./FaqExperience";
import { contactContent } from "@/content/contact";
import { SITE_NAME, SITE_OG_IMAGE } from "@/lib/metadata";
import { PAGE_LAST_MODIFIED, SITE_URL } from "@/lib/site";
import { faqContent } from "./content";
import styles from "./page.module.scss";

const title = "FAQ · Alexander Yansons";
const description =
  "Working with Alexander Yansons: project types, getting in touch, and remote collaboration from Warsaw.";

export const metadata: Metadata = {
  title,
  description,
  alternates: { canonical: "/faq" },
  openGraph: {
    title,
    description,
    siteName: SITE_NAME,
    type: "website",
    url: `${SITE_URL}/faq`,
    images: [SITE_OG_IMAGE],
  },
  twitter: {
    card: "summary_large_image",
    title,
    description,
    images: [SITE_OG_IMAGE.url],
  },
};

export default function FaqPage() {
  const schema = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    "@id": `${SITE_URL}/faq#faq`,
    url: `${SITE_URL}/faq`,
    name: title,
    dateModified: PAGE_LAST_MODIFIED.faq,
    isPartOf: { "@id": `${SITE_URL}/#website` },
    mainEntity: faqContent.map(({ question, answer }) => ({
      "@type": "Question",
      name: question,
      acceptedAnswer: { "@type": "Answer", text: answer },
    })),
  };

  return (
    <FaqExperience>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(schema).replace(/</g, "\\u003c") }}
      />
      <div className={styles.content} data-faq-content>
        <h1 className={styles.title} data-faq-reveal>Frequently asked questions</h1>
        <section aria-label="Working together">
          {faqContent.map(({ id, question, answer }, index) => (
            <div className={styles.item} key={id}>
              <span className={styles.rule} data-faq-rule aria-hidden="true" />
              <details className={styles.detail} name="faq" open={index === 0}>
              <summary className={styles.summary}>
                <h2 id={`faq-${id}`} className={styles.question} data-faq-reveal>{question}</h2>
                <span className={styles.toggle} aria-hidden="true" />
              </summary>
              <p className={styles.answerText} data-faq-reveal>{answer}</p>
              </details>
              {index === faqContent.length - 1 && (
                <span className={`${styles.rule} ${styles.bottomRule}`} data-faq-rule aria-hidden="true" />
              )}
            </div>
          ))}
        </section>
        <p className={styles.note} data-faq-reveal>
          Something else on your mind? Write to {" "}
          <a className="link-underline" href={`mailto:${contactContent.email}`}>{contactContent.email}</a>
          {" "}or take a look at {" "}
          <Link href="/projects" className="link-underline">selected work</Link>.
        </p>
      </div>
    </FaqExperience>
  );
}
