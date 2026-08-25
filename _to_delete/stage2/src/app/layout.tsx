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
 * Aplica el tema guardado antes de que se pinte el contenido. Sin esto, quien
 * eligió oscuro ve un fogonazo blanco en cada carga.
 *
 * Va como primer hijo de <body>, no dentro de un <head> propio: en App Router
 * el layout raíz no debe renderizar <head> manualmente — React lo reordena y
 * la posición del script deja de estar garantizada, que es justo lo único que
 * importa aquí. Como primer hijo de <body> corre antes de que se pinte nada.
 *
 * El try/catch no es decorativo: localStorage lanza excepción en modo privado
 * y con cookies bloqueadas.
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
      <body className="min-h-dvh bg-background font-sans text-foreground antialiased">
        <script dangerouslySetInnerHTML={{ __html: THEME_SCRIPT }} />
        {children}
      </body>
    </html>
  );
}
