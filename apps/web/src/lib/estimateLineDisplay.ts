/** Split catalog-built line description into title + variable bullets (` · ` separated). */
export function splitDescriptionTitleAndBullets(description: string): {
  title: string
  bullets: string[]
} {
  const parts = description
    .split(' · ')
    .map((s) => s.trim())
    .filter(Boolean)
  if (parts.length === 0) return { title: '', bullets: [] }
  return { title: parts[0]!, bullets: parts.slice(1) }
}
