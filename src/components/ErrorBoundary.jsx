import React from 'react'
export default class ErrorBoundary extends React.Component {
  constructor(p) {
    super(p)
    this.state = { hasError: false, err: null }
  }
  static getDerivedStateFromError(error) {
    return { hasError: true, err: error }
  }
  componentDidCatch(error, info) {
    console.error('ErrorBoundary caught:', error, info)
  }
  render() {
    if (this.state.hasError) {
      return (
        <div className="max-w-2xl mx-auto mt-12 p-6 rounded-2xl border border-rose-700/60 bg-rose-900/20 text-rose-100">
          <h2 className="text-xl font-semibold mb-2">
            Whoops — the trainer crashed.
          </h2>
          <p className="text-rose-200/90">
            Open DevTools → Console for details and share the top red line with
            me.
          </p>
        </div>
      )
    }
    return this.props.children
  }
}
