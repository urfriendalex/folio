import type { ContactLayout } from "@/components/sections/Contact/ContactSectionGooey";

export const contactStudies: { id: string; layout: ContactLayout; name: string; description: string }[] = [
  { id: "1", layout: "type", name: "Desktop translation", description: "An open email banner above a full-width call button and quiet secondary links." },
  { id: "2", layout: "bento", name: "Fuller bento", description: "A framed email panel with one wide call button and two smaller action panels." },
  { id: "3", layout: "rows", name: "Stacked action rows", description: "The desktop action menu arranged as three full-width rows." },
  { id: "4", layout: "asymmetric", name: "Asymmetric actions", description: "A tall booking panel alongside two smaller actions with irregular ASCII underlines." },
];
