import { ObjectStorageService } from '../../../../server/objectStorage.js';

async function upload({
  url,
  buffer,
  base64
}) {
  // Get presigned upload URL directly from ObjectStorageService
  const objectStorageService = new ObjectStorageService();
  const uploadURL = await objectStorageService.getObjectEntityUploadURL();
  
  // Prepare the file data
  let fileData;
  let contentType = "application/octet-stream";
  
  if (buffer) {
    fileData = buffer;
  } else if (base64) {
    // Convert base64 to buffer
    // Remove data URI prefix if present (e.g., "data:image/png;base64,")
    const base64Data = base64.includes(',') ? base64.split(',')[1] : base64;
    fileData = Buffer.from(base64Data, 'base64');
    
    // Try to detect content type from base64 prefix
    if (base64.startsWith('data:')) {
      const match = base64.match(/data:([^;]+);/);
      if (match) contentType = match[1];
    }
  } else if (url) {
    // Download from URL first
    const downloadResponse = await fetch(url);
    if (!downloadResponse.ok) {
      throw new Error(`Failed to download from URL: ${downloadResponse.status}`);
    }
    fileData = Buffer.from(await downloadResponse.arrayBuffer());
    contentType = downloadResponse.headers.get('content-type') || contentType;
  } else {
    throw new Error("No upload source provided");
  }
  
  // Upload to presigned URL
  const uploadResponse = await fetch(uploadURL, {
    method: "PUT",
    headers: {
      "Content-Type": contentType
    },
    body: fileData
  });
  
  if (!uploadResponse.ok) {
    const text = await uploadResponse.text();
    console.error(`Upload failed (${uploadResponse.status}):`, text);
    throw new Error(`Upload failed: ${uploadResponse.status}`);
  }
  
  // Extract the object URL (remove query parameters from presigned URL)
  const objectUrl = new URL(uploadURL);
  const finalUrl = `${objectUrl.origin}${objectUrl.pathname}`;
  
  return {
    url: finalUrl,
    mimeType: contentType
  };
}
export { upload };
export default upload;