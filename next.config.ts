import type { NextConfig } from "next";

/**
 * pdfmake (Node), @foliojs-fork/pdfkit and fontkit read real files using fs.
 * If Turbopack bundles these packages, their __dirname can become C:\ROOT
 * on Windows and fontkit cannot find its data.trie resource.
 *
 * Keep them native Node dependencies for server routes. Also trace the asset
 * into Vercel's deployment for the export route.
 */
const nextConfig: NextConfig = {
  reactStrictMode: true,
  serverExternalPackages: [
    "pdfmake",
    "@foliojs-fork/pdfkit",
    "@foliojs-fork/fontkit",
  ],
  outputFileTracingIncludes: {
    "/api/cases/*/export": [
      "./node_modules/@foliojs-fork/fontkit/data.trie",
      "./node_modules/pdfmake/build/vfs_fonts.js",
    ],
  },
};

export default nextConfig;
