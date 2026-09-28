import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Every route is prerendered (generateStaticParams covers /product and
  // /article), so the site ships as plain files to S3 + CloudFront — see infra/.
  output: "export",
  // The default next/image loader needs a Node server. The photos in
  // public/img are already sized by scripts/fetch-images.mjs, so serve them as-is.
  images: { unoptimized: true },
};

export default nextConfig;
