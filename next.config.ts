import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  experimental: {
    serverActions: {
      // Los documentos se suben como multipart a una API route, pero dejamos
      // margen por si en el futuro se usan Server Actions para la subida.
      bodySizeLimit: "10mb",
    },
  },
};

export default nextConfig;
