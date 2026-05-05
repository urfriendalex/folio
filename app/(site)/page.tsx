import { contactContent } from "@/content/contact";
import { heroContent } from "@/content/hero";
import { projects } from "@/content/projects";
import { ContactSectionGooey } from "@/components/sections/Contact/ContactSectionGooey";
import { HomeSeoIntro } from "@/components/sections/HomeSeoIntro/HomeSeoIntro";
import { HeroSection } from "@/components/sections/Hero/HeroSection";
import { WorkSection } from "@/components/sections/Work/WorkSection";
import { SITE_LAST_UPDATED, SITE_URL } from "@/lib/site";
import type { Metadata } from "next";

export const metadata: Metadata = {
  alternates: {
    canonical: "/",
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

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }}
      />
      <HeroSection content={heroContent} />
      <WorkSection projects={projects} />
      <HomeSeoIntro />
      <ContactSectionGooey
        content={contactContent}
        hoverPhrase={contactContent.emailHoverPhrase ?? "Let's work together"}
      />
    </>
  );
}
