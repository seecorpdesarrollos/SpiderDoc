import { notFound } from "next/navigation";
import { Bench } from "./bench";

export const dynamic = "force-dynamic";

export default function ProbarPage() {
  // Misma bandera que la API: si no está activada, esta página no existe.
  if (process.env.PROBAR_OCR !== "1") notFound();
  return <Bench />;
}
