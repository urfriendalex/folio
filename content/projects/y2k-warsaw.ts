import type { ProjectEntry } from "./types";
import { generatedProjectMedia } from "./generated-media";

export const y2kWarsawProject: ProjectEntry = {
  slug: "y2k-warsaw",
  orderIndex: 0,
  title: "Y2K WARSAW",
  cardDescriptor: "VINTAGE STORE",
  categories: ["ecommerce"],
  descriptor: "Shopify storefront for a Warsaw vintage shop",
  year: "2026",
  lastModified: "2026-10-27",
  role: "Design + Development",
  technologies: ["Shopify"],
  shortDescription:
    "Shopify storefront for Y2K WARSAW, a vintage shop at Hoża 54 in Warsaw, with new arrivals, product pages, and a cart priced in PLN.",
  description:
    "A Shopify storefront for Y2K WARSAW, the vintage shop at Hoża 54 in Warsaw. The site opens on new arrivals, then brand, menswear, and womenswear collections, product pages, and cart.",
  overview:
    "The homepage leads with the wordmark and VINTAGE STORE, then new arrivals marked Curated in Warsaw, and the line You are welcome offline with the shop address. Product pages show the price in PLN, brand, condition, size on the label, and measurements. The storefront is in English and Polish, with a country selector across European markets. A condition guide grades pieces from new with tags to good, and the rentals page describes in-person rentals for stylists, photographers, and productions.",
  roleSummary: "Solo design and development of the Shopify storefront.",
  responsibilities: [
    "Storefront design",
    "Shopify build",
    "Homepage, collection, product, and cart",
    "Vintage condition guide and rental information",
    "English and Polish, with prices in PLN",
  ],
  client: {
    name: "Y2K WARSAW",
    type: "Vintage store",
    industry: "Fashion",
  },
  collaboration: {
    team: "Solo",
    details: "Designed and built the storefront alone.",
  },
  stack: {
    platform: ["Shopify"],
    notes:
      "Shopify storefront. The live site shows prices in PLN, an English and Polish language choice, and a European country selector.",
  },
  features: [
    "New arrivals, menswear, womenswear, and brand collections",
    "Product pages with condition, size, and measurements",
    "Cart and checkout",
    "English and Polish, with a European country selector",
    "Vintage condition guide",
    "In-person rental terms for stylists and productions",
    "Shop address at Hoża 54, Warsaw",
    "Newsletter signup",
  ],
  tags: ["Shopify", "E-commerce", "Vintage", "Fashion"],
  links: [{ label: "Live Site", url: "https://y2kwarsaw.com" }],
  ...generatedProjectMedia["y2k-warsaw"],
};
