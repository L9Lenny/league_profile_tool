import React from 'react';

interface ErrorBoundaryProps {
    children: React.ReactNode;
    name?: string;
}

interface ErrorBoundaryState {
    hasError: boolean;
    error: Error | null;
}

class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
    constructor(props: ErrorBoundaryProps) {
        super(props);
        this.state = { hasError: false, error: null };
    }

    static getDerivedStateFromError(error: Error): ErrorBoundaryState {
        return { hasError: true, error };
    }

    componentDidCatch(error: Error, info: React.ErrorInfo) {
        const label = this.props.name ?? 'App';
        console.error(`[ErrorBoundary:${label}] caught:`, error, info.componentStack);
    }

    handleReset = () => {
        this.setState({ hasError: false, error: null });
    };

    render() {
        if (this.state.hasError) {
            const label = this.props.name ?? 'App';
            return (
                <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-primary, #ddd)' }}>
                    <h2 style={{ color: 'var(--hextech-gold, #c8aa6e)', marginBottom: '12px' }}>
                        Something went wrong{label !== 'App' ? ` in ${label}` : ''}
                    </h2>
                    <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary, #aaa)', marginBottom: '20px' }}>
                        {this.state.error?.message ?? 'An unexpected error occurred.'}
                    </p>
                    <button
                        type="button"
                        className="primary-btn"
                        onClick={this.handleReset}
                        style={{ padding: '10px 20px' }}
                    >
                        Try Again
                    </button>
                </div>
            );
        }
        return this.props.children;
    }
}

export default ErrorBoundary;
