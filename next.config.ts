import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  webpack: (config) => {
    config.resolve.alias = {
      ...config.resolve.alias,
      "convex/_generated": `${__dirname}/convex/_generated`,
    };
    return config;
  },
};

export default nextConfig;
