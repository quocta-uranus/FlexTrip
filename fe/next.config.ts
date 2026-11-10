import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // A separate output folder lets a production build be checked without touching the running dev server's .next.
  distDir: process.env.NEXT_DIST_DIR || ".next",
};

export default nextConfig;
