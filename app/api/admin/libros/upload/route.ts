import { NextRequest, NextResponse } from "next/server";
import { isAdminAuthorized, unauthorizedResponse } from "@/lib/adminAuth";
import { subirArchivoLibro } from "@/lib/supabase-admin";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const MAX_PDF = 50 * 1024 * 1024; // 50 MB
const MAX_IMG =  5 * 1024 * 1024; //  5 MB

export async function POST(req: NextRequest) {
  if (!(await isAdminAuthorized())) return unauthorizedResponse();

  const form = await req.formData().catch(() => null);
  if (!form) return NextResponse.json({ error: "Formato inválido" }, { status: 400 });

  const tipo    = form.get("tipo") as string | null;   // "pdf" | "portada"
  const archivo = form.get("archivo") as File | null;

  if (!tipo || !archivo)
    return NextResponse.json({ error: "Faltan campos: tipo, archivo" }, { status: 400 });

  if (tipo === "pdf") {
    if (!archivo.type.includes("pdf"))
      return NextResponse.json({ error: "El archivo debe ser un PDF" }, { status: 422 });
    if (archivo.size > MAX_PDF)
      return NextResponse.json({ error: "El PDF no puede superar 50 MB" }, { status: 413 });
  } else if (tipo === "portada") {
    if (!archivo.type.startsWith("image/"))
      return NextResponse.json({ error: "La portada debe ser una imagen (JPG, PNG, WebP)" }, { status: 422 });
    if (archivo.size > MAX_IMG)
      return NextResponse.json({ error: "La imagen no puede superar 5 MB" }, { status: 413 });
  } else {
    return NextResponse.json({ error: "tipo inválido — usa 'pdf' o 'portada'" }, { status: 400 });
  }

  const buffer  = Buffer.from(await archivo.arrayBuffer());
  const carpeta = tipo === "pdf" ? "pdfs" : "portadas";

  try {
    const url = await subirArchivoLibro(buffer, archivo.name, archivo.type, carpeta);
    return NextResponse.json({ url });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
