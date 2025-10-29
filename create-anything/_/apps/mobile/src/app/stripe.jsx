import { useLocalSearchParams, useRouter } from "expo-router";
import { useEffect } from "react";
import { Platform } from "react-native";
import { WebView } from "react-native-webview";

export default function Stripe() {
  const { checkoutUrl } = useLocalSearchParams();
  const router = useRouter();

  useEffect(() => {
    if (Platform.OS === "web") {
      if (checkoutUrl) {
        const popup = window.open(checkoutUrl, "_blank", "popup");
        const checkClosed = setInterval(() => {
          try {
            if (popup.closed || popup.location.href.includes(window.location.origin)) {
              clearInterval(checkClosed);
              popup.close();
              router.back();
            }
          } catch (e) {}
        }, 1000);
      } else {
        router.back();
      }
    }
  }, [checkoutUrl, router]);

  const handleShouldStartLoadWithRequest = (request) => {
    if (request.url.startsWith(process.env.EXPO_PUBLIC_BASE_URL)) {
      router.back();
      return false;
    }
    return true;
  };

  if (Platform.OS === "web") {
    return null;
  }

  return (
    <WebView
      source={{ uri: checkoutUrl }}
      style={{ flex: 1 }}
      onShouldStartLoadWithRequest={handleShouldStartLoadWithRequest}
    />
  );
}
