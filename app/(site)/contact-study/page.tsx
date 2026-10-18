import type { Metadata } from "next";
import Link from "next/link";
import { contactStudies } from "./options";
import styles from "./study.module.scss";

export const metadata: Metadata = { title: "Contact directions", robots: { index: false, follow: false } };
export default function ContactStudies() {
  return <section className={styles.index}>
    <h1>Contact directions</h1>
    <p>Four mobile layouts with the same gooey banner, desktop design, and shared footer.</p>
    <ol className={styles.options}>
      {contactStudies.map(({ id, name, description }) => <li key={id}>
        <Link href={`/contact-study/${id}`}><span className={styles.number}>{id}</span><div><h2>{name}</h2><p>{description}</p></div><span aria-hidden>↗</span></Link>
      </li>)}
    </ol>
  </section>;
}
