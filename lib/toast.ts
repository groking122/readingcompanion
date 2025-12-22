/**
 * Toast Notification System
 * Provides a simple API for showing toast notifications throughout the app
 */

import React from "react"
import { Toast, ToastType } from "@/components/ui/toast"

type ToastOptions = {
  type?: ToastType
  title: string
  description?: string
  duration?: number
  action?: {
    label: string
    onClick: () => void
  }
}

class ToastManager {
  private toasts: Toast[] = []
  private listeners: Set<(toasts: Toast[]) => void> = new Set()
  private idCounter = 0

  subscribe(listener: (toasts: Toast[]) => void) {
    this.listeners.add(listener)
    return () => {
      this.listeners.delete(listener)
    }
  }

  private notify() {
    this.listeners.forEach((listener) => listener([...this.toasts]))
  }

  show(options: ToastOptions): string {
    const id = `toast-${++this.idCounter}`
    const toast: Toast = {
      id,
      type: options.type || "info",
      title: options.title,
      description: options.description,
      duration: options.duration ?? 5000,
      action: options.action,
    }

    this.toasts.push(toast)
    this.notify()
    return id
  }

  success(title: string, description?: string, duration?: number) {
    return this.show({ type: "success", title, description, duration })
  }

  error(title: string, description?: string, duration?: number) {
    return this.show({ type: "error", title, description, duration: duration ?? 7000 })
  }

  warning(title: string, description?: string, duration?: number) {
    return this.show({ type: "warning", title, description, duration })
  }

  info(title: string, description?: string, duration?: number) {
    return this.show({ type: "info", title, description, duration })
  }

  dismiss(id: string) {
    this.toasts = this.toasts.filter((toast) => toast.id !== id)
    this.notify()
  }

  dismissAll() {
    this.toasts = []
    this.notify()
  }

  getToasts(): Toast[] {
    return [...this.toasts]
  }
}

// Singleton instance
export const toast = new ToastManager()

// React hook for using toast in components
export function useToast() {
  const [toasts, setToasts] = React.useState<Toast[]>([])

  React.useEffect(() => {
    return toast.subscribe(setToasts)
  }, [])

  return {
    toasts,
    show: toast.show.bind(toast),
    success: toast.success.bind(toast),
    error: toast.error.bind(toast),
    warning: toast.warning.bind(toast),
    info: toast.info.bind(toast),
    dismiss: toast.dismiss.bind(toast),
    dismissAll: toast.dismissAll.bind(toast),
  }
}

