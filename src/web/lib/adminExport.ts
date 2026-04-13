const PRINTING_CLASS = 'printing-selection'
const PRINT_TARGET_CLASS = 'print-target'

export const downloadCsv = (
  fileName: string,
  headers: string[],
  rows: Array<Array<string | number>>,
) => {
  const escape = (value: string | number) => `"${String(value).replace(/"/g, '""')}"`
  const csv = [headers.map(escape).join(','), ...rows.map((row) => row.map(escape).join(','))].join(
    '\n',
  )
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = fileName
  link.click()
  URL.revokeObjectURL(url)
}

export const printCurrentView = (title?: string) => {
  const previousTitle = document.title
  if (title) {
    document.title = title
  }

  const restoreTitle = () => {
    document.title = previousTitle
    window.removeEventListener('afterprint', restoreTitle)
  }

  window.addEventListener('afterprint', restoreTitle)
  window.print()
}

export const printElementById = (elementId: string, title?: string) => {
  const target = document.getElementById(elementId)
  if (!target) {
    return
  }

  const previousTitle = document.title
  const cleanup = () => {
    document.body.classList.remove(PRINTING_CLASS)
    target.classList.remove(PRINT_TARGET_CLASS)
    document.title = previousTitle
    window.removeEventListener('afterprint', cleanup)
  }

  if (title) {
    document.title = title
  }

  document.body.classList.add(PRINTING_CLASS)
  target.classList.add(PRINT_TARGET_CLASS)
  window.addEventListener('afterprint', cleanup)
  window.print()

  window.setTimeout(() => {
    if (document.body.classList.contains(PRINTING_CLASS)) {
      cleanup()
    }
  }, 1000)
}
