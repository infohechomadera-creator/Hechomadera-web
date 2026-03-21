import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* Hechomadera: sitio en español (Colombia), imágenes remotas cuando las conectemos */
  images: {
    remotePatterns: [{ protocol: "https", hostname: "**" }],
  },
};

export default nextConfig;
