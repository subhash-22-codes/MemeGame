import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Uncaught error in application:', error, errorInfo);
  }

  private handleReload = () => {
    window.location.href = '/dashboard';
  };

  public render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-[#FFDDAB] flex items-center justify-center p-4 font-poppins">
          <div className="bg-white rounded-2xl p-6 sm:p-8 border-4 border-[#131010] shadow-[8px_8px_0px_0px_#131010] max-w-md w-full text-center">
            <div className="w-14 h-14 bg-red-500 border-2 border-[#131010] shadow-[3px_3px_0px_0px_#131010] rounded-xl flex items-center justify-center mx-auto mb-4 text-white">
              <AlertTriangle className="w-8 h-8" strokeWidth={2.5} />
            </div>
            
            <h1 className="text-2xl sm:text-3xl font-black text-[#131010] mb-2">
              Something went wrong 💥
            </h1>
            
            <p className="text-sm font-medium text-[#131010]/70 mb-6">
              The game hit an unexpected glitch. Don't worry, you can head back to your dashboard and rejoin.
            </p>

            {this.state.error && (
              <div className="bg-[#FFDDAB]/30 border-2 border-[#131010] rounded-xl p-3 mb-6 text-left overflow-x-auto">
                <p className="text-[11px] font-courier font-bold text-[#131010]/80">
                  {this.state.error.toString()}
                </p>
              </div>
            )}

            <button
              onClick={this.handleReload}
              className="w-full flex items-center justify-center gap-2 py-3.5 bg-[#5F8B4C] text-white rounded-xl border-2 border-[#131010] shadow-[3px_3px_0px_0px_#131010] hover:shadow-[4px_4px_0px_0px_#131010] active:translate-y-[2px] active:shadow-none font-bold text-base transition-all"
            >
              <RefreshCw className="w-5 h-5" />
              <span>Back to Dashboard</span>
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
