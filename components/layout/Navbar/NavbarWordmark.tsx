import styles from "./Navbar.module.scss";

export function NavbarWordmark({ expanded = false }: { expanded?: boolean }) {
  return (
    <span className={styles.wordmark} data-expanded={expanded} role="img" aria-label="Alexander Yansons">
      <span aria-hidden="true">A</span>
      <span aria-hidden="true" className={styles.hiddenPart}>LEXANDER</span>
      <span aria-hidden="true" className={styles.initialY}>Y</span>
      <span aria-hidden="true" className={styles.hiddenSurname}>ANSONS</span>
      <span aria-hidden="true" className={styles.dot}>.</span>
    </span>
  );
}
