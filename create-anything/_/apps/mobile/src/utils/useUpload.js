import * as React from "react";

function useUpload() {
  const [loading, setLoading] = React.useState(false);
  const upload = React.useCallback(async (input) => {
    try {
      setLoading(true);
      let response;

      if ("reactNativeAsset" in input && input.reactNativeAsset) {
        const asset = input.reactNativeAsset;
        
        // Use base64 upload for React Native assets (Replit upload service doesn't support RN FormData)
        if (asset.base64) {
          // Photos with base64
          response = await fetch("/_create/api/upload/", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({ base64: asset.base64 }),
          });
        } else if (asset.uri) {
          // Videos or assets without base64 - convert to base64
          const FileSystem = await import('expo-file-system');
          const base64Data = await FileSystem.readAsStringAsync(asset.uri, {
            encoding: FileSystem.EncodingType.Base64,
          });
          response = await fetch("/_create/api/upload/", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({ base64: base64Data }),
          });
        } else {
          throw new Error("Asset missing both base64 and uri");
        }
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
