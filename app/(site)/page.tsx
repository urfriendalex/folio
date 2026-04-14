import { contactContent } from "@/content/contact";
import { heroContent } from "@/content/hero";
import { projects } from "@/content/projects";
import { ContactSectionGooey } from "@/components/sections/Contact/ContactSectionGooey";
import { HeroSection } from "@/components/sections/Hero/HeroSection";
import { WorkSection } from "@/components/sections/Work/WorkSection";

export default function Home() {
  const personSchema = {
    "@context": "https://schema.org",
    "@type": "Person",
    name: heroContent.name,
    jobTitle: heroContent.position,
    email: "hello@yansons.online",
    url: "https://yansons.online",
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(personSchema) }}
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
