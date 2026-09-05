// Build-time mode flags. Vite inlines import.meta.env.MODE, so IS_STATIC folds to
// a constant and the data source that is not selected is tree-shaken from each bundle.

/** True in the GitHub Pages build (`vite build --mode static`): no backend, data comes from public/data. */
export const IS_STATIC = import.meta.env.MODE === 'static'

/** `node` in the live app, `undefined` in the static build — for `action` props that only make sense with a backend. */
export function serverOnly<T>(node: T): T | undefined {
  return IS_STATIC ? undefined : node
}
