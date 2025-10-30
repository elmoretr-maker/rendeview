// Download route for serving uploaded files
import { getAuthenticatedUserId } from "@/app/api/utils/auth";
import { ObjectStorageService, ObjectNotFoundError } from "../../../../../server/objectStorage";
import { ObjectPermission } from "../../../../../server/objectAcl";

export async function GET(request, { params }) {
  try {
    const userId = await getAuthenticatedUserId();
    
    const objectPath = `/objects/${params.objectPath || ""}`;
    const objectStorageService = new ObjectStorageService();

    const objectFile = await objectStorageService.getObjectEntityFile(objectPath);
    const canAccess = await objectStorageService.canAccessObjectEntity({
      objectFile,
      userId,
      requestedPermission: ObjectPermission.READ,
    });

    if (!canAccess) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { "Content-Type": "application/json" },
      });
    }

    // Download the file
    const [metadata] = await objectFile.getMetadata();
    const stream = objectFile.createReadStream();
    
    return new Response(stream, {
      headers: {
        "Content-Type": metadata.contentType || "application/octet-stream",
        "Cache-Control": "public, max-age=3600",
      },
    });
  } catch (error) {
    console.error("Error downloading object:", error);
    if (error instanceof ObjectNotFoundError) {
      return new Response(JSON.stringify({ error: "Not found" }), {
        status: 404,
        headers: { "Content-Type": "application/json" },
      });
    }
    return new Response(JSON.stringify({ error: "Internal server error" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
}
