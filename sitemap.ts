import type { MetadataRoute } from "next";

export default function sitemap(): MetadataRoute.Sitemap {
  return [{ url: "https://21project.pl/", lastModified: new Date(), changeFrequency: "monthly", priority: 1 }];
}
