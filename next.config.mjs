/** @type {import('next').NextConfig} */
const nextConfig = {
  turbopack: {
    // Ensure Turbopack uses this folder as the workspace root
    root: "./",
  },
};

export default nextConfig;
