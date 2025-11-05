import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ChakraProvider, extendTheme } from "@chakra-ui/react";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5, // 5 minutes
      cacheTime: 1000 * 60 * 30, // 30 minutes
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});

const theme = extendTheme({
  colors: {
    brand: {
      50: "#f5e6ff",
      100: "#dab3ff",
      200: "#bf80ff",
      300: "#a34dff",
      400: "#881aff",
      500: "#7c3aed",
      600: "#6b32d1",
      700: "#5a29b5",
      800: "#4a2199",
      900: "#39187d",
    },
  },
  fonts: {
    heading: `'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif`,
    body: `'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif`,
  },
  styles: {
    global: {
      body: {
        bg: "#F9F9F9",
        color: "#2C3E50",
      },
    },
  },
});

export default function RootLayout({ children }) {
  return (
    <ChakraProvider theme={theme}>
      <QueryClientProvider client={queryClient}>
        {children}
      </QueryClientProvider>
    </ChakraProvider>
  );
}
