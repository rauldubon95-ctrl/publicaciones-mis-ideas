import { NextRequest, NextResponse } from "next/server";
import { isAdminAuthorized, unauthorizedResponse } from "@/lib/adminAuth";
import mammoth from "mammoth";
import TurndownService from "turndown";
import {
  detectarTipoImagen,
  subirImagenArticulo,
  MAX_BYTES_IMAGEN,
  MAX_IMAGENES_DOCX,
} from "@/lib/imagenesArticulo";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  if (!(await isAdminAuthorized())) return unauthorizedResponse();

  let formData: FormData;
  try {
    formData = await req.formData();
  } catch {
    return NextResponse.json({ error: "Solicitud inválida" }, { status: 400 });
  }

  const file = formData.get("archivo") as File | null;
  const isDocx = file?.name.toLowerCase().endsWith(".docx");
  const isMd = file?.name.toLowerCase().endsWith(".md");

  if (!file || (!isDocx && !isMd)) {
    return NextResponse.json({ error: "Se requiere un archivo .docx o .md" }, { status: 400 });
  }
  if (file.size > 10 * 1024 * 1024) {
    return NextResponse.json({ error: "El archivo no puede superar 10 MB" }, { status: 400 });
  }

  // Archivos Markdown: leer directamente como texto
  if (isMd) {
    const markdown = await file.text();
    const titulo = file.name.replace(/\.md$/i, "").replace(/[-_]/g, " ");
    return NextResponse.json({ contenido: markdown, titulo });
  }

  // Archivos Word: verificar magic bytes (DOCX = ZIP = PK\x03\x04) antes de procesar
  const rawBuffer = await file.arrayBuffer();
  const magic = new Uint8Array(rawBuffer, 0, 4);
  if (magic[0] !== 0x50 || magic[1] !== 0x4B || magic[2] !== 0x03 || magic[3] !== 0x04) {
    return NextResponse.json({ error: "Archivo inválido — no es un .docx real" }, { status: 400 });
  }
  const buffer = Buffer.from(rawBuffer);

  // Imágenes del Word: se validan por magic bytes y se suben a Storage; en el
  // Markdown queda solo la URL pública (no base64 gigante en la DB). Formatos no
  // mostrables (EMF/WMF/SVG) o demasiado grandes se omiten con aviso.
  const avisos: string[] = [];
  let contadorImagenes = 0;

  const result = await mammoth.convertToHtml(
    { buffer },
    {
      convertImage: mammoth.images.imgElement(async (image) => {
        contadorImagenes++;
        const n = contadorImagenes;
        if (n > MAX_IMAGENES_DOCX) {
          avisos.push(`Imagen ${n} omitida: máximo ${MAX_IMAGENES_DOCX} imágenes por documento.`);
          return { src: "" };
        }
        const img = Buffer.from(await image.read("base64"), "base64");
        const tipo = detectarTipoImagen(img);
        if (!tipo) {
          avisos.push(`Imagen ${n} omitida: formato no compatible con navegadores (${image.contentType}). Guárdala como PNG o JPG en el Word.`);
          return { src: "" };
        }
        if (img.length > MAX_BYTES_IMAGEN) {
          avisos.push(`Imagen ${n} omitida: pesa más de 5 MB.`);
          return { src: "" };
        }
        try {
          return { src: await subirImagenArticulo(img, tipo) };
        } catch (e) {
          console.error("[upload-docx] fallo al subir imagen:", e);
          avisos.push(`Imagen ${n} no se pudo subir al almacenamiento; quedó incrustada en el texto.`);
          return { src: `data:${tipo};base64,${img.toString("base64")}` };
        }
      }),
    }
  );

  const td = new TurndownService({ headingStyle: "atx", bulletListMarker: "-", codeBlockStyle: "fenced" });

  // Preserve tables as GFM Markdown
  td.addRule("table", {
    filter: "table",
    replacement(_content, node) {
      const rows = Array.from((node as HTMLElement).querySelectorAll("tr"));
      if (!rows.length) return "";
      const toRow = (tr: Element) =>
        "| " +
        Array.from(tr.querySelectorAll("th, td"))
          .map((cell) => cell.textContent?.trim().replace(/\|/g, "\\|") ?? "")
          .join(" | ") +
        " |";
      const header = toRow(rows[0]);
      const separator = "| " + Array.from(rows[0].querySelectorAll("th, td")).map(() => "---").join(" | ") + " |";
      const body = rows.slice(1).map(toRow).join("\n");
      return "\n\n" + header + "\n" + separator + (body ? "\n" + body : "") + "\n\n";
    },
  });

  // Las imágenes omitidas quedan como <img src=""> → no dejar ![]() vacíos.
  const markdown = td.turndown(result.value).replace(/!\[[^\]]*\]\(\)/g, "");
  const titulo = file.name.replace(/\.docx$/i, "").replace(/[-_]/g, " ");

  return NextResponse.json({ contenido: markdown, titulo, avisos });
}
