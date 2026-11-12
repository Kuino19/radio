import { BrandLogo } from './BrandLogo'

export function BrandWordmark({
  className = '',
  size = 'md',
  withDot = true,
}: {
  className?: string
  size?: 'sm' | 'md' | 'lg' | 'xl'
  withDot?: boolean
}) {
  return <BrandLogo className={className} size={size} variant="full" />
}
