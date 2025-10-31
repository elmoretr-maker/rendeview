import { getAuthenticatedUserId } from "@/app/api/utils/auth";
import { upload } from "@/app/api/utils/upload";

export async function POST(request) {
  try {
    const userId = await getAuthenticatedUserId();
    if (!userId) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { "Content-Type": "application/json" },
      });
    }

    const contentType = request.headers.get("Content-Type");
    let uploadParams = {};

    if (contentType === "application/octet-stream") {
      const buffer = await request.arrayBuffer();
      uploadParams = { buffer: Buffer.from(buffer) };
    } else {
      const body = await request.json();
      const { base64, url } = body;

      if (!base64 && !url) {
        return new Response(JSON.stringify({ error: "Missing base64 or url" }), {
          status: 400,
          headers: { "Content-Type": "application/json" },
        });
      }

      uploadParams = base64 ? { base64 } : { url };
    }

    const result = await upload(uploadParams);
    
    return new Response(JSON.stringify(result), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Error uploading:", error);
    return new Response(JSON.stringify({ error: "Upload failed" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
}
