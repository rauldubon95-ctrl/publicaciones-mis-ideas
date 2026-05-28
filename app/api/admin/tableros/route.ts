import { NextRequest, NextResponse } from "next/server";
import { isAdminAuthorized } from "@/lib/adminAuth";
import { prisma } from "@/lib/prisma";
import { getSupabaseAdmin } from "@/lib/supabase-admin";
import * as XLSX from "xlsx";

const BUCKET_DATOS = "datos";

function slugify(texto: string): string {
  return texto
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9\s-]/g, "")
    .trim()
    .replace(/\s+/g, "-")
    .slice(0, 60);
}

function unicoSlug(base: string): string {
  return `${base}-${Date.now().toString(36)}`;
}

export async function GET() {
  if (!(await isAdminAuthorized())) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }
  const tableros = await prisma.tablero.findMany({
    orderBy: [{ orden: "asc" }, { creadoAt: "desc" }],
    select: {
      id: true, titulo: true, slug: true, descripcion: true,
      categoria: true, archivoNombre: true, publicado: true,
      orden: true, creadoAt: true,
    },
  });
  return NextResponse.json(tableros);
}

export async function POST(req: NextRequest) {
  if (!(await isAdminAuthorized())) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const form = await req.formData();
  const archivo = form.get("archivo") as File | null;
  const titulo = (form.get("titulo") as string | null)?.trim() ?? "";
  const descripcion = (form.get("descripcion") as string | null)?.trim() ?? "";
  const categoria = (form.get("categoria") as string | null)?.trim() ?? "";

  if (!archivo || !titulo) {
    return NextResponse.json({ error: "Faltan campos obligatorios (titulo, archivo)" }, { status: 400 });
  }

  const ext = archivo.name.split(".").pop()?.toLowerCase();
  if (!["xlsx", "xls"].includes(ext ?? "")) {
    return NextResponse.json({ error: "Solo se aceptan archivos .xlsx o .xls" }, { status: 400 });
  }
  if (archivo.size > 10 * 1024 * 1024) {
    return NextResponse.json({ error: "El archivo no puede superar 10 MB" }, { status: 400 });
  }

  // Parsear el Excel
  const buffer = Buffer.from(await archivo.arrayBuffer());
  let preview: { sheetName: string; headers: string[]; rows: (string | number | boolean | null)[][]; totalRows: number };
  try {
    const wb = XLSX.read(buffer, { type: "buffer", cellDates: true });
    const sheetName = wb.SheetNames[0];
    const ws = wb.Sheets[sheetName];
    const rawData = XLSX.utils.sheet_to_json<(string | number | boolean | null)[]>(ws, { header: 1, defval: null });

    const headers = (rawData[0] ?? []).map((h) => String(h ?? ""));
    const rows = rawData.slice(1).filter((r) => r.some((c) => c !== null && c !== ""));
    const totalRows = rows.length;

    preview = { sheetName, headers, rows: rows.slice(0, 500), totalRows };
  } catch {
    return NextResponse.json({ error: "No se pudo leer el archivo Excel" }, { status: 400 });
  }

  // Subir a Supabase Storage
  const sb = getSupabaseAdmin();
  const nombreLimpio = `${Date.now()}-${archivo.name.replace(/[^a-zA-Z0-9.\-_]/g, "_")}`;
  const { error: uploadError } = await sb.storage
    .from(BUCKET_DATOS)
    .upload(nombreLimpio, buffer, { contentType: archivo.type || "application/octet-stream", upsert: false });

  if (uploadError) {
    return NextResponse.json({ error: `Error al subir archivo: ${uploadError.message}` }, { status: 500 });
  }

  const { data: urlData } = sb.storage.from(BUCKET_DATOS).getPublicUrl(nombreLimpio);

  // Crear registro en DB
  const slug = unicoSlug(slugify(titulo) || "tablero");
  const tablero = await prisma.tablero.create({
    data: {
      titulo,
      slug,
      descripcion: descripcion || null,
      categoria: categoria || null,
      archivoUrl: urlData.publicUrl,
      archivoNombre: archivo.name,
      preview: JSON.stringify(preview),
      publicado: false,
    },
  });

  return NextResponse.json(tablero, { status: 201 });
}
