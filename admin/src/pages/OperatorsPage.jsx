import {
  useCallback,
  useEffect,
  useState,
} from "react";

import "./OperatorsPage.css";

function formatDate(value) {
  if (!value) {
    return "—";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "—";
  }

  return new Intl.DateTimeFormat(
    "uk-UA",
    {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    },
  ).format(date);
}

function OperatorsPage() {
  const [operators, setOperators] =
    useState([]);

  const [isLoading, setIsLoading] =
    useState(true);

  const [error, setError] =
    useState("");

  const loadOperators = useCallback(
    async () => {
      setIsLoading(true);
      setError("");

      try {
        const response = await fetch(
          "/api/admin/operators",
        );

        const data = await response
          .json()
          .catch(() => null);

        if (!response.ok) {
          throw new Error(
            data?.message ??
              `Помилка сервера: ${response.status}`,
          );
        }

        setOperators(
          Array.isArray(data?.operators)
            ? data.operators
            : [],
        );
      } catch (requestError) {
        console.error(requestError);

        setError(
          requestError instanceof Error
            ? requestError.message
            : "Не вдалося завантажити операторів",
        );
      } finally {
        setIsLoading(false);
      }
    },
    [],
  );

  useEffect(() => {
    loadOperators();
  }, [loadOperators]);

  return (
    <main className="operators-page">
      <header className="operators-page-header">
        <div>
          <h1>Оператори</h1>

          <p>
            Співробітники, які можуть
            перевіряти та погашати
            сертифікати.
          </p>
        </div>

        <button
          className="operators-create-button"
          type="button"
          disabled
          title="Підключимо створення наступним кроком"
        >
          + Додати оператора
        </button>
      </header>

      {isLoading && (
        <section className="operators-state-card">
          <span className="operators-loader" />

          <strong>
            Завантажуємо операторів…
          </strong>
        </section>
      )}

      {!isLoading && error && (
        <section className="operators-state-card operators-error-card">
          <strong>
            Не вдалося завантажити список
          </strong>

          <p>{error}</p>

          <button
            type="button"
            onClick={loadOperators}
          >
            Спробувати ще раз
          </button>
        </section>
      )}

      {!isLoading &&
        !error &&
        operators.length === 0 && (
          <section className="operators-empty-card">
            <div className="operators-empty-icon">
              👤
            </div>

            <h2>
              Операторів поки немає
            </h2>

            <p>
              Тут з’являться співробітники,
              які зможуть погашати
              сертифікати за допомогою
              особистого PIN-коду.
            </p>
          </section>
        )}

      {!isLoading &&
        !error &&
        operators.length > 0 && (
          <section className="operators-table-card">
            <div className="operators-table-scroll">
              <table className="operators-table">
                <thead>
                  <tr>
                    <th>Ім’я</th>
                    <th>Статус</th>
                    <th>Створено</th>
                    <th>Погашень</th>
                    <th aria-label="Дії" />
                  </tr>
                </thead>

                <tbody>
                  {operators.map(
                    (operator) => (
                      <tr key={operator.id}>
                        <td>
                          <div className="operator-person">
                            <div className="operator-avatar">
                              {operator.name
                                ?.trim()
                                .charAt(0)
                                .toUpperCase() ||
                                "О"}
                            </div>

                            <div>
                              <strong>
                                {operator.name}
                              </strong>

                              <span>
                                Оператор
                              </span>
                            </div>
                          </div>
                        </td>

                        <td>
                          <span
                            className={
                              operator.isActive
                                ? "operator-status operator-status-active"
                                : "operator-status operator-status-inactive"
                            }
                          >
                            {operator.isActive
                              ? "Активний"
                              : "Неактивний"}
                          </span>
                        </td>

                        <td>
                          {formatDate(
                            operator.createdAt,
                          )}
                        </td>

                        <td>
                          <strong className="operator-redemptions-count">
                            {operator
                              .redeemedCertificatesCount ??
                              0}
                          </strong>
                        </td>

                        <td className="operator-actions-cell">
                          <button
                            className="operator-menu-button"
                            type="button"
                            disabled
                            aria-label={
                              `Дії оператора ${operator.name}`
                            }
                            title="Дії підключимо наступним кроком"
                          >
                            ⋮
                          </button>
                        </td>
                      </tr>
                    ),
                  )}
                </tbody>
              </table>
            </div>

            <footer className="operators-table-footer">
              Всього операторів:{" "}
              <strong>
                {operators.length}
              </strong>
            </footer>
          </section>
        )}
    </main>
  );
}

export default OperatorsPage;