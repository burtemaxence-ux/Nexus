type LogLevel = 'info' | 'warn' | 'error' | 'critical'

interface LogEntry {
  level: LogLevel
  message: string
  context?: Record<string, unknown>
}

export function log({ level, message, context }: LogEntry) {
  const entry = {
    level,
    message,
    timestamp: new Date().toISOString(),
    ...(context && { context }),
  }

  if (level === 'error' || level === 'critical') {
    console.error(JSON.stringify(entry))
  } else if (level === 'warn') {
    console.warn(JSON.stringify(entry))
  } else {
    console.log(JSON.stringify(entry))
  }
}

export async function captureError(err: unknown, context?: Record<string, unknown>) {
  const message = err instanceof Error ? err.message : String(err)
  const stack = err instanceof Error ? err.stack : undefined
  log({
    level: 'critical',
    message,
    context: { ...context, ...(stack && { stack }) },
  })
  if (typeof window === 'undefined') {
    try {
      const Sentry = await import('@sentry/nextjs')
      Sentry.captureException(err, { extra: context })
    } catch {}
  }
}
