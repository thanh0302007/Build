import { Component } from 'react';
import { RotateCcw } from 'lucide-react';
import { Button, Card } from './ui.jsx';

export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, info) {
    console.error('[CozySpace ErrorBoundary]', error, info);
  }

  render() {
    if (this.state.hasError) {
      return (
        <Card className="mx-auto my-10 max-w-lg p-8 text-center">
          <div className="text-4xl">🍵</div>
          <h2 className="mt-3 text-lg font-bold text-cozy-text">
            Góc này vừa gặp một trục trặc nhỏ
          </h2>
          <p className="mt-2 text-sm text-cozy-muted">
            Dữ liệu trên ổ cứng của bạn vẫn hoàn toàn an toàn. Hãy thử làm mới lại khu vực này nhé.
          </p>
          {this.state.error?.message && (
            <p className="mt-3 rounded-2xl bg-cozy-blush px-3 py-2 font-mono text-xs text-cozy-muted">
              {this.state.error.message}
            </p>
          )}
          <div className="mt-5 flex justify-center">
            <Button onClick={() => this.setState({ hasError: false, error: null })}>
              <RotateCcw size={15} /> Khôi phục hiển thị
            </Button>
          </div>
        </Card>
      );
    }
    return this.props.children;
  }
}

