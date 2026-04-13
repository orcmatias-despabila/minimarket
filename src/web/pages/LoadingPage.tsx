export function LoadingPage({ message }: { message: string }) {
  return (
    <main className="auth-layout auth-layout--centered">
      <section className="surface-card auth-card auth-card--compact">
        <div className="auth-loader" />
        <h2>Cargando</h2>
        <p>{message}</p>
      </section>
    </main>
  )
}
