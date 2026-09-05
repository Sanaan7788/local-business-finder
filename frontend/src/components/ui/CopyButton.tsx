import { useCopyToClipboard } from '../../hooks/useCopyToClipboard'
import { Button, type ButtonProps } from './Button'

export function CopyButton({
  text,
  label = 'Copy',
  copiedLabel = 'Copied!',
  variant = 'link',
  size = 'xs',
  ...rest
}: { text: string; label?: string; copiedLabel?: string } & Omit<ButtonProps, 'onClick' | 'children'>) {
  const { copied, copy } = useCopyToClipboard()
  return (
    <Button variant={variant} size={size} onClick={() => void copy(text)} {...rest}>
      {copied ? copiedLabel : label}
    </Button>
  )
}
