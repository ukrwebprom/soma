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
          <strong>Розділ готується</strong>

          <span>
            Тут незабаром з’явиться робочий інтерфейс.
          </span>
        </div>
      </main>
    </div>
  );
}

export default PlaceholderPage;
