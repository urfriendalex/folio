import type { MetadataRoute } from "next";
import { SITE_URL } from "@/lib/site";

/**
 * Search and answer-engine crawlers are named explicitly so the policy is deliberate:
 * search/citation bots (OAI-SearchBot, Claude-SearchBot, PerplexityBot) decide whether the
 * site can be cited in AI answers; training bots (GPTBot, ClaudeBot, Google-Extended,
 * Applebot-Extended) are allowed by choice.
 */
const AI_AGENTS = [
  "OAI-SearchBot",
  "ChatGPT-User",
  "GPTBot",
  "Claude-SearchBot",
  "Claude-User",
  "ClaudeBot",
  "PerplexityBot",
  "Perplexity-User",
  "Google-Extended",
  "Applebot",
  "Applebot-Extended",
  "Bingbot",
  "DuckAssistBot",
  "MistralAI-User",
];

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      { userAgent: "*", allow: "/", disallow: "/api/" },
      { userAgent: AI_AGENTS, allow: "/", disallow: "/api/" },
    ],
    sitemap: `${SITE_URL}/sitemap.xml`,
  };
}
