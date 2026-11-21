import React from 'react';

interface ErrorBoundaryState {
  hasError: boolean;
  message: string;
}

export class ErrorBoundary extends React.Component<
  { children: React.ReactNode },
  ErrorBoundaryState
> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false, message: '' };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return {
      hasError: true,
      message: error.message || 'An unexpected application error occurred.',
    };
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-[#F5F3EF] text-[#0A0A0A] flex items-center justify-center px-6">
          <div className="max-w-md w-full bg-white border border-black/15 p-8 space-y-4 text-center">
            <p className="text-xs uppercase tracking-[0.16em] text-[#9A7B56]">SOVRAN Atelier</p>
            <h1 className="font-editorial text-3xl font-semibold">Unable to Load View</h1>
            <p className="text-xs text-[#0A0A0A]/65 break-words">{this.state.message}</p>
            <button
              type="button"
              onClick={() => window.location.assign('/')}
              className="px-6 py-3 bg-[#0A0A0A] text-[#F5F3EF] text-xs uppercase tracking-[0.14em] cursor-pointer"
            >
              Return Home
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}
