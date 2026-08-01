function PlaceholderPage({
  title,
  description,
}) {
  return (
    <div className="page">
      <header className="page-header">
        <div>
          <h1>{title}</h1>
          <p>{description}</p>
        </div>
      </header>

      <main className="page-content">
        <div className="state-card">
          <strong>Раздел готовится</strong>

          <span>
            Здесь скоро появится рабочий интерфейс.
          </span>
        </div>
      </main>
    </div>
  );
}

export default PlaceholderPage;