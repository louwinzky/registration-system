import type { NextConfig } from "next";

const config: NextConfig = {
  output: "standalone", // smaller Docker image
  serverExternalPackages: ["pdfkit", "bcryptjs"],
};

export default config;
