import type { APIRoute } from "astro";

// Generated from the `site` config so the sitemap URL never drifts from the
// configured origin. Allows all crawlers.
export const GET: APIRoute = ({ site }) => {
  const sitemap = new URL("sitemap-index.xml", site).href;
  const body = ["User-agent: *", "Allow: /", "", `Sitemap: ${sitemap}`, ""].join("\n");
  return new Response(body, {
    headers: { "Content-Type": "text/plain; charset=utf-8" },
  });
};
