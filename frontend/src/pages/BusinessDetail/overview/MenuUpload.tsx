import { useRef, useState } from 'react'
import { useMenuFromImages } from '../../../hooks/useBusinesses'
import { cn } from '../../../lib/cn'
import { getApiErrorMessage } from '../../../lib/errors'
import { TONE } from '../../../lib/tones'
import { Button } from '../../../components/ui/Button'

export function MenuUpload({ businessId }: { businessId: string }) {
  const menuFromImages = useMenuFromImages()
  const inputRef = useRef<HTMLInputElement>(null)
  const [files, setFiles] = useState<File[]>([])

  const extract = async () => {
    if (files.length === 0) return
    await menuFromImages.mutateAsync({ id: businessId, files })
    setFiles([])
    if (inputRef.current) inputRef.current.value = ''
  }

  return (
    <div className="rounded-xl border border-dashed border-line-strong p-4">
      <p className="mb-1 text-xs font-medium text-fg-muted">Extract menu from images</p>
      <p className="mb-3 text-xs text-fg-subtle">
        Upload photos of a physical menu — Claude reads and extracts every item. Up to 10 images.
      </p>
      <div className="flex flex-wrap items-center gap-3">
        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          multiple
          aria-label="Menu images"
          onChange={e => setFiles(Array.from(e.target.files ?? []))}
          className="cursor-pointer text-xs text-fg-muted file:mr-2 file:rounded-lg file:border file:border-line-strong file:bg-surface file:px-3 file:py-1 file:text-xs file:text-fg-muted hover:file:bg-surface-2"
        />
        {files.length > 0 && (
          <Button variant="primary" size="xs" loading={menuFromImages.isPending} onClick={() => void extract()}>
            {menuFromImages.isPending ? 'Extracting…' : `Extract from ${files.length} image${files.length > 1 ? 's' : ''}`}
          </Button>
        )}
        {menuFromImages.isSuccess && (
          <span className={cn('text-xs', TONE.success.text)}>
            ✓ {menuFromImages.data.itemsExtracted} items extracted across {menuFromImages.data.sectionsExtracted} sections
          </span>
        )}
        {menuFromImages.isError && (
          <span className={cn('text-xs', TONE.danger.text)}>{getApiErrorMessage(menuFromImages.error, 'Extraction failed')}</span>
        )}
      </div>
    </div>
  )
}
