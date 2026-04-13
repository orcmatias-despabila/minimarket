import { BrowserMultiFormatReader } from '@zxing/browser'
import { BarcodeFormat, DecodeHintType } from '@zxing/library'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Button } from '../../components/ui/Button'

type ScannerState = 'idle' | 'starting' | 'active' | 'success' | 'error'

interface BarcodeCameraScannerProps {
  onDetected: (barcode: string) => boolean | Promise<boolean>
  className?: string
  scanCooldownMs?: number
}

const barcodeFormats = [
  BarcodeFormat.EAN_13,
  BarcodeFormat.EAN_8,
  BarcodeFormat.UPC_A,
  BarcodeFormat.UPC_E,
  BarcodeFormat.CODE_128,
  BarcodeFormat.CODE_39,
  BarcodeFormat.CODABAR,
  BarcodeFormat.ITF,
]

const buildReaderHints = () => {
  const hints = new Map()
  hints.set(DecodeHintType.POSSIBLE_FORMATS, barcodeFormats)
  hints.set(DecodeHintType.TRY_HARDER, true)
  return hints
}

const normalizeCameraError = (error: unknown) => {
  if (!(error instanceof Error)) {
    return 'No pudimos activar la camara en este navegador.'
  }

  const message = error.message.toLowerCase()
  if (message.includes('permission') || message.includes('denied') || message.includes('notallowed')) {
    return 'Permiso de camara denegado. Puedes seguir usando el ingreso manual.'
  }

  if (message.includes('notfound') || message.includes('device') || message.includes('camera')) {
    return 'No encontramos una camara disponible en este equipo.'
  }

  if (message.includes('notreadable') || message.includes('trackstart')) {
    return 'La camara esta siendo usada por otra aplicacion o no pudo iniciarse.'
  }

  if (message.includes('secure')) {
    return 'La camara requiere un contexto seguro (https o localhost).'
  }

  return 'No pudimos activar la camara en este navegador.'
}

