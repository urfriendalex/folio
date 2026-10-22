import { contactContent } from "@/content/contact";
import { heroContent } from "@/content/hero";
import { SITE_DESCRIPTION, SITE_NAME } from "@/lib/metadata";
import { SITE_URL } from "@/lib/site";

/** Stable entity ids so every page's JSON-LD points at the same person, site, and studio. */
export const PERSON_ID = `${SITE_URL}/#person`;
export const WEBSITE_ID = `${SITE_URL}/#website`;
export const ORGANIZATION_ID = `${SITE_URL}/#organization`;

export const PROFILE_SAME_AS = [
  contactContent.github,
  contactContent.linkedin,
  contactContent.instagram,
  contactContent.threads,
].filter(Boolean);

/** Topics the person entity is known for; keep aligned with the about copy and FAQ. */
const KNOWS_ABOUT = [
  "Web development",
  "Frontend engineering",
  "Creative technology",
  "Next.js",
  "React",
  "Svelte",
  "Sanity",
  "Framer",
  "Shopify",
  "Liquid",
  "E-commerce",
  "Technical SEO",
  "Interaction design",
  "Motion design",
  "GSAP",
];

export function personEntity() {
  return {
    "@type": "Person",
    "@id": PERSON_ID,
    name: heroContent.name,
    givenName: "Alexander",
    familyName: "Yansons",
    jobTitle: heroContent.position,
    description: SITE_DESCRIPTION,
    email: `mailto:${contactContent.email}`,
    url: SITE_URL,
    address: {
      "@type": "PostalAddress",
      addressLocality: "Warsaw",
      addressCountry: "PL",
    },
    homeLocation: {
      "@type": "Place",
      name: contactContent.location,
    },
    knowsAbout: KNOWS_ABOUT,
    sameAs: PROFILE_SAME_AS,
  };
}

export function websiteEntity(dateModified: string) {
  return {
    "@type": "WebSite",
    "@id": WEBSITE_ID,
    url: SITE_URL,
    name: SITE_NAME,
    alternateName: ["Yansons", "yansons.online"],
    description: SITE_DESCRIPTION,
    inLanguage: "en",
    author: { "@id": PERSON_ID },
    publisher: { "@id": PERSON_ID },
    dateModified,
  };
}

/** Independent practice the person trades as; `founder` ties it back to the person entity. */
export function organizationEntity() {
  return {
    "@type": "ProfessionalService",
    "@id": ORGANIZATION_ID,
    name: SITE_NAME,
    url: SITE_URL,
    logo: `${SITE_URL}/favicons/dark/apple-touch-icon.png`,
    image: `${SITE_URL}/og.png`,
    description: SITE_DESCRIPTION,
    email: contactContent.email,
    founder: { "@id": PERSON_ID },
    address: {
      "@type": "PostalAddress",
      addressLocality: "Warsaw",
      addressCountry: "PL",
    },
    areaServed: "Worldwide",
    knowsAbout: KNOWS_ABOUT,
    sameAs: PROFILE_SAME_AS,
  };
}

export type BreadcrumbItem = { name: string; path: string };

export function breadcrumbEntity(items: BreadcrumbItem[]) {
  return {
    "@type": "BreadcrumbList",
    itemListElement: [{ name: "Home", path: "/" }, ...items].map((item, index) => ({
      "@type": "ListItem",
      position: index + 1,
      name: item.name,
      item: item.path === "/" ? SITE_URL : `${SITE_URL}${item.path}`,
    })),
  };
}

/** Serialize a JSON-LD graph; escapes `<` so content can never close the script tag. */
export function jsonLd(...nodes: object[]): string {
  return JSON.stringify({ "@context": "https://schema.org", "@graph": nodes }).replace(/</g, "\\u003c");
}
