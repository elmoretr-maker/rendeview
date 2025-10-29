import React from "react";
import { AlertTriangle } from "lucide-react";

const COLORS = {
  primary: "#5B3BAF",
  bg: "#F9F9F9",
  text: "#2C3E50",
  error: "#E74C3C",
};

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true };
  }

  componentDidCatch(error, errorInfo) {
    console.error("Error caught by boundary:", error, errorInfo);
    this.setState({
      error,
      errorInfo,
    });

    // In production, you would send this to an error tracking service
    // like Sentry, LogRocket, etc.
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null, errorInfo: null });
    window.location.href = "/";
  };

  render() {
    if (this.state.hasError) {
      return (
        <div
          className="min-h-screen flex items-center justify-center px-4"
          style={{ backgroundColor: COLORS.bg }}
        >
          <div className="max-w-md w-full text-center">
            <div
              className="w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6"
              style={{ backgroundColor: COLORS.error + "20" }}
            >
              <AlertTriangle size={40} style={{ color: COLORS.error }} />
            </div>
            <h1
              className="text-3xl font-bold mb-4"
              style={{ color: COLORS.text }}
            >
              Oops! Something went wrong
            </h1>
            <p className="text-gray-600 mb-6">
              We encountered an unexpected error. Don't worry, your data is safe.
            </p>
            {process.env.NODE_ENV === "development" && this.state.error && (
              <details className="mb-6 text-left">
                <summary className="cursor-pointer text-sm font-semibold mb-2 opacity-60">
                  Error Details (Development Only)
                </summary>
                <pre className="text-xs bg-gray-100 p-3 rounded-lg overflow-auto max-h-40">
                  {this.state.error.toString()}
                  {this.state.errorInfo && this.state.errorInfo.componentStack}
                </pre>
              </details>
            )}
            <button
              onClick={this.handleReset}
              className="px-6 py-3 rounded-xl font-bold text-white shadow-lg hover:shadow-xl transition-all"
              style={{ backgroundColor: COLORS.primary }}
            >
              Return to Home
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
