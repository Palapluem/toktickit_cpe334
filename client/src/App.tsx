function App() {
  return (
    <div className="container py-5">
      <nav className="navbar navbar-dark bg-dark rounded px-3 mb-4">
        <span className="navbar-brand mb-0 h1">TokTickIT</span>
      </nav>

      <div className="card shadow-sm">
        <div className="card-body">
          <h1 className="card-title">Project Foundation</h1>
          <p className="card-text text-muted">
            React + TypeScript + Vite + Bootstrap frontend scaffold for Lab 1
            (Issue 1). The full IT Service Desk page ships in later Issues.
          </p>
          <button type="button" className="btn btn-primary" disabled>
            Check System (coming in Issue 2)
          </button>
        </div>
      </div>
    </div>
  )
}

export default App
