export function ProcessingScreen({ label }: { label: string }) {
  return (
    <section className="stack" aria-labelledby="processing-title">
      <h2 id="processing-title">Processing</h2>
      <p role="status">{label}</p>
      <p>This stays on your phone.</p>
    </section>
  )
}
