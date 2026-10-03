import { Component } from 'react';

// Catches errors thrown while rendering, so one broken screen shows a message instead of
// a blank page. Error boundaries still have to be classes in React 19.
class ErrorBoundary extends Component {
  state = { hasError: false };

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error) {
    console.error(error);
  }

  render() {
    if (!this.state.hasError) return this.props.children;

    return (
      <div role="alert" className="mx-auto max-w-md px-4 py-24 text-center text-slate-100">
        <h1 className="text-2xl font-bold">Something went wrong</h1>
        <p className="mt-3 text-slate-300">The page hit an unexpected problem. Please reload it.</p>
        {/* A normal link (not the router's) reloads the app and clears the error */}
        <a
          href="/"
          className="mt-6 inline-block rounded-lg bg-accent px-4 py-2.5 font-semibold text-ink"
        >
          Back to the home page
        </a>
      </div>
    );
  }
}

export default ErrorBoundary;
