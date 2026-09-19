import type { MetadataRoute } from "next";
import { SITE_URL } from "@/lib/site";

export const dynamic = "force-static";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
       disallow: [
         "/dashboard/",
         "/progress/",
         "/action/",
         "/today/",
         "/goals/",
         "/focus/",
         "/review/",
         "/playbook/",
         "/experiments/",
         "/backup/",
         "/settings/",
         "/study/settings/",
       ],
    },
    sitemap: `${SITE_URL}/sitemap.xml`,
  };
}
