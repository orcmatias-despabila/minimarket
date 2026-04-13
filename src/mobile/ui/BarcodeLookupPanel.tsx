import { MaterialCommunityIcons } from '@expo/vector-icons'
import { useCameraPermissions } from 'expo-camera'
import { useState } from 'react'
import { StyleSheet, Text, View } from 'react-native'
import type { TextInput } from 'react-native'
import { appFonts, mobileTheme } from '../theme'
import { AppButton } from './AppButton'
import { AppField } from './AppField'
import { BarcodeScanner } from './BarcodeScanner'

interface BarcodeLookupPanelProps {
  value: string
  onChange: (value: string) => void
  onLookup: (barcode: string) => Promise<void> | void
  busy?: boolean
  helperText?: string | null
  barcodeInputRef?: { current: TextInput | null }
}

export function BarcodeLookupPanel({
  value,
  onChange,
  onLookup,
  busy,
  helperText,
  barcodeInputRef,
}: BarcodeLookupPanelProps) {
  const [permission, requestPermission] = useCameraPermissions()
  const [isScannerOpen, setIsScannerOpen] = useState(false)
  const [scannerMessage, setScannerMessage] = useState<string | null>(null)

  const handleToggleScanner = async () => {
    if (!permission?.granted) {
      const result = await requestPermission()
      if (!result.granted) {
        setScannerMessage('Debes permitir la camara para escanear codigos.')
        return
      }
    }

    setScannerMessage(null)
    setIsScannerOpen((current) => !current)
  }

  const handleBarcodeScanned = async (data: string) => {
    onChange(data)
    await onLookup(data)
    setIsScannerOpen(false)
  }

  return (
    <View style={styles.wrapper}>
      <View style={styles.header}>
        <View>
          <Text style={styles.title}>Escanear o ingresar codigo</Text>
          <Text style={styles.subtitle}>
            Primero buscamos en Supabase y luego usamos Open Food Facts solo para autocompletar la ficha.
          </Text>
        </View>
        <AppButton
          label={isScannerOpen ? 'Cerrar' : 'Escanear'}
          onPress={handleToggleScanner}
          icon="barcode-scan"
          variant="secondary"
          disabled={busy}
        />
      </View>

      {isScannerOpen ? (
        <View style={styles.cameraFrame}>
          <BarcodeScanner onDetected={handleBarcodeScanned} height={230} paused={busy} />
        </View>
      ) : null}

      <AppField
        ref={barcodeInputRef}
        label="Codigo de barras"
        value={value}
        onChangeText={onChange}
        placeholder="Escanear o ingresar manualmente"
        icon="barcode"
        returnKeyType="search"
        onSubmitEditing={() => onLookup(value)}
      />

      <AppButton
        label={busy ? 'Buscando...' : 'Buscar codigo'}
        onPress={() => onLookup(value)}
        icon="magnify"
        disabled={busy || !value.trim()}
      />

      {helperText || scannerMessage ? (
        <View style={styles.messageRow}>
          <MaterialCommunityIcons
            name="information-outline"
            size={16}
            color={mobileTheme.colors.primaryDark}
          />
          <Text style={styles.messageText}>{helperText ?? scannerMessage}</Text>
        </View>
      ) : null}
    </View>
  )
}

const styles = StyleSheet.create({
  wrapper: {
    gap: mobileTheme.spacing.md,
    padding: mobileTheme.spacing.md,
    borderRadius: mobileTheme.radius.lg,
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#DCFCE7',
  },
  header: {
    gap: mobileTheme.spacing.sm,
  },
  title: {
    color: mobileTheme.colors.text,
    fontSize: mobileTheme.fontSizes.lg,
    ...appFonts.bold,
  },
  subtitle: {
    color: mobileTheme.colors.muted,
    lineHeight: 20,
    ...appFonts.regular,
  },
  cameraFrame: {
    height: 230,
    borderRadius: mobileTheme.radius.lg,
    overflow: 'hidden',
    backgroundColor: mobileTheme.colors.dark,
  },
  messageRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: mobileTheme.spacing.xs,
    backgroundColor: '#F8FAFC',
    borderRadius: mobileTheme.radius.md,
    borderWidth: 1,
    borderColor: mobileTheme.colors.border,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  messageText: {
    flex: 1,
    color: mobileTheme.colors.text,
    ...appFonts.regular,
  },
})
