/** @type {import('next').NextConfig} */
const nextConfig = {
  /**
   * Lets a one-off `next build` write somewhere other than `.next`.
   *
   * Without this, checking that a change compiles while `next dev` is running
   * has the two processes writing the same directory — the build wins, the dev
   * server loses its manifests, and the next request fails with a
   * PageNotFoundError for whichever page it happened to be reading.
   *
   *   NEXT_DIST_DIR=.next-verify npx next build
   *
   * .gitignore already excludes those alternate output directories.
   */
  distDir: process.env.NEXT_DIST_DIR || ".next",
};

export default nextConfig;
