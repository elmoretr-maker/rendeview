import * as React from "react";

function useUpload() {
  const [loading, setLoading] = React.useState(false);
  const upload = React.useCallback(async (input) => {
    try {
      setLoading(true);
      let response;

      if ("reactNativeAsset" in input && input.reactNativeAsset) {
        const asset = input.reactNativeAsset;
        // Build a RN-friendly FormData file part: { uri, name, type }
        const uri = asset.uri || asset?.file?.uri;
        
        if (!uri) {
          throw new Error("Invalid asset: missing uri");
        }

        // Determine if this is a video or image
        const isVideo = 
          (asset.mimeType && asset.mimeType.startsWith("video/")) ||
          (asset.type === "video") ||
          uri.toLowerCase().includes(".mp4") ||
          uri.toLowerCase().includes(".mov");

        // Infer file extension from URI or asset info
        const uriExtension = uri.split(".").pop()?.toLowerCase() || "";
        let extension;
        if (isVideo) {
          extension = (uriExtension === "mp4" || uriExtension === "mov") ? uriExtension : "mp4";
        } else {
          extension = (uriExtension === "jpg" || uriExtension === "jpeg" || uriExtension === "png") ? uriExtension : "jpg";
        }

        // Build proper filename with extension
        const baseName = asset.fileName || asset.name || "upload";
        const resolvedName = baseName.includes(".") ? baseName : `${baseName}.${extension}`;

        // Build proper MIME type - only use asset.type if it contains a slash
        let resolvedMime;
        if (asset.mimeType && asset.mimeType.includes("/")) {
          resolvedMime = asset.mimeType;
        } else if (asset.type && asset.type.includes("/")) {
          resolvedMime = asset.type;
        } else if (isVideo) {
          resolvedMime = "video/mp4";
        } else {
          resolvedMime = "image/jpeg";
        }

        const formData = new FormData();
        formData.append("file", {
          // @ts-ignore React Native FormData file shape
          uri,
          name: resolvedName,
          type: resolvedMime,
        });

        response = await fetch("/_create/api/upload/", {
          method: "POST",
          body: formData,
        });
      } else if ("url" in input) {
        response = await fetch("/_create/api/upload/", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ url: input.url }),
        });
      } else if ("base64" in input) {
        response = await fetch("/_create/api/upload/", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ base64: input.base64 }),
        });
      } else {
        response = await fetch("/_create/api/upload/", {
          method: "POST",
          headers: {
            "Content-Type": "application/octet-stream",
          },
          body: input.buffer,
        });
      }
      if (!response?.ok) {
        if (response && response.status === 413) {
          throw new Error("Upload failed: File too large.");
        }
        throw new Error("Network error");
      }
      const data = await response.json();
      return { url: data.url, mimeType: data.mimeType || null };
    } catch (uploadError) {
      if (uploadError instanceof Error) {
        return { error: uploadError.message };
      }
      if (typeof uploadError === "string") {
        return { error: uploadError };
      }
      return { error: "Upload failed" };
    } finally {
      setLoading(false);
    }
  }, []);

  return [upload, { loading }];
}

export { useUpload };
export default useUpload;
