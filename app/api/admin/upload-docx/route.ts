import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { verifySessionToken } from "@/lib/auth";
import mammoth from "mammoth";
import TurndownService from "turndown";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  const cookieStore = cookies();
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
  if (!file || !file.name.toLowerCase().endsWith(".docx")) {
    return NextResponse.json({ error: "Se requiere un archivo .docx" }, { status: 400 });
  }
  if (file.size > 10 * 1024 * 1024) {
    return NextResponse.json({ error: "El archivo no puede superar 10 MB" }, { status: 400 });
  }

  const buffer = Buffer.from(await file.arrayBuffer());

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
