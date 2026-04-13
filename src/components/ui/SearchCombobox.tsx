import {
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
  type KeyboardEvent,
} from 'react'

export interface SearchComboboxOption {
  value: string
  label: string
  description?: string
}

interface SearchComboboxProps {
  label: string
  hint?: string
  placeholder: string
  searchTerm: string
  options: SearchComboboxOption[]
  loading?: boolean
  disabled?: boolean
  emptyMessage?: string
  promptMessage?: string
  noResultsMessage?: string
  onSearchTermChange: (value: string) => void
  onSelect: (option: SearchComboboxOption) => void
  'aria-invalid'?: boolean | 'true' | 'false'
}

export function SearchCombobox({
  label,
  hint,
  placeholder,
  searchTerm,
  options,
  loading = false,
  disabled = false,
  emptyMessage = 'No hay opciones disponibles.',
  promptMessage = 'Escribe para buscar.',
  noResultsMessage = 'No se encontraron resultados.',
  onSearchTermChange,
  onSelect,
  'aria-invalid': ariaInvalid,
}: SearchComboboxProps) {
  const listboxId = useId()
  const rootRef = useRef<HTMLLabelElement | null>(null)
  const [isOpen, setIsOpen] = useState(false)
  const [activeIndex, setActiveIndex] = useState(-1)
  const isInvalid = ariaInvalid === true || ariaInvalid === 'true'

  const visibleMessage = useMemo(() => {
    if (loading) {
      return 'Buscando...'
    }

    if (!searchTerm.trim()) {
      return promptMessage
    }

    if (!options.length) {
      return noResultsMessage
    }

    return null
  }, [loading, noResultsMessage, options.length, promptMessage, searchTerm])

  useEffect(() => {
    const handlePointerDown = (event: MouseEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) {
        setIsOpen(false)
        setActiveIndex(-1)
      }
    }

    document.addEventListener('mousedown', handlePointerDown)
    return () => document.removeEventListener('mousedown', handlePointerDown)
  }, [])

  useEffect(() => {
    if (!isOpen) {
      setActiveIndex(-1)
      return
    }

    if (!options.length) {
      setActiveIndex(-1)
      return
    }

    setActiveIndex((current) => {
      if (current >= 0 && current < options.length) {
        return current
      }

      return 0
    })
  }, [isOpen, options])

  const handleKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (disabled) {
      return
    }

    if (event.key === 'ArrowDown') {
      event.preventDefault()
      if (!isOpen) {
        setIsOpen(true)
        setActiveIndex(options.length ? 0 : -1)
        return
      }

      if (options.length) {
        setActiveIndex((current) => (current + 1) % options.length)
      }
      return
    }

    if (event.key === 'ArrowUp') {
      event.preventDefault()
      if (!isOpen) {
        setIsOpen(true)
        setActiveIndex(options.length ? Math.max(0, options.length - 1) : -1)
        return
      }

      if (options.length) {
        setActiveIndex((current) => (current <= 0 ? options.length - 1 : current - 1))
      }
      return
    }

    if (event.key === 'Enter' && isOpen && activeIndex >= 0 && options[activeIndex]) {
      event.preventDefault()
      onSelect(options[activeIndex])
      setIsOpen(false)
      setActiveIndex(-1)
      return
    }

    if (event.key === 'Escape') {
      setIsOpen(false)
      setActiveIndex(-1)
    }
  }

  return (
    <label ref={rootRef} className="field search-combobox">
      <span className="field__label">{label}</span>
      <div className="search-combobox__control">
        <input
          type="text"
          role="combobox"
          className="field__input search-combobox__input"
          aria-autocomplete="list"
          aria-expanded={isOpen}
          aria-controls={listboxId}
          aria-invalid={ariaInvalid}
          placeholder={placeholder}
          value={searchTerm}
          disabled={disabled}
          onFocus={() => setIsOpen(true)}
          onChange={(event) => {
            onSearchTermChange(event.target.value)
            setIsOpen(true)
          }}
          onKeyDown={handleKeyDown}
        />
        {isOpen ? (
          <div className="search-combobox__panel" role="presentation">
            <div id={listboxId} className="search-combobox__list" role="listbox">
              {visibleMessage ? (
                <div className="search-combobox__message">
                  {!searchTerm.trim() ? emptyMessage : visibleMessage}
                </div>
              ) : (
                options.map((option, index) => (
                  <button
                    key={option.value}
                    type="button"
                    role="option"
                    aria-selected={index === activeIndex}
                    className={`search-combobox__option ${index === activeIndex ? 'search-combobox__option--active' : ''}`.trim()}
                    onMouseDown={(event) => {
                      event.preventDefault()
                      onSelect(option)
                      setIsOpen(false)
                      setActiveIndex(-1)
                    }}
                  >
                    <strong>{option.label}</strong>
                    {option.description ? <span>{option.description}</span> : null}
                  </button>
                ))
              )}
            </div>
          </div>
        ) : null}
      </div>
      {hint ? (
        <span className={`field__hint ${isInvalid ? 'field__hint--error' : ''}`.trim()}>{hint}</span>
      ) : null}
    </label>
  )
}
