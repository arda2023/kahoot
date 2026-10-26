import type { NextConfig } from "next";
const config: NextConfig = {
  transpilePackages: ["@quiz/ui", "@quiz/contracts"],
};
export default config;
