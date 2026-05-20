import { NextResponse } from "next/server";
import { isAdminAuthorized, unauthorizedResponse } from "@/lib/adminAuth";
import { getSupabaseAdmin } from "@/lib/supabase-admin";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

// Aplica las políticas de Storage en Supabase una sola vez.
// Solo accesible para el admin autenticado.
export async function POST() {
  if (!(await isAdminAuthorized())) return unauthorizedResponse();

  const sb = getSupabaseAdmin();
  const resultados: Record<string, string> = {};

  // 1. Verificar que el bucket existe
  const { data: buckets, error: errBuckets } = await sb.storage.listBuckets();
  if (errBuckets) {
    return NextResponse.json({ error: "No se pudo conectar con Supabase Storage: " + errBuckets.message }, { status: 500 });
  }

  const existe = buckets?.some((b) => b.id === "comics");
  if (!existe) {
    // Crear el bucket si no existe
    const { error: errCrear } = await sb.storage.createBucket("comics", { public: true });
    resultados.bucket = errCrear ? `Error al crear: ${errCrear.message}` : "Bucket creado";
  } else {
    resultados.bucket = "Bucket ya existe";
  }

  // 2. Subir una imagen de prueba diminuta para verificar permisos
  const pixelPng = Buffer.from(
    "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==",
    "base64"
  );
  const { error: errTest } = await sb.storage
    .from("comics")
    .upload(`_test_${Date.now()}.png`, pixelPng, { contentType: "image/png", upsert: true });

  if (errTest) {
    resultados.uploadTest = `Fallo: ${errTest.message}`;
    return NextResponse.json({
      ok: false,
      resultados,
      mensaje: "El bucket existe pero no se puede subir. Necesitas añadir políticas manualmente.",
    });
  }

  // Limpiar imagen de prueba
  await sb.storage.from("comics").remove([`_test_${Date.now()}.png`]).catch(() => {});
  resultados.uploadTest = "OK — permisos correctos";

  return NextResponse.json({ ok: true, resultados });
}
