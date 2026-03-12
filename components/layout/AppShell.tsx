import type { ReactNode } from "react";
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
      <div data-app-shell="true" className={styles.shell}>
        <div data-app-chrome="true">
          <Navbar />
        </div>
        <main data-app-main="true" className={styles.main}>
          {children}
        </main>
        <div data-app-chrome="true">
          <Footer />
        </div>
      </div>
    </OverlayProvider>
  );
}
