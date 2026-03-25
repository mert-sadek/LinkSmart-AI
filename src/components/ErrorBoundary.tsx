import React, { Component, ErrorInfo, ReactNode } from "react";

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export default class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("Uncaught error:", error, errorInfo);
  }

  public render() {
    if (this.state.hasError) {
      let errorMessage = "Something went wrong.";
      try {
        if (this.state.error?.message) {
          const parsed = JSON.parse(this.state.error.message);
          if (parsed.error) {
            errorMessage = `Firestore Error: ${parsed.error} (${parsed.operationType} on ${parsed.path})`;
          }
        }
      } catch {
        errorMessage = this.state.error?.message || errorMessage;
      }

      return (
        <div className="min-h-screen bg-zinc-950 flex items-center justify-center p-6 text-center">
          <div className="max-w-md w-full bg-zinc-900 border border-zinc-800 p-8 rounded-3xl shadow-2xl">
            <h2 className="text-2xl font-bold text-white mb-4">Application Error</h2>
            <p className="text-zinc-400 mb-6">{errorMessage}</p>
            <button
              onClick={() => window.location.reload()}
              className="bg-orange-500 hover:bg-orange-600 text-white font-bold py-3 px-6 rounded-xl transition-all"
            >
              Reload Application
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
