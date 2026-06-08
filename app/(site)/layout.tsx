import type { ReactNode } from "react";
import { AppShell } from "@/components/layout/AppShell";
import { HomeHeroRevealSessionReset } from "@/components/layout/HomeHeroRevealSessionReset";
import { RevealPolicyController } from "@/components/motion/RevealPolicyController";

export default function SiteLayout({
  children,
}: Readonly<{
  children: ReactNode;
}>) {
  return (
    <AppShell>
      <RevealPolicyController />
      <HomeHeroRevealSessionReset />
      {children}
    </AppShell>
  );
}
