export const heroOptions = [
  { id: 1, name: "Quiet statement", description: "A restrained headline with a large walker and generous space." },
  { id: 2, name: "Larger headline", description: "The selected homepage hero: stronger typography and a large ASCII figure aligned beneath Archive." },
  { id: 3, name: "More asymmetry", description: "Quieter, lower copy opposite an even larger walker." },
  { id: 4, name: "Profile details", description: "A compact introduction with separate focus and location details." },
] as const;

export function isHeroOption(value: string) { return ["1", "2", "3", "4"].includes(value); }
