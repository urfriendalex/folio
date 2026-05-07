import type { ReactNode } from "react";
import { AppShell } from "@/components/layout/AppShell";
import { HomeHeroRevealSessionReset } from "@/components/layout/HomeHeroRevealSessionReset";

export default function SiteLayout({
  children,
}: Readonly<{
  children: ReactNode;
}>) {
  return (
    <AppShell>
      <HomeHeroRevealSessionReset />
      {children}
    </AppShell>
  );
}
