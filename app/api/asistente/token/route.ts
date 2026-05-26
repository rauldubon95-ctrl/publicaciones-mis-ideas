import { createHmac } from "crypto";
import { isAdminAuthorized } from "@/lib/adminAuth";

export async function GET() {
  const secret = process.env.ADMIN_SECRET;
  if (!secret || !(await isAdminAuthorized())) {
    return Response.json({ token: null });
  }

  const token = createHmac("sha256", secret).update("premium-bypass-v1").digest("hex");
  return Response.json({ token });
}
