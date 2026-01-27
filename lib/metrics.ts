/**
 * Metrics and logging utility for tracking key performance indicators
 * and structured error logging
 */

export type MetricType = 
  | "exercise_generation_fail"
  | "attempt_submit_fail"
  | "stuck_session"
  | "review_attempt_logged"
  | "distractor_pool_fallback"
  | "session_conflict"
  | "flashcard_reset"
  | "flashcard_bulk_reset"

export interface MetricData {
  type: MetricType
  userId?: string
  sessionId?: string
  attemptId?: string
  metadata?: Record<string, any>
  timestamp: Date
}

export interface ErrorLog {
  level: "error" | "warn" | "info"
  message: string
  error?: Error | unknown
  userId?: string
  sessionId?: string
  attemptId?: string
  endpoint?: string
  metadata?: Record<string, any>
  timestamp: Date
}

// In-memory metrics store (in production, use a proper metrics service like DataDog, Prometheus, etc.)
const metrics: MetricData[] = []
const errorLogs: ErrorLog[] = []
const MAX_METRICS = 1000 // Keep last 1000 metrics
const MAX_ERRORS = 500 // Keep last 500 errors

/**
 * Track a metric event
 */
export function trackMetric(type: MetricType, data?: {
  userId?: string
  sessionId?: string
  attemptId?: string
  metadata?: Record<string, any>
}) {
  const metric: MetricData = {
    type,
    userId: data?.userId,
    sessionId: data?.sessionId,
    attemptId: data?.attemptId,
    metadata: data?.metadata,
    timestamp: new Date(),
  }

  metrics.push(metric)

  // Keep only recent metrics
  if (metrics.length > MAX_METRICS) {
    metrics.shift()
  }

  // Log to console in development
  if (process.env.NODE_ENV === "development") {
    console.log(`[METRIC] ${type}`, {
      userId: data?.userId?.substring(0, 8),
      sessionId: data?.sessionId?.substring(0, 8),
      ...data?.metadata,
    })
  }
}

/**
 * Log an error with structured data
 */
export function logError(
  message: string,
  error?: Error | unknown,
  context?: {
    userId?: string
    sessionId?: string
    attemptId?: string
    endpoint?: string
    metadata?: Record<string, any>
  }
) {
  const errorLog: ErrorLog = {
    level: "error",
    message,
    error,
    userId: context?.userId,
    sessionId: context?.sessionId,
    attemptId: context?.attemptId,
    endpoint: context?.endpoint,
    metadata: context?.metadata,
    timestamp: new Date(),
  }

  errorLogs.push(errorLog)

  // Keep only recent errors
  if (errorLogs.length > MAX_ERRORS) {
    errorLogs.shift()
  }

  // Enhanced console logging
  console.error(`[ERROR] ${message}`, {
    userId: context?.userId?.substring(0, 8),
    sessionId: context?.sessionId?.substring(0, 8),
    attemptId: context?.attemptId?.substring(0, 8),
    endpoint: context?.endpoint,
    error: error instanceof Error ? {
      name: error.name,
      message: error.message,
      stack: error.stack,
    } : error,
    ...context?.metadata,
  })
}

/**
 * Log a warning
 */
export function logWarning(
  message: string,
  context?: {
    userId?: string
    sessionId?: string
    attemptId?: string
    endpoint?: string
    metadata?: Record<string, any>
  }
) {
  const errorLog: ErrorLog = {
    level: "warn",
    message,
    userId: context?.userId,
    sessionId: context?.sessionId,
    attemptId: context?.attemptId,
    endpoint: context?.endpoint,
    metadata: context?.metadata,
    timestamp: new Date(),
  }

  errorLogs.push(errorLog)

  if (errorLogs.length > MAX_ERRORS) {
    errorLogs.shift()
  }

  console.warn(`[WARN] ${message}`, {
    userId: context?.userId?.substring(0, 8),
    sessionId: context?.sessionId?.substring(0, 8),
    ...context?.metadata,
  })
}

/**
 * Log info message
 */
export function logInfo(
  message: string,
  context?: {
    userId?: string
    sessionId?: string
    attemptId?: string
    endpoint?: string
    metadata?: Record<string, any>
  }
) {
  const errorLog: ErrorLog = {
    level: "info",
    message,
    userId: context?.userId,
    sessionId: context?.sessionId,
    attemptId: context?.attemptId,
    endpoint: context?.endpoint,
    metadata: context?.metadata,
    timestamp: new Date(),
  }

  errorLogs.push(errorLog)

  if (errorLogs.length > MAX_ERRORS) {
    errorLogs.shift()
  }

  if (process.env.NODE_ENV === "development") {
    console.log(`[INFO] ${message}`, {
      userId: context?.userId?.substring(0, 8),
      sessionId: context?.sessionId?.substring(0, 8),
      ...context?.metadata,
    })
  }
}

/**
 * Get metrics for a specific type within a time window
 */
export function getMetrics(
  type: MetricType,
  since?: Date
): MetricData[] {
  if (!since) {
    return metrics.filter(m => m.type === type)
  }
  return metrics.filter(m => m.type === type && m.timestamp >= since)
}

/**
 * Calculate failure rate for a metric type
 */
export function getFailureRate(
  type: MetricType,
  windowMinutes: number = 60
): number {
  const since = new Date(Date.now() - windowMinutes * 60 * 1000)
  const failures = getMetrics(type, since).length
  
  // For exercise_generation_fail, we'd need total attempts to calculate rate
  // For now, return count of failures
  return failures
}

/**
 * Get error logs within a time window
 */
export function getErrorLogs(since?: Date): ErrorLog[] {
  if (!since) {
    return [...errorLogs]
  }
  return errorLogs.filter(log => log.timestamp >= since)
}

/**
 * Get metrics summary
 */
export function getMetricsSummary(windowMinutes: number = 60) {
  const since = new Date(Date.now() - windowMinutes * 60 * 1000)
  
  return {
    exerciseGenerationFails: getMetrics("exercise_generation_fail", since).length,
    attemptSubmitFails: getMetrics("attempt_submit_fail", since).length,
    stuckSessions: getMetrics("stuck_session", since).length,
    reviewAttemptsLogged: getMetrics("review_attempt_logged", since).length,
    distractorPoolFallbacks: getMetrics("distractor_pool_fallback", since).length,
    sessionConflicts: getMetrics("session_conflict", since).length,
    flashcardResets: getMetrics("flashcard_reset", since).length,
    flashcardBulkResets: getMetrics("flashcard_bulk_reset", since).length,
    errorCount: getErrorLogs(since).filter(log => log.level === "error").length,
    warningCount: getErrorLogs(since).filter(log => log.level === "warn").length,
  }
}

/**
 * Clear old metrics (for cleanup)
 */
export function clearOldMetrics(olderThanMinutes: number = 1440) {
  const cutoff = new Date(Date.now() - olderThanMinutes * 60 * 1000)
  const initialLength = metrics.length
  
  // Remove old metrics
  while (metrics.length > 0 && metrics[0].timestamp < cutoff) {
    metrics.shift()
  }
  
  // Remove old error logs
  while (errorLogs.length > 0 && errorLogs[0].timestamp < cutoff) {
    errorLogs.shift()
  }
  
  return {
    metricsRemoved: initialLength - metrics.length,
    errorsRemoved: errorLogs.length,
  }
}

