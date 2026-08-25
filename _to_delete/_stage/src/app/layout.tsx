import type { Metadata, Viewport } from "next";
import { Inter, Manrope, Source_Code_Pro } from "next/font/google";
import "./globals.css";

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

/**
 * Se ejecuta antes del primer pintado para aplicar el tema guardado. Sin esto
 * el usuario que eligió oscuro ve un fogonazo blanco en cada carga.
 * Va en try/catch porque localStorage tira excepción en algunos contextos
 * (modo privado, cookies bloqueadas) y no queremos romper la página por eso.
 */
const THEME_SCRIPT = `(function(){try{var t=localStorage.getItem('spiderjad-theme');if(t==='dark'||t==='light'){document.documentElement.setAttribute('data-theme',t)}}catch(e){}})()`;

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html
      lang="es"
      className={`${inter.variable} ${manrope.variable} ${sourceCodePro.variable}`}
      suppressHydrationWarning
    >
      <head>
        <script dangerouslySetInnerHTML={{ __html: THEME_SCRIPT }} />
      </head>
      <body className="min-h-dvh bg-background font-sans text-foreground antialiased">
        {children}
      </body>
    </html>
  );
}
