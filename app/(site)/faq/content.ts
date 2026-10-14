import { contactContent } from "@/content/contact";

/** Visible answers and their structured data share one source. */
export const faqContent = [
  {
    id: "projects",
    question: "What kinds of projects do you take on?",
    answer:
      "I work on marketing sites, portfolios, e-commerce, and product UI — anything where structure, UX, and performance matter. Briefs range from brand-led launches to more technical dashboards and internal tools.",
  },
  {
    id: "contact",
    question: "How should I get in touch for a new project?",
    answer:
      "Email hello@yansons.online with a short note: goals, timeline, budget range if you can share it, and links to references or live products. That context makes the first reply much more useful.",
  },
  {
    id: "location",
    question: "Where are you based, and do you work remotely?",
    answer:
      "I am based in Warsaw, Poland, and collaborate with teams and clients internationally. Most work is remote-first; on-site sessions are possible when the project needs them.",
  },
  {
    id: "collaboration",
    question: "Do you work independently or with a team?",
    answer:
      "I work independently on projects often handled by a studio, bringing in trusted collaborators when the scope calls for it. I am open to freelance, studio, and product collaborations.",
  },
  {
    id: "shopify",
    question: "Can you help with a Shopify store?",
    answer:
      "Yes. Shopify e-commerce, custom themes, and Liquid development are part of my work, alongside custom websites and product interfaces.",
  },
  {
    id: "technology",
    question: "What technologies do you work with?",
    answer:
      "The technology follows the job. Selected projects use Next.js, React, Sanity, GSAP, Framer, and Shopify. Each case study describes the tools used and my role in the project.",
  },
  {
    id: "call",
    question: "Can we talk before starting a project?",
    answer:
      "You can schedule a call using the Cal.com booking control in the footer. For new work, a short email with your goals and project context is also a good place to start.",
  },
  {
    id: "reply",
    question: "When can I expect a reply?",
    answer: contactContent.responseTime,
  },
] as const;
