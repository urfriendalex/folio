import type { Metadata } from "next";
import Link from "next/link";
import { FaqExperience } from "./FaqExperience";
import { contactContent } from "@/content/contact";
import { SITE_NAME, SITE_OG_IMAGE } from "@/lib/metadata";
import { PAGE_LAST_MODIFIED, SITE_URL } from "@/lib/site";
import { breadcrumbEntity, jsonLd, PERSON_ID, WEBSITE_ID } from "@/lib/structuredData";
import { faqContent } from "./content";
import styles from "./page.module.scss";

const title = "FAQ — Working With a Freelance Web Developer in Warsaw";
const description =
  "Working with Alexander Yansons: project types, Shopify and Next.js work, what SEO is included, how to get in touch, and remote collaboration from Warsaw, Poland.";

export const metadata: Metadata = {
  title,
  description,
  alternates: { canonical: "/faq" },
  openGraph: {
    title: `${title} · ${SITE_NAME}`,
    description,
    siteName: SITE_NAME,
    type: "website",
    url: `${SITE_URL}/faq`,
    images: [SITE_OG_IMAGE],
  },
  twitter: {
    card: "summary_large_image",
    title: `${title} · ${SITE_NAME}`,
    description,
    images: [SITE_OG_IMAGE.url],
  },
};

export default function FaqPage() {
  const schema = {
    "@type": "FAQPage",
    "@id": `${SITE_URL}/faq#faq`,
    url: `${SITE_URL}/faq`,
    name: `${title} · ${SITE_NAME}`,
    inLanguage: "en",
    dateModified: PAGE_LAST_MODIFIED.faq,
    isPartOf: { "@id": WEBSITE_ID },
    about: { "@id": PERSON_ID },
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
        dangerouslySetInnerHTML={{ __html: jsonLd(schema, breadcrumbEntity([{ name: "FAQ", path: "/faq" }])) }}
      />
      <div className={styles.content} data-faq-content>
        <h1 className={styles.title} data-faq-reveal>Frequently asked questions</h1>
        <section aria-label="Working together">
          {faqContent.map(({ id, question, answer }, index) => (
            <div className={styles.item} key={id}>
              <span className={styles.rule} data-faq-rule aria-hidden="true" />
              <details className={styles.detail} name="faq" data-faq-disclosure open={index === 0}>
              <summary className={styles.summary}>
                <h2 id={`faq-${id}`} className={styles.question} data-faq-reveal>{question}</h2>
                <span className={styles.toggle} aria-hidden="true" />
              </summary>
              <p className={styles.answerText} data-faq-reveal data-faq-answer>{answer}</p>
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
