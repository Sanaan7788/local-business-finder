import { Panel } from '../../../components/ui/Panel'
import type { MenuSection } from '../../../types/business'

export function MenuList({ menu }: { menu: MenuSection[] }) {
  const itemCount = menu.reduce((n, s) => n + s.items.length, 0)
  return (
    <div>
      <p className="mb-2 text-xs font-medium text-fg-muted">Menu ({itemCount} items)</p>
      <div className="space-y-3">
        {menu.map((section, si) => (
          <Panel key={si} tone="neutral" title={section.section} bodyClassName="divide-y p-0">
            {section.items.map((item, ii) => (
              <div key={ii} className="flex items-start justify-between gap-3 px-3 py-2">
                <div className="min-w-0">
                  <p className="text-sm font-medium text-fg">{item.name}</p>
                  {item.description && <p className="mt-0.5 text-xs text-fg-subtle">{item.description}</p>}
                </div>
                {item.price && <p className="shrink-0 text-sm font-medium text-fg-muted">{item.price}</p>}
              </div>
            ))}
          </Panel>
        ))}
      </div>
    </div>
  )
}
