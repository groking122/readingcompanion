"use client"

import { useEffect, useRef, useReducer } from "react"
import { useTranslationContext } from "@/contexts/translation-context"
import { useIsMobile } from "@/lib/hooks/use-media-query"
import { TranslationPopover } from "./translation-popover"
import { TranslationDrawer } from "./translation-drawer"
import {
  translationReducer,
  initialTranslationState,
  type TranslationEvent,
} from "@/lib/translation-state-machine"

interface TranslationManagerProps {
  onSaveWord: () => Promise<void>
  onMarkKnown?: () => Promise<void>
  onUndo?: () => Promise<void>
  isPhrase: (text: string) => boolean
}

export function TranslationManager({
  onSaveWord,
  onMarkKnown,
  onUndo,
  isPhrase,
}: TranslationManagerProps) {
  const isMobile = useIsMobile()
  const {
    selectedText,
    translation,
    alternativeTranslations,
    translating,
    saving,
    savedWordId,
    selectedContext,
    popoverOpen,
    popoverPosition,
    setTranslation,
    setAlternativeTranslations,
    setTranslating,
    setSaving,
    setSavedWordId,
    setPopoverOpen,
    clearSelection,
  } = useTranslationContext()

  const [state, dispatch] = useReducer(translationReducer, initialTranslationState)
  const abortControllerRef = useRef<AbortController | null>(null)

  // Handle text selection - trigger state machine
  useEffect(() => {
    if (selectedText) {
      dispatch({ type: "SELECT_TEXT" })
      dispatch({ type: "START_FETCH" })
    } else {
      dispatch({ type: "RESET" })
    }
  }, [selectedText])

  // Fetch translation when state is FETCHING_TRANSLATION
  useEffect(() => {
    if (state.state === "FETCHING_TRANSLATION" && selectedText) {
      // Cancel previous request if any
      if (abortControllerRef.current) {
        abortControllerRef.current.abort()
      }

      // Create new abort controller
      const abortController = new AbortController()
      abortControllerRef.current = abortController

      setTranslating(true)
      setTranslation("")
      setAlternativeTranslations([])

      fetch("/api/translate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: selectedText }),
        signal: abortController.signal,
      })
        .then((res) => {
          if (abortController.signal.aborted) {
            return
          }

          if (!res.ok) {
            throw new Error("Translation failed")
          }

          return res.json()
        })
        .then((data) => {
          if (abortController.signal.aborted) {
            return
          }

          setTranslation(data.translatedText)
          setAlternativeTranslations(data.alternativeTranslations || [])
          setPopoverOpen(true)
          dispatch({ type: "TRANSLATION_RECEIVED" })
        })
        .catch((error: any) => {
          if (error.name === "AbortError") {
            return
          }
          console.error("Translation error:", error)
          dispatch({
            type: "TRANSLATION_ERROR",
            error: error.message || "Translation failed",
          })
          setTranslation("Translation failed")
        })
        .finally(() => {
          if (!abortController.signal.aborted) {
            setTranslating(false)
          }
        })
    }
  }, [state.state, selectedText, setTranslation, setAlternativeTranslations, setTranslating, setPopoverOpen])

  // Handle save word
  const handleSaveWord = async () => {
    if (state.state !== "SHOWING_RESULT") {
      return
    }

    dispatch({ type: "START_SAVE" })
    setSaving(true)

    try {
      await onSaveWord()
      dispatch({ type: "SAVE_COMPLETE" })
      // Clear selection after a delay to show success state
      setTimeout(() => {
        clearSelection()
      }, 1500)
    } catch (error: any) {
      dispatch({
        type: "SAVE_ERROR",
        error: error.message || "Failed to save word",
      })
      setSaving(false)
    }
  }

  // Handle mark as known
  const handleMarkKnown = async () => {
    if (onMarkKnown) {
      try {
        await onMarkKnown()
        clearSelection()
      } catch (error) {
        console.error("Failed to mark as known:", error)
      }
    }
  }

  // Handle undo
  const handleUndo = async () => {
    if (onUndo) {
      try {
        await onUndo()
        clearSelection()
      } catch (error) {
        console.error("Failed to undo:", error)
      }
    }
  }

  // Handle close
  const handleClose = () => {
    dispatch({ type: "CANCEL" })
    clearSelection()
  }

  // Cleanup abort controller on unmount
  useEffect(() => {
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort()
      }
    }
  }, [])

  if (!selectedText) {
    return null
  }

  // Render appropriate UI based on device
  if (isMobile) {
    return (
      <TranslationDrawer
        isOpen={popoverOpen}
        onClose={handleClose}
        selectedText={selectedText}
        translation={translation}
        translating={translating || state.state === "FETCHING_TRANSLATION"}
        alternativeTranslations={alternativeTranslations}
        saving={saving || state.state === "SAVING_VOCAB"}
        savedWordId={savedWordId}
        isPhrase={isPhrase(selectedText)}
        context={selectedContext}
        onSave={handleSaveWord}
        onUndo={handleUndo}
        onMarkKnown={handleMarkKnown}
        onTranslationChange={setTranslation}
      />
    )
  }

  return (
    <TranslationPopover
      isOpen={popoverOpen}
      onClose={handleClose}
      selectedText={selectedText}
      translation={translation}
      translating={translating || state.state === "FETCHING_TRANSLATION"}
      alternativeTranslations={alternativeTranslations}
      saving={saving || state.state === "SAVING_VOCAB"}
      savedWordId={savedWordId}
      isPhrase={isPhrase(selectedText)}
      context={selectedContext}
      selectionPosition={popoverPosition}
      onSave={handleSaveWord}
      onUndo={handleUndo}
      onMarkKnown={handleMarkKnown}
      onTranslationChange={setTranslation}
    />
  )
}
