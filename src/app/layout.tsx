import type { Metadata, Viewport } from "next";
import { cookies } from "next/headers";
import { Inter, Manrope, Source_Code_Pro } from "next/font/google";
import "./globals.css";
import { THEME_COOKIE, parseTheme } from "@/lib/theme";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

const manrope = Manrope({
  subsets: ["latin"],
  variable: "--font-manrope",
  display: "swap",
});

const sourceCodePro = Source_Code_Pro({
  subsets: ["latin"],
  variable: "--font-source-code-pro",
  display: "swap",
});

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
      <body className="min-h-dvh bg-background font-sans text-foreground antialiased">
        {children}
      </body>
    </html>
  );
}
