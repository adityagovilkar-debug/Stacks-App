import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    // Book covers are fetched from Google Books + Open Library.
    remotePatterns: [
      { protocol: "https", hostname: "books.google.com" },
      { protocol: "http", hostname: "books.google.com" },
      { protocol: "https", hostname: "covers.openlibrary.org" },
    ],
  },
};

export default nextConfig;
