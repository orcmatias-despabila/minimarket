import { useEffect, useRef, useState } from 'react'
import { Button } from '../../../components/ui/Button'

export interface ScanDetection {
  code: string
  format: string
}

interface BarcodeScannerProps {
  onDetected: (detection: ScanDetection) => void
}

declare global {
  interface Window {
    BarcodeDetector?: {
      new (options?: { formats?: string[] }): {
        detect: (
          source: ImageBitmapSource,
        ) => Promise<Array<{ rawValue?: string; format?: string }>>
      }
      getSupportedFormats?: () => Promise<string[]>
    }
  }
}

export function BarcodeScanner({ onDetected }: BarcodeScannerProps) {
  const videoRef = useRef<HTMLVideoElement | null>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const intervalRef = useRef<number | null>(null)
  const isDetectingRef = useRef(false)
  const lastAcceptedRef = useRef<{ code: string; timestamp: number } | null>(null)
  const audioContextRef = useRef<AudioContext | null>(null)
  const [isActive, setIsActive] = useState(false)
  const [lastScan, setLastScan] = useState<ScanDetection | null>(null)
  const [statusTone, setStatusTone] = useState<'neutral' | 'success' | 'warning'>(
    'neutral',
  )
  const [message, setMessage] = useState(
    'Activa la camara para escanear codigos de barras. Se prioriza barra antes que QR.',
  )

  useEffect(() => {
    return () => {
      if (intervalRef.current) {
        window.clearInterval(intervalRef.current)
      }

      streamRef.current?.getTracks().forEach((track) => track.stop())
      audioContextRef.current?.close()
    }
  }, [])

  const playBeep = async (tone: 'success' | 'warning') => {
    try {
      const AudioCtx = window.AudioContext
      if (!AudioCtx) return

      const context = audioContextRef.current ?? new AudioCtx()
      audioContextRef.current = context

      if (context.state === 'suspended') {
        await context.resume()
      }

      const oscillator = context.createOscillator()
      const gainNode = context.createGain()
      oscillator.type = 'sine'
      oscillator.frequency.value = tone === 'success' ? 880 : 320
      gainNode.gain.value = 0.04
      oscillator.connect(gainNode)
      gainNode.connect(context.destination)
      oscillator.start()
      oscillator.stop(context.currentTime + 0.12)
    } catch {
      // Si el navegador bloquea audio, el escaner sigue funcionando.
    }
  }

  const prioritizeResult = (
    codes: Array<{ rawValue?: string; format?: string }>,
  ) => {
    const priorityOrder = [
      'ean_13',
      'ean_8',
      'upc_a',
      'upc_e',
      'code_128',
      'code_39',
      'codabar',
      'qr_code',
    ]

    return [...codes]
      .filter((code) => code.rawValue)
      .sort((left, right) => {
        const leftPriority = priorityOrder.indexOf(left.format ?? '')
        const rightPriority = priorityOrder.indexOf(right.format ?? '')
        const normalizedLeft = leftPriority === -1 ? priorityOrder.length : leftPriority
        const normalizedRight =
          rightPriority === -1 ? priorityOrder.length : rightPriority
        return normalizedLeft - normalizedRight
      })[0]
  }

  const acceptDetection = async (detection: ScanDetection) => {
    const now = Date.now()
    const lastAccepted = lastAcceptedRef.current

    if (
      lastAccepted &&
      lastAccepted.code === detection.code &&
      now - lastAccepted.timestamp < 1800
    ) {
      return
    }

    lastAcceptedRef.current = {
      code: detection.code,
      timestamp: now,
    }

    setLastScan(detection)
    setStatusTone('success')
    setMessage(`Lectura detectada: ${detection.code} (${detection.format}).`)
    await playBeep('success')
    onDetected(detection)
  }

  const stopScanner = () => {
    if (intervalRef.current) {
      window.clearInterval(intervalRef.current)
      intervalRef.current = null
    }

    streamRef.current?.getTracks().forEach((track) => track.stop())
    streamRef.current = null
    setIsActive(false)
    setStatusTone('neutral')
    setMessage('Camara detenida.')
  }

  const startScanner = async () => {
    if (!window.BarcodeDetector) {
      setStatusTone('warning')
      setMessage('Tu navegador no soporta BarcodeDetector. Usa la busqueda manual.')
      await playBeep('warning')
      return
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment' },
      })

      streamRef.current = stream

      if (videoRef.current) {
        videoRef.current.srcObject = stream
        await videoRef.current.play()
      }

      const supportedFormats =
        (await window.BarcodeDetector.getSupportedFormats?.()) ?? []
      const preferredFormats = [
        'ean_13',
        'ean_8',
        'upc_a',
        'upc_e',
        'code_128',
        'code_39',
        'codabar',
        'qr_code',
      ]

      const detector = new window.BarcodeDetector({
        formats: preferredFormats.filter((format) =>
          supportedFormats.length ? supportedFormats.includes(format) : true,
        ),
      })

      intervalRef.current = window.setInterval(async () => {
        if (!videoRef.current || isDetectingRef.current) return

        isDetectingRef.current = true

        try {
          const codes = await detector.detect(videoRef.current)
          const prioritized = prioritizeResult(codes)

          if (prioritized?.rawValue) {
            await acceptDetection({
              code: prioritized.rawValue,
              format: prioritized.format ?? 'unknown',
            })
          }
        } catch {
          setStatusTone('warning')
          setMessage('No se pudo leer el codigo en este momento.')
        } finally {
          isDetectingRef.current = false
        }
      }, 350)

      setIsActive(true)
      setStatusTone('neutral')
      setMessage('Escaner activo. Apunta la camara al codigo de barras.')
    } catch {
      setStatusTone('warning')
      setMessage('No se pudo acceder a la camara.')
      await playBeep('warning')
    }
  }

  return (
    <section className="surface-card sales-scanner">
      <div className="inventory-section__header">
        <div>
          <p className="section-kicker">Escaneo por camara</p>
          <h3>Codigo de barras</h3>
          <p>{message}</p>
        </div>
      </div>

      <div className={`scanner-frame scanner-frame--${statusTone}`}>
        <video ref={videoRef} className="scanner-video" muted playsInline />
        <div className="scanner-overlay">
          <span className="scanner-overlay__label">Zona de lectura prioritaria</span>
        </div>
      </div>

      {lastScan ? (
        <div className="scanner-status">
          <strong>Ultima lectura</strong>
          <span>
            {lastScan.code} - {lastScan.format}
          </span>
        </div>
      ) : null}

      <div className="products-form__actions">
        {!isActive ? (
          <Button onClick={startScanner}>Activar camara</Button>
        ) : (
          <Button variant="secondary" onClick={stopScanner}>
            Detener camara
          </Button>
        )}
      </div>
    </section>
  )
}
