import type { Metadata } from "next";
import Link from "next/link";
import { BookingButtonAscii } from "@/components/layout/Footer/BookingButtonAscii";
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
    <div className={`page-shell ${styles.page}`}>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(schema).replace(/</g, "\\u003c") }}
      />
      <header className={styles.header}>
        <BookingButtonAscii className={styles.field} />
        <div className={styles.intro}>
          <p className={styles.eyebrow}>Before we begin / FAQ</p>
          <h1 className={styles.title}>A few <br />good questions<span aria-hidden="true">.</span></h1>
          <p className={styles.description}>
            The basics of working together. Projects, first conversations, and where I call home.
          </p>
        </div>
        <span className={styles.marker} aria-hidden="true">?</span>
        <p className={styles.headerMeta}>03 questions / Straight answers</p>
      </header>

      <section className={styles.answers} aria-label="Frequently asked questions">
        {faqContent.map(({ id, question, answer }, index) => (
          <article className={styles.answer} key={id} aria-labelledby={`faq-${id}`}>
            <span className={styles.number} aria-hidden="true">0{index + 1}</span>
            <h2 id={`faq-${id}`} className={styles.question}>{question}</h2>
            <p className={styles.answerText}>{answer}</p>
          </article>
        ))}
      </section>

      <section className={styles.contact} aria-labelledby="faq-contact-title">
        <div>
          <p className={styles.eyebrow}>Keep the conversation going</p>
          <h2 id="faq-contact-title">Something else on your mind?</h2>
        </div>
        <a className={styles.contactLink} href={`mailto:${contactContent.email}`}>
          {contactContent.email}<span aria-hidden="true">↗</span>
        </a>
      </section>
      <Link href="/projects" className={`link-underline ${styles.workLink}`}>Explore selected work ↗</Link>
    </div>
  );
}
