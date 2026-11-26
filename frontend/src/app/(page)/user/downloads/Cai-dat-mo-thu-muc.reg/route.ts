import { NETWORK_FOLDER } from "@/config/networkFolder";
import { createNetworkFolderRegistry } from "@/lib/networkFolderRegistry";

export const runtime = "nodejs";

export function GET() {
  return new Response(createNetworkFolderRegistry(NETWORK_FOLDER.path), {
    headers: {
      "Content-Type": "application/octet-stream",
      "Content-Disposition": `attachment; filename="${NETWORK_FOLDER.setupFilename}"`,
      "Cache-Control": "no-store",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
