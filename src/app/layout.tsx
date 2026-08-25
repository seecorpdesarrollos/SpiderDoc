import type { Metadata, Viewport } from "next";
import { cookies } from "next/headers";

import "./globals.css";
import { THEME_COOKIE, parseTheme } from "@/lib/theme";
import { Footer } from "@/components/Footer";
import { RegistrarSW } from "@/components/RegistrarSW";

const inter = { variable: "--font-inter" };

const manrope = { variable: "--font-manrope" };

const sourceCodePro = { variable: "--font-source-code-pro" };

export const metadata: Metadata = {
  title: "Spiderjad Docs — Control de caducidades",
  description:
    "Subí una foto de tu DNI, pasaporte o carnet y te avisamos antes de que caduque.",
  applicationName: "Spiderjad Docs",
  manifest: "/manifest.webmanifest",
  appleWebApp: {
    capable: true,
    title: "Spiderjad Docs",
    statusBarStyle: "black-translucent",
  },
  // iOS ignora los iconos del manifest y busca este. Sin él, al añadir la app
  // a la pantalla de inicio en un iPhone sale una captura de la página en vez
  // del icono.
  icons: {
    icon: [
      { url: "/icon.svg", type: "image/svg+xml" },
      { url: "/icon-192.png", sizes: "192x192", type: "image/png" },
    ],
    apple: "/apple-touch-icon.png",
  },
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#fdfdfd" },
    { media: "(prefers-color-scheme: dark)", color: "#151816" },
  ],
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
};

export default async function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  // El tema sale del servidor, ya resuelto. Ver src/lib/theme.ts para el
  // porqué de la cookie en vez de un script inline con localStorage.
  const theme = parseTheme((await cookies()).get(THEME_COOKIE)?.value);

  return (
    <html
      lang="es"
      data-theme={theme}
      className={`${inter.variable} ${manrope.variable} ${sourceCodePro.variable}`}
      suppressHydrationWarning
    >
      <body className="flex min-h-dvh flex-col bg-background font-sans text-foreground antialiased">
        <div className="flex flex-1 flex-col">{children}</div>
        <Footer />
        <RegistrarSW />
      </body>
    </html>
  );
}
