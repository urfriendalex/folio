import { contactContent } from "@/content/contact";
import { heroContent } from "@/content/hero";
import { HOME_RECENT_PROJECT_COUNT, projects } from "@/content/projects";
import { ContactSectionGooey } from "@/components/sections/Contact/ContactSectionGooey";
import { HomeHero } from "@/components/sections/Hero/HomeHero";
import { WorkSection } from "@/components/sections/Work/WorkSection";
import { PAGE_LAST_MODIFIED, SITE_URL } from "@/lib/site";
import { SITE_DESCRIPTION, SITE_NAME, SITE_OG_IMAGE, SITE_TITLE } from "@/lib/metadata";
import { HeroRevealTimelineProvider } from "@/lib/heroRevealTimeline";
import type { Metadata } from "next";

export const metadata: Metadata = {
  alternates: {
    canonical: "/",
  },
  openGraph: {
    title: SITE_TITLE,
    description: SITE_DESCRIPTION,
    siteName: SITE_NAME,
    type: "website",
    url: SITE_URL,
    images: [SITE_OG_IMAGE],
  },
  twitter: {
    card: "summary_large_image",
    title: SITE_TITLE,
    description: SITE_DESCRIPTION,
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
    dateModified: PAGE_LAST_MODIFIED.home,
  };

  const websiteSchema = {
    "@context": "https://schema.org",
    "@type": "WebSite",
    "@id": `${SITE_URL}/#website`,
    url: SITE_URL,
    name: "Alexander Yansons",
    description:
      "Portfolio of Alexander Yansons — custom websites, e-commerce, portfolios, and product interfaces for brands and teams.",
    publisher: { "@id": `${SITE_URL}/#organization` },
    dateModified: PAGE_LAST_MODIFIED.home,
  };

  const structuredData = [personSchema, organizationSchema, websiteSchema];

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }}
      />
      <HeroRevealTimelineProvider>
        <HomeHero />
        <WorkSection projects={projects.slice(0, HOME_RECENT_PROJECT_COUNT)} />
      </HeroRevealTimelineProvider>
      <ContactSectionGooey
        content={contactContent}
        hoverPhrase={contactContent.emailHoverPhrase ?? "Let's work together"}
      />
    </>
  );
}
