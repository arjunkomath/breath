import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Emits .next/standalone with a self-contained server.js and only the
  // node_modules the trace actually needs — see Dockerfile.
  output: "standalone",
};

export default nextConfig;
