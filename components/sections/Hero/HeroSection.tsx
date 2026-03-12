import { RevealChars } from "@/components/motion/RevealChars/RevealChars";
import { RevealLines } from "@/components/motion/RevealLines/RevealLines";
import styles from "./HeroSection.module.scss";

type HeroContent = {
  monogram: string;
  name: string;
  position: string;
  ctas: {
    work: string;
    contact: string;
  };
};

type HeroSectionProps = {
  content: HeroContent;
};

export function HeroSection({ content }: HeroSectionProps) {
  return (
    <section className={styles.section}>
      <div className={styles.inner}>
        <div className={styles.content}>
          <span className="section-label">Hero</span>
          <RevealChars as="p" className={styles.monogram} text={content.monogram} />
          <RevealLines
            as="h1"
            className={styles.heading}
            text={`${content.name}\n${content.position}`}
          />
          <div className={styles.actions}>
            <a href="#work" className="pill-button">
              {content.ctas.work}
            </a>
            <a href="#contact" className="pill-button">
              {content.ctas.contact}
            </a>
          </div>
        </div>
      </div>
    </section>
  );
}
