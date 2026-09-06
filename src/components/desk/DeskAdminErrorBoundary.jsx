import React from 'react';
import { sound } from '../../utils/audio';

export class DeskAdminErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('DeskAdminErrorBoundary captured error:', error, errorInfo);
    this.setState({ errorInfo });
    sound?.playError?.();
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null, errorInfo: null });
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="bg-[#140620] border-3 border-[#FF2247] rounded-xl p-6 shadow-[6px_6px_0px_#000] font-pixel text-white select-none space-y-4">
          <div className="flex items-center gap-3 border-b-2 border-[#FF2247]/50 pb-3">
            <span className="w-3 h-3 rounded-full bg-[#FF2247] animate-ping" />
            <h2 className="text-base sm:text-lg font-extrabold text-[#FF2247] tracking-wider">
              ADMIN CONSOLE SYSTEM EXCEPTION RECOVERED
            </h2>
          </div>

          <p className="text-xs font-mono text-gray-300 leading-relaxed">
            The Admin Console encountered a runtime render error while loading protocol or desk data.
            Your terminal session is safe and uncorrupted.
          </p>

          <div className="bg-black/80 border border-red-900/80 rounded-lg p-4 font-mono text-[11px] text-red-400 overflow-x-auto">
            <div className="text-white font-bold mb-1">Diagnostic Log:</div>
            <div>{this.state.error?.message || 'Unknown error occurred'}</div>
            {this.state.error?.stack && (
              <pre className="text-[9px] text-gray-500 mt-2 whitespace-pre-wrap max-h-32 overflow-y-auto">
                {this.state.error.stack}
              </pre>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-3 pt-2">
            <button
              type="button"
              onClick={this.handleReset}
              className="pixel-btn pixel-btn-vibrant-gold px-4 py-2 text-xs font-bold rounded shadow-[2px_2px_0px_#000]"
            >
              [ ↻ RETRY ADMIN CONSOLE ]
            </button>
            <button
              type="button"
              onClick={() => {
                this.handleReset();
                this.props.onBackToTerminal?.();
              }}
              className="pixel-btn pixel-btn-vibrant-lime px-4 py-2 text-xs font-extrabold rounded shadow-[2px_2px_0px_#000]"
            >
              [ ← RETURN TO DESK TERMINAL ]
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
