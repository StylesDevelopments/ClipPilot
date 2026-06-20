/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Produces a self-contained server in .next/standalone for small Docker images.
  output: "standalone",
  // Media files can be large; allow generous request bodies on server actions.
  // Route handlers stream the upload manually, so this mainly future-proofs us.
  experimental: {
    serverActions: {
      bodySizeLimit: "1gb",
    },
  },
};

export default nextConfig;
