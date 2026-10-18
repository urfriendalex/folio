import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ContactSectionGooey } from "@/components/sections/Contact/ContactSectionGooey";
import { contactContent } from "@/content/contact";
import { contactStudies } from "../options";
import styles from "../study.module.scss";

export const dynamicParams = false;
export function generateStaticParams() {
  return contactStudies.map(({ id }) => ({ option: id }));
}
export async function generateMetadata({ params }: { params: Promise<{ option: string }> }): Promise<Metadata> {
  const { option } = await params;
  const study = contactStudies.find(({ id }) => id === option);
  return { title: `Contact ${option}: ${study?.name ?? "Preview"}`, robots: { index: false, follow: false } };
}
export default async function ContactStudy({ params }: { params: Promise<{ option: string }> }) {
  const { option } = await params;
  const study = contactStudies.find(({ id }) => id === option);
  if (!study) notFound();
  return <div className={styles.preview}>
    <ContactSectionGooey content={contactContent} hoverPhrase={contactContent.emailHoverPhrase} layout={study.layout} />
  </div>;
}
