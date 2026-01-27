"use client"

import React, { Component, ErrorInfo, ReactNode } from "react"
import { Button } from "@/components/ui/button"
import { AlertCircle, RefreshCw, Home } from "lucide-react"
import { useRouter } from "next/navigation"

interface Props {
  children: ReactNode
  fallback?: ReactNode
}

interface State {
  hasError: boolean
  error: Error | null
}

export class ReaderErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props)
    this.state = { hasError: false, error: null }
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("Reader error boundary caught an error:", error, errorInfo)
  }

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback
      }

      return <ReaderErrorFallback error={this.state.error} />
    }

    return this.props.children
  }
}

function ReaderErrorFallback({ error }: { error: Error | null }) {
  const router = useRouter()

  return (
    <div className="flex flex-col items-center justify-center min-h-screen p-4 bg-background">
      <div className="max-w-md w-full text-center space-y-6">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-destructive/10 mb-4">
          <AlertCircle className="h-8 w-8 text-destructive" />
        </div>
        
        <div>
          <h1 className="text-2xl font-bold mb-2">Unable to Load Book</h1>
          <p className="text-muted-foreground mb-4">
            There was an error rendering this book. This might be due to a corrupted file or an unsupported format.
          </p>
          {error && (
            <details className="text-left mt-4 p-4 bg-muted rounded-lg">
              <summary className="text-sm font-medium cursor-pointer mb-2">Error Details</summary>
              <pre className="text-xs text-muted-foreground overflow-auto">
                {error.message}
              </pre>
            </details>
          )}
        </div>

        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Button
            onClick={() => {
              window.location.reload()
            }}
            className="min-h-[48px]"
          >
            <RefreshCw className="h-4 w-4 mr-2" />
            Retry
          </Button>
          <Button
            variant="outline"
            onClick={() => {
              router.push("/library")
            }}
            className="min-h-[48px]"
          >
            <Home className="h-4 w-4 mr-2" />
            Go to Library
          </Button>
        </div>

        <p className="text-xs text-muted-foreground mt-4">
          If this problem persists, please try uploading the book again or contact support.
        </p>
      </div>
    </div>
  )
}