export function BarcodeCameraScanner({
  onDetected,
  className = '',
  scanCooldownMs = 1800,
}: BarcodeCameraScannerProps) {
  const videoRef = useRef<HTMLVideoElement | null>(null)
  const controlsRef = useRef<{ stop: () => void } | null>(null)
  const readerRef = useRef<BrowserMultiFormatReader | null>(null)
  const resetFlashTimeoutRef = useRef<number | null>(null)
  const audioContextRef = useRef<AudioContext | null>(null)
  const lastDetectedRef = useRef<{ code: string; time: number } | null>(null)
  const detectionLockRef = useRef(false)
  const isMountedRef = useRef(true)
  const [isEnabled, setIsEnabled] = useState(false)
  const [scannerState, setScannerState] = useState<ScannerState>('idle')
  const [cameraMessage, setCameraMessage] = useState(
    'Camara apagada. El ingreso manual sigue siendo la opcion principal.',
  )

  const isCameraSupported =
    typeof window !== 'undefined' &&
    typeof navigator !== 'undefined' &&
    !!navigator.mediaDevices?.getUserMedia

  const readerHints = useMemo(() => buildReaderHints(), [])

  const stopScanner = useCallback(() => {
    controlsRef.current?.stop()
    controlsRef.current = null
    readerRef.current = null

    if (videoRef.current) {
      videoRef.current.pause()
      videoRef.current.srcObject = null
    }

    detectionLockRef.current = false
  }, [])

  const playSuccessBeep = useCallback(async () => {
    if (typeof window === 'undefined') return

    const AudioContextCtor = window.AudioContext
    if (!AudioContextCtor) return

    const audioContext =
      audioContextRef.current ??
      new AudioContextCtor({
        latencyHint: 'interactive',
      })

    audioContextRef.current = audioContext

    if (audioContext.state === 'suspended') {
      await audioContext.resume()
    }

    const oscillator = audioContext.createOscillator()
    const gainNode = audioContext.createGain()
    const now = audioContext.currentTime

    oscillator.type = 'sine'
    oscillator.frequency.setValueAtTime(1240, now)
    gainNode.gain.setValueAtTime(0.0001, now)
    gainNode.gain.exponentialRampToValueAtTime(0.18, now + 0.01)
    gainNode.gain.exponentialRampToValueAtTime(0.0001, now + 0.11)

    oscillator.connect(gainNode)
    gainNode.connect(audioContext.destination)
    oscillator.start(now)
    oscillator.stop(now + 0.12)
  }, [])

  const flashSuccessLine = useCallback(() => {
    if (resetFlashTimeoutRef.current) {
      window.clearTimeout(resetFlashTimeoutRef.current)
    }

    setScannerState('success')
    setCameraMessage('Codigo detectado. Puedes seguir escaneando.')

    resetFlashTimeoutRef.current = window.setTimeout(() => {
      if (!isMountedRef.current || !isEnabled) return
      setScannerState('active')
      setCameraMessage('Camara activa. Enfoca el codigo dentro de la guia.')
    }, 700)
  }, [isEnabled])

  const handleScanResult = useCallback(async (rawCode: string) => {
    const code = rawCode.trim()
    if (!code || detectionLockRef.current) return

    const now = Date.now()
    const lastDetected = lastDetectedRef.current
    if (lastDetected && lastDetected.code === code && now - lastDetected.time < scanCooldownMs) {
      return
    }

    detectionLockRef.current = true

    try {
      const accepted = await onDetected(code)
      if (!accepted) {
        return
      }

      lastDetectedRef.current = { code, time: now }
      await playSuccessBeep()
      flashSuccessLine()
    } finally {
      window.setTimeout(() => {
        detectionLockRef.current = false
      }, scanCooldownMs)
    }
  }, [flashSuccessLine, onDetected, playSuccessBeep, scanCooldownMs])

  useEffect(() => {
    isMountedRef.current = true
    return () => {
      isMountedRef.current = false
    }
  }, [])

  useEffect(() => {
    if (!isEnabled) {
      stopScanner()
      setScannerState('idle')
      setCameraMessage('Camara apagada. El ingreso manual sigue siendo la opcion principal.')
      return
    }

    if (!isCameraSupported) {
      setScannerState('error')
      setCameraMessage('Este navegador no soporta acceso a camara. Usa el ingreso manual.')
      setIsEnabled(false)
      return
    }

    const startScanner = async () => {
      if (!videoRef.current) return

      setScannerState('starting')
      setCameraMessage('Solicitando permiso y preparando la camara...')

      try {
        const reader = new BrowserMultiFormatReader(readerHints)
        readerRef.current = reader

        controlsRef.current = await reader.decodeFromConstraints(
          {
            audio: false,
            video: {
              facingMode: { ideal: 'environment' },
              width: { ideal: 640 },
              height: { ideal: 360 },
            },
          },
          videoRef.current,
          (result) => {
            if (!result) return
            void handleScanResult(result.getText())
          },
        )

        if (!isMountedRef.current) {
          stopScanner()
          return
        }

        setScannerState('active')
        setCameraMessage('Camara activa. Enfoca el codigo dentro de la guia.')
      } catch (error) {
        console.error('[BarcodeCameraScanner] No se pudo iniciar la camara.', error)

        if (!isMountedRef.current) return

        stopScanner()
        setScannerState('error')
        setCameraMessage(normalizeCameraError(error))
      }
    }

    void startScanner()

    return () => {
      stopScanner()
    }
  }, [handleScanResult, isCameraSupported, isEnabled, readerHints, stopScanner])

  useEffect(() => {
    return () => {
      stopScanner()

      if (resetFlashTimeoutRef.current) {
        window.clearTimeout(resetFlashTimeoutRef.current)
      }

      void audioContextRef.current?.close()
      audioContextRef.current = null
    }
  }, [stopScanner])

  const cameraStatusLabel =
    scannerState === 'success'
      ? 'Camara: lectura correcta'
      : scannerState === 'active'
        ? 'Camara: activa'
        : scannerState === 'starting'
          ? 'Camara: iniciando'
          : scannerState === 'error'
            ? 'Camara: no disponible'
            : 'Camara: apagada'

  return (
    <section className={`barcode-camera ${className}`.trim()}>
      <div className="barcode-camera__header">
        <div className="barcode-camera__copy">
          <strong>Camara web opcional</strong>
          <p>Activa la camara solo si quieres escanear desde el navegador.</p>
        </div>
        <Button
          type="button"
          variant={isEnabled ? 'secondary' : 'primary'}
          onClick={() => setIsEnabled((current) => !current)}
          disabled={!isCameraSupported && !isEnabled}
        >
          {isEnabled ? 'Desactivar camara' : 'Activar camara'}
        </Button>
      </div>

      <div className="barcode-camera__status">
        <span className="status-chip status-chip--outline">{cameraStatusLabel}</span>
        <span className="barcode-camera__message">{cameraMessage}</span>
      </div>

      {isEnabled ? (
        <div className={`barcode-camera__viewport barcode-camera__viewport--${scannerState}`}>
          <video
            ref={videoRef}
            className="barcode-camera__video"
            autoPlay
            muted
            playsInline
          />
          <div className="barcode-camera__overlay" aria-hidden="true">
            <div className="barcode-camera__shade" />
            <div className="barcode-camera__focus-row">
              <div className="barcode-camera__shade barcode-camera__shade--side" />
              <div className="barcode-camera__focus-window">
                <div className="barcode-camera__focus-line" />
              </div>
              <div className="barcode-camera__shade barcode-camera__shade--side" />
            </div>
            <div className="barcode-camera__shade" />
          </div>
        </div>
      ) : null}
    </section>
  )
}
