import type { ReactNode } from "react";
import { SmoothScrollProvider } from "@/components/Scroll/SmoothScrollProvider";
import { Footer } from "@/components/layout/Footer/Footer";
import { Navbar } from "@/components/layout/Navbar/Navbar";
import { OverlayProvider } from "@/components/ui/Overlay/OverlayProvider";
import styles from "./AppShell.module.scss";

type AppShellProps = {
  children: ReactNode;
};

export function AppShell({ children }: AppShellProps) {
  return (
    <OverlayProvider>
      <SmoothScrollProvider>
        <div data-app-shell="true" className={styles.shell}>
          <div data-app-chrome="true" data-app-navbar="true" className={styles.navbar}>
            <Navbar />
          </div>
          <main data-app-main="true" className={styles.main}>
            {children}
          </main>
          <div
            id="footer-wordmark-underlay"
            data-footer-wordmark-underlay="true"
            className={styles.footerWordmarkUnderlay}
            aria-hidden
          />
          <div
            id="toolbar-ascii-portal"
            data-app-chrome="true"
            data-toolbar-ascii-portal="true"
            className={styles.toolbarAsciiBackdrop}
            aria-hidden
          />
          <div data-app-chrome="true" data-app-footer="true" className={styles.footerChrome}>
            <Footer />
          </div>
        </div>
      </SmoothScrollProvider>
    </OverlayProvider>
  );
}
