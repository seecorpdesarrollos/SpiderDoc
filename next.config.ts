import type { NextConfig } from "next";

/**
 * Orígenes desde los que se permite entrar al dev server además de localhost.
 *
 * Desde Next 15.3 el servidor de desarrollo bloquea las peticiones a sus
 * recursos internos (CSS, chunks, HMR) cuando llegan desde un origen distinto
 * de localhost. Sin esto, abrir la app por la IP de la red — el móvil, otro
 * ordenador — sirve el HTML pero no los estilos ni el JS, y parece que nada
 * de lo que cambiás llega. Vaciar la caché no ayuda porque los archivos ni
 * siquiera se descargan.
 *
 * Poné tu IP en el .env:  DEV_ORIGIN=192.168.1.50
 * (varias separadas por coma si probás desde más de una red)
 */
const devOrigins = (process.env.DEV_ORIGIN ?? "")
  .split(",")
  .map((o) => o.trim())
  .filter(Boolean);

const nextConfig: NextConfig = {
  reactStrictMode: true,
  ...(devOrigins.length > 0 ? { allowedDevOrigins: devOrigins } : {}),
  experimental: {
    serverActions: {
      // Los documentos se suben como multipart a una API route, pero dejamos
      // margen por si en el futuro se usan Server Actions para la subida.
      bodySizeLimit: "10mb",
    },
  },
};

export default nextConfig;
