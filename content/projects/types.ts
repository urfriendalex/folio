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

export type ProjectThumbnailVariant = {
  poster: string;
  video?: string;
  width: number;
  height: number;
};

export type ProjectMediaAsset = {
  src: string;
  poster?: string;
  width: number;
  height: number;
};

export type ProjectThumbnail = {
  desktop: ProjectThumbnailVariant;
  mobile?: ProjectThumbnailVariant;
};

export type ProjectMediaSlot = {
  kind: "image" | "video";
  desktop: ProjectMediaAsset;
  mobile?: ProjectMediaAsset;
  alt?: string;
  loop?: boolean;
  /** Lower sorts first. Prefer `projectMediaOrderIndexBySlug` in `project-media-order.ts` so order survives `pnpm generate:project-media`. */
  orderIndex?: number;
};

export type ProjectEntry = {
  slug: string;
  /** Lower sorts first; change only this to reorder listings and prev/next navigation. */
  orderIndex: number;
  title: string;
  descriptor: string;
  year: string;
  role: string;
  technologies: string[];
  description: string;
  thumbnail: ProjectThumbnail;
  media: ProjectMediaSlot[];
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
};
