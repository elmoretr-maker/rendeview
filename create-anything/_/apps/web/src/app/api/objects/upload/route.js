// Upload route for getting presigned URLs for file uploads
import { getAuth } from "@hono/auth-js";
import { ObjectStorageService } from "../../../../../../server/objectStorage";

export async function POST(request, { params }) {
  try {
    const auth = await getAuth(request);
    if (!auth?.user?.id) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { "Content-Type": "application/json" },
      });
    }

    const objectStorageService = new ObjectStorageService();
    const uploadURL = await objectStorageService.getObjectEntityUploadURL();
    
    return new Response(JSON.stringify({ uploadURL }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Error generating upload URL:", error);
    return new Response(JSON.stringify({ error: "Failed to generate upload URL" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
}
