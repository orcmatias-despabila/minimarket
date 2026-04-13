export interface AdminFeedbackMessage {
  title: string
  description: string
}

const connectionPattern =
  /network|fetch|failed to fetch|timed out|timeout|offline|internet|connection|conex/i

const permissionPattern = /permiso|privileg|forbidden|not allowed|unauthorized|acceso/i
const internalPattern =
  /pgrst|schema cache|column|relation|undefined|is not a function|select\(|supabase|postgrest/i

export const getFriendlyDataError = (
  error: unknown,
  fallback: AdminFeedbackMessage,
): AdminFeedbackMessage => {
  if (!(error instanceof Error)) {
    return fallback
  }

  const message = error.message.trim()

  if (!message) {
    return fallback
  }

  if (connectionPattern.test(message)) {
    return {
      title: 'Problema de conexion',
      description:
        'No pudimos comunicarnos con el servidor. Revisa tu conexion e intenta nuevamente.',
    }
  }

  if (permissionPattern.test(message)) {
    return {
      title: 'Acceso no disponible',
      description:
        'Tu usuario no tiene permisos suficientes para consultar esta informacion del negocio actual.',
    }
  }

  if (internalPattern.test(message)) {
    return fallback
  }

  return {
    title: fallback.title,
    description: message,
  }
}
