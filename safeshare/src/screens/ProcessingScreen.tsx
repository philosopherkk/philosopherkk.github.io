export function ProcessingScreen({ label }: { label: string }) {
  return (
    <section className="stack">
      <h2>Processing</h2>
      <p role="status">{label}</p>
      <p>This stays on your phone.</p>
    </section>
  )
}
