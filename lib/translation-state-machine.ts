/**
 * Translation State Machine
 * Manages the state transitions for the translation flow
 */

export type TranslationState =
  | "IDLE"
  | "SELECTING"
  | "FETCHING_TRANSLATION"
  | "SHOWING_RESULT"
  | "SAVING_VOCAB"
  | "ERROR"

export interface TranslationStateMachine {
  state: TranslationState
  error: string | null
}

export type TranslationEvent =
  | { type: "SELECT_TEXT" }
  | { type: "START_FETCH" }
  | { type: "TRANSLATION_RECEIVED" }
  | { type: "TRANSLATION_ERROR"; error: string }
  | { type: "START_SAVE" }
  | { type: "SAVE_COMPLETE" }
  | { type: "SAVE_ERROR"; error: string }
  | { type: "RESET" }
  | { type: "CANCEL" }

/**
 * State machine reducer
 */
export function translationReducer(
  state: TranslationStateMachine,
  event: TranslationEvent
): TranslationStateMachine {
  switch (state.state) {
    case "IDLE":
      if (event.type === "SELECT_TEXT") {
        return { ...state, state: "SELECTING", error: null }
      }
      break

    case "SELECTING":
      if (event.type === "START_FETCH") {
        return { ...state, state: "FETCHING_TRANSLATION", error: null }
      }
      if (event.type === "CANCEL" || event.type === "RESET") {
        return { state: "IDLE", error: null }
      }
      break

    case "FETCHING_TRANSLATION":
      if (event.type === "TRANSLATION_RECEIVED") {
        return { ...state, state: "SHOWING_RESULT", error: null }
      }
      if (event.type === "TRANSLATION_ERROR") {
        return { ...state, state: "ERROR", error: event.error }
      }
      if (event.type === "CANCEL" || event.type === "RESET") {
        return { state: "IDLE", error: null }
      }
      break

    case "SHOWING_RESULT":
      if (event.type === "START_SAVE") {
        return { ...state, state: "SAVING_VOCAB", error: null }
      }
      if (event.type === "CANCEL" || event.type === "RESET") {
        return { state: "IDLE", error: null }
      }
      break

    case "SAVING_VOCAB":
      if (event.type === "SAVE_COMPLETE") {
        return { state: "IDLE", error: null }
      }
      if (event.type === "SAVE_ERROR") {
        return { ...state, state: "ERROR", error: event.error }
      }
      if (event.type === "CANCEL" || event.type === "RESET") {
        return { state: "IDLE", error: null }
      }
      break

    case "ERROR":
      if (event.type === "RESET" || event.type === "CANCEL") {
        return { state: "IDLE", error: null }
      }
      if (event.type === "SELECT_TEXT") {
        return { ...state, state: "SELECTING", error: null }
      }
      break
  }

  // Invalid transition - return current state
  return state
}

/**
 * Initial state
 */
export const initialTranslationState: TranslationStateMachine = {
  state: "IDLE",
  error: null,
}

/**
 * Check if a transition is valid
 */
export function isValidTransition(
  currentState: TranslationState,
  event: TranslationEvent["type"]
): boolean {
  const validTransitions: Record<TranslationState, TranslationEvent["type"][]> = {
    IDLE: ["SELECT_TEXT"],
    SELECTING: ["START_FETCH", "CANCEL", "RESET"],
    FETCHING_TRANSLATION: ["TRANSLATION_RECEIVED", "TRANSLATION_ERROR", "CANCEL", "RESET"],
    SHOWING_RESULT: ["START_SAVE", "CANCEL", "RESET"],
    SAVING_VOCAB: ["SAVE_COMPLETE", "SAVE_ERROR", "CANCEL", "RESET"],
    ERROR: ["RESET", "CANCEL", "SELECT_TEXT"],
  }

  return validTransitions[currentState]?.includes(event) ?? false
}
