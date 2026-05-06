import { contactContent } from "@/content/contact";
import { heroContent } from "@/content/hero";
import { projects } from "@/content/projects";
import { ContactSectionGooey } from "@/components/sections/Contact/ContactSectionGooey";
import { HeroSection } from "@/components/sections/Hero/HeroSection";
import { WorkSection } from "@/components/sections/Work/WorkSection";
import { SITE_LAST_UPDATED, SITE_URL } from "@/lib/site";
import { SITE_OG_IMAGE } from "@/lib/metadata";
import type { Metadata } from "next";

export const metadata: Metadata = {
  alternates: {
    canonical: "/",
  },
  openGraph: {
    images: [SITE_OG_IMAGE],
  },
  twitter: {
    images: [SITE_OG_IMAGE.url],
  },
};

export default function Home() {
  const personSchema = {
    "@context": "https://schema.org",
    "@type": "Person",
    name: heroContent.name,
    jobTitle: heroContent.position,
    email: contactContent.email,
    url: SITE_URL,
    sameAs: [
      contactContent.github,
      contactContent.linkedin,
      contactContent.instagram,
      contactContent.threads,
    ].filter(Boolean),
  };

  const organizationSchema = {
    "@context": "https://schema.org",
    "@type": "Organization",
    "@id": `${SITE_URL}/#organization`,
    name: heroContent.name,
    url: SITE_URL,
    logo: `${SITE_URL}/favicons/dark/apple-touch-icon.png`,
    email: contactContent.email,
    sameAs: personSchema.sameAs,
    dateModified: SITE_LAST_UPDATED.toISOString(),
  };

  const websiteSchema = {
    "@context": "https://schema.org",
    "@type": "WebSite",
    "@id": `${SITE_URL}/#website`,
    url: SITE_URL,
    name: "Alexander Yansons",
    description:
      "Portfolio of Alexander Yansons — custom websites, e-commerce, portfolios, and product UI for brands and teams.",
    publisher: { "@id": `${SITE_URL}/#organization` },
    dateModified: SITE_LAST_UPDATED.toISOString(),
  };

  const structuredData = [personSchema, organizationSchema, websiteSchema];

  const faqPageSchema = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: [
      {
        "@type": "Question",
        name: "What kinds of projects do you take on?",
        acceptedAnswer: {
          "@type": "Answer",
          text: "I work on marketing sites, portfolios, e-commerce, and product UI—anything where structure, UX, and performance matter. Briefs range from brand-led launches to more technical dashboards and internal tools.",
        },
      },
      {
        "@type": "Question",
        name: "How should I get in touch for a new project?",
        acceptedAnswer: {
          "@type": "Answer",
          text: "Email hello@yansons.online with a short note: goals, timeline, budget range if you can share it, and links to references or live products. That context makes the first reply much more useful.",
        },
      },
      {
        "@type": "Question",
        name: "Where are you based, and do you work remotely?",
        acceptedAnswer: {
          "@type": "Answer",
          text: "I am based in Warsaw, Poland, and collaborate with teams and clients internationally. Most work is remote-first; on-site sessions are possible when the project needs them.",
        },
      },
    ],
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqPageSchema) }}
      />
      <HeroSection content={heroContent} />
      <WorkSection projects={projects} />
      <ContactSectionGooey
        content={contactContent}
        hoverPhrase={contactContent.emailHoverPhrase ?? "Let's work together"}
      />
    </>
  );
}
