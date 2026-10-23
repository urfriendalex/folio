import { contactContent } from "@/content/contact";
import { HOME_RECENT_PROJECT_COUNT, projects } from "@/content/projects";
import { ContactSectionGooey } from "@/components/sections/Contact/ContactSectionGooey";
import { HomeHero } from "@/components/sections/Hero/HomeHero";
import { WorkSection } from "@/components/sections/Work/WorkSection";
import { PAGE_LAST_MODIFIED, SITE_URL } from "@/lib/site";
import { SITE_DESCRIPTION, SITE_NAME, SITE_OG_IMAGE, SITE_TITLE } from "@/lib/metadata";
import { HeroRevealTimelineProvider } from "@/lib/heroRevealTimeline";
import {
  jsonLd,
  organizationEntity,
  PERSON_ID,
  personEntity,
  WEBSITE_ID,
  websiteEntity,
} from "@/lib/structuredData";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: { absolute: SITE_TITLE },
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
  const profilePageSchema = {
    "@type": "ProfilePage",
    "@id": `${SITE_URL}/#profile`,
    url: SITE_URL,
    name: SITE_TITLE,
    description: SITE_DESCRIPTION,
    inLanguage: "en",
    isPartOf: { "@id": WEBSITE_ID },
    mainEntity: { "@id": PERSON_ID },
    about: { "@id": PERSON_ID },
    primaryImageOfPage: {
      "@type": "ImageObject",
      url: `${SITE_URL}${SITE_OG_IMAGE.url}`,
      width: SITE_OG_IMAGE.width,
      height: SITE_OG_IMAGE.height,
    },
    dateModified: PAGE_LAST_MODIFIED.home,
    hasPart: projects.slice(0, HOME_RECENT_PROJECT_COUNT).map((project) => ({
      "@type": "CreativeWork",
      "@id": `${SITE_URL}/projects/${project.slug}#project`,
      name: project.title,
      url: `${SITE_URL}/projects/${project.slug}`,
    })),
  };

  const structuredData = jsonLd(
    profilePageSchema,
    personEntity(),
    websiteEntity(PAGE_LAST_MODIFIED.home),
    organizationEntity(),
  );

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: structuredData }}
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
