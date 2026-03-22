import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Turbopack options moved out of experimental in Next 15.1+
  turbopack: {
    root: "./",
  },
};

export default nextConfig;
