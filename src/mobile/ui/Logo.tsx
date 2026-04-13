import { Image, View } from 'react-native'

interface LogoProps {
  mode?: 'light' | 'dark'
  size?: 'sm' | 'md'
}

export function Logo({ size = 'md' }: LogoProps) {
  const width = size === 'md' ? 170 : 128
  const height = size === 'md' ? 54 : 40
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const logoAsset = require('../../../logo/logo.png')

  return (
    <View>
      <Image source={logoAsset} style={{ width, height }} resizeMode="contain" />
    </View>
  )
}
