import type { LoadedDocument } from '../load/types.ts'
import { PageCanvas } from './PageCanvas.tsx'

type ReviewScreenProps = {
  document: LoadedDocument | null
}

export function ReviewScreen({ document }: ReviewScreenProps) {
  if (!document || document.pages.length === 0) {
    return (
      <section className="stack">
        <h2>Review</h2>
        <p>
          No image is loaded. Black boxes will cover identifiers here. You confirm the page before
          anything is shared. Images and text stay in memory only and are not saved on this phone.
        </p>
      </section>
    )
  }

  const count = document.pages.length
  return (
    <section className="stack">
      <h2>Review</h2>
      <p>{count === 1 ? '1 page' : `${count} pages`} loaded on this phone. Nothing is saved.</p>
      <ol className="pages">
        {document.pages.map((page) => (
          <li key={page.index} className="page-frame">
            <PageCanvas bitmap={page.display} label={`Page ${page.index + 1}`} />
          </li>
        ))}
      </ol>
    </section>
  )
}
