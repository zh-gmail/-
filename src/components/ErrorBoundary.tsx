import { Component, type ReactNode } from 'react';

interface Props { children: ReactNode; fallback?: ReactNode; }
interface State { hasError: boolean; }

export default class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(): State {
    return { hasError: true };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo): void {
    console.error('ErrorBoundary caught:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return this.props.fallback || (
        <div className="h-full flex items-center justify-center bg-black text-white">
          <div className="text-center space-y-4">
            <span className="text-4xl">!</span>
            <p className="text-white/60">页面加载失败，请刷新重试</p>
            <button
              onClick={() => window.location.reload()}
              className="px-5 py-2 bg-white/10 rounded-xl text-sm hover:bg-white/20 transition-colors"
            >
              刷新页面
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}