import { useAudioPlayer, setAudioModeAsync } from 'expo-audio'
import { CameraView } from 'expo-camera'
import { useEffect, useMemo, useRef, useState } from 'react'
import { StyleSheet, Text, Vibration, View } from 'react-native'
import barcodeBeepSound from '../../../assets/sounds/barcode-beep.wav'
import { appFonts, mobileTheme } from '../theme'

const primaryBarcodeTypes = ['ean13', 'ean8', 'upc_a', 'upc_e'] as const
const secondaryBarcodeTypes = ['code128', 'code39', 'codabar', 'qr'] as const

export const supportedBarcodeTypes = [
  ...primaryBarcodeTypes,
  ...secondaryBarcodeTypes,
] as const

interface BarcodeScannerProps {
  onDetected: (barcode: string) => void | Promise<void>
  height?: number
  hint?: string
  paused?: boolean
  scanCooldownMs?: number
}

export function BarcodeScanner({
  onDetected,
  height = 240,
  hint = 'Enfoca el codigo dentro del recuadro',
  paused = false,
  scanCooldownMs = 1000,
}: BarcodeScannerProps) {
  const lastScanRef = useRef<{ code: string; time: number } | null>(null)
  const isDetectionLockedRef = useRef(false)
  const [isDetected, setIsDetected] = useState(false)
  const player = useAudioPlayer(barcodeBeepSound)

  const barcodeTypes = useMemo(() => [...supportedBarcodeTypes] as never, [])

  useEffect(() => {
    player.volume = 0.45
    void setAudioModeAsync({
      playsInSilentMode: true,
      interruptionMode: 'mixWithOthers',
      shouldPlayInBackground: false,
    })
  }, [player])

  useEffect(() => {
    if (!isDetected) return

    const timeoutId = setTimeout(() => {
      setIsDetected(false)
    }, 900)

    return () => clearTimeout(timeoutId)
  }, [isDetected])

  const triggerDetectionFeedback = async () => {
    Vibration.vibrate(45)

    try {
      player.seekTo(0)
      player.play()
    } catch {
      // Audio feedback is best-effort; scanning should still continue.
    }
  }

  const handleBarcodeScanned = async ({ data }: { data: string }) => {
    if (paused || !data || isDetectionLockedRef.current) return

    const now = Date.now()
    const lastScan = lastScanRef.current
    if (lastScan && lastScan.code === data && now - lastScan.time < scanCooldownMs) {
      return
    }

    isDetectionLockedRef.current = true
    lastScanRef.current = { code: data, time: now }
    setIsDetected(true)

    try {
      await triggerDetectionFeedback()
      await onDetected(data)
    } finally {
      setTimeout(() => {
        isDetectionLockedRef.current = false
      }, scanCooldownMs)
    }
  }

  return (
    <View style={[styles.frame, { height }]}>
      <CameraView
        style={styles.camera}
        facing="back"
        onBarcodeScanned={handleBarcodeScanned}
        barcodeScannerSettings={{ barcodeTypes }}
      />

      <View pointerEvents="none" style={styles.overlay}>
        <View style={styles.topShade} />

        <View style={styles.middleRow}>
          <View style={styles.sideShade} />
          <View style={styles.scanWindow}>
            <View
              style={[
                styles.centerLine,
                isDetected ? styles.centerLineDetected : null,
              ]}
            />
          </View>
          <View style={styles.sideShade} />
        </View>

        <View style={styles.bottomShade} />
        <Text style={styles.hint}>{hint}</Text>
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  frame: {
    overflow: 'hidden',
    borderRadius: mobileTheme.radius.lg,
    backgroundColor: mobileTheme.colors.dark,
  },
  camera: {
    flex: 1,
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
  },
  topShade: {
    flex: 1,
    backgroundColor: 'rgba(15,23,42,0.38)',
  },
  middleRow: {
    flexDirection: 'row',
    height: 116,
  },
  sideShade: {
    flex: 1,
    backgroundColor: 'rgba(15,23,42,0.38)',
  },
  bottomShade: {
    flex: 1,
    backgroundColor: 'rgba(15,23,42,0.38)',
  },
  scanWindow: {
    width: '78%',
    borderRadius: mobileTheme.radius.lg,
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.92)',
    backgroundColor: 'rgba(255,255,255,0.04)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  centerLine: {
    width: '82%',
    height: 3,
    borderRadius: mobileTheme.radius.full,
    backgroundColor: '#EF4444',
    opacity: 0.98,
  },
  centerLineDetected: {
    backgroundColor: '#22C55E',
  },
  hint: {
    position: 'absolute',
    left: 12,
    bottom: 12,
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(17,24,39,0.78)',
    color: mobileTheme.colors.white,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: mobileTheme.radius.full,
    ...appFonts.semibold,
  },
})
