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
  /** 4×4 PNG data URI of the poster (`media-tones.ts`), stretched under the loading grid. */
  tone?: string;
};

export type ProjectMediaAsset = {
  src: string;
  poster?: string;
  width: number;
  height: number;
  /** 4×4 PNG data URI of the image/poster (`media-tones.ts`), stretched under the loading grid. */
  tone?: string;
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

export type ProjectCategory = "ecommerce" | "portfolio" | "product" | "event";

export type ProjectEntry = {
  slug: string;
  /** Lower sorts first; change only this to reorder listings and prev/next navigation. */
  orderIndex: number;
  title: string;
  /** Concise category shown beside the title in project cards. */
  cardDescriptor: string;
  /** What a hiring visitor is looking for — drives the Work index filter. */
  category: ProjectCategory;
  /** Fuller project summary shown on the project page. */
  descriptor: string;
  year: string;
  /** Date of the last substantive case-study update, in YYYY-MM-DD format. */
  lastModified: string;
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
