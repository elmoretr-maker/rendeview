import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

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

export default function RootLayout({ children }) {
  return (
    <QueryClientProvider client={queryClient}>
      {/* Apply global brand styles: background, text, modern font */}
      <div
        className="min-h-screen font-inter"
        style={{ backgroundColor: "#F9F9F9", color: "#2C3E50" }}
      >
        {children}
      </div>
    </QueryClientProvider>
  );
}
