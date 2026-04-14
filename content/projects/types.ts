export type ProjectClient = {
  name: string;
  type?: string;
  industry?: string;
};

export type ProjectCollaboration = {
  team: string;
  withClient?: boolean;
  details?: string;
};

export type ProjectStack = {
  platform: string[];
  frontend?: string[];
  notes?: string;
};

export type ProjectImpact = {
  summary: string;
  highlights: string[];
};

export type ProjectLink = {
  label: string;
  url: string;
};

export type ProjectEntry = {
  slug: string;
  title: string;
  descriptor: string;
  year: string;
  role: string;
  technologies: string[];
  description: string;
  optionalLink?: string;
  thumbnail: string;
  stills: string[];
  shortDescription?: string;
  overview?: string;
  roleSummary?: string;
  responsibilities?: string[];
  client?: ProjectClient;
  collaboration?: ProjectCollaboration;
  stack?: ProjectStack;
  features?: string[];
  impact?: ProjectImpact;
  tags?: string[];
  links?: ProjectLink[];
  status?: string;
  featured?: boolean;
};
