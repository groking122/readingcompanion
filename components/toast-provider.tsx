"use client"

import { useEffect, useState } from "react"
import { ToastContainer, Toast } from "@/components/ui/toast"
import { toast } from "@/lib/toast"

export function ToastProvider() {
  const [toasts, setToasts] = useState<Toast[]>([])

  useEffect(() => {
    return toast.subscribe(setToasts)
  }, [])

  return <ToastContainer toasts={toasts} onClose={toast.dismiss.bind(toast)} />
}

