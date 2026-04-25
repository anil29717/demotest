import type { MetadataRoute } from "next";

const base = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";

export default function sitemap(): MetadataRoute.Sitemap {
  const paths = ["", "/blog", "/institutional", "/login"];
  return paths.map((p) => ({
    url: `${base.replace(/\/+$/, "")}${p === "" ? "/" : p}`,
    lastModified: new Date(),
  }));
}
