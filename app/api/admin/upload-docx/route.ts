import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { verifySessionToken } from "@/lib/auth";
import mammoth from "mammoth";
import TurndownService from "turndown";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  const cookieStore = await cookies();
  const secret = process.env.ADMIN_SECRET;
  const token = cookieStore.get("admin_auth")?.value;
  if (!secret || !token || !(await verifySessionToken(token, secret))) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

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

  const result = await mammoth.convertToHtml(
    { buffer },
    {
      convertImage: mammoth.images.imgElement((image) =>
        image.read("base64").then((data) => ({
          src: `data:${image.contentType};base64,${data}`,
        }))
      ),
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

  const markdown = td.turndown(result.value);
  const titulo = file.name.replace(/\.docx$/i, "").replace(/[-_]/g, " ");

  return NextResponse.json({ contenido: markdown, titulo });
}
