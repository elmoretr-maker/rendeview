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
        const guessedName =
          asset.fileName ||
          asset.name ||
          (uri ? uri.split("/").pop() : null) ||
          "upload";
        // Try to infer content type sensibly; default to image/jpeg if unknown
        const type =
          asset.mimeType ||
          asset.type ||
          (guessedName.toLowerCase().endsWith(".mp4")
            ? "video/mp4"
            : "image/jpeg");

        if (!uri) {
          throw new Error("Invalid asset: missing uri");
        }

        const formData = new FormData();
        formData.append("file", {
          // @ts-ignore React Native FormData file shape
          uri,
          name: guessedName,
          type,
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
