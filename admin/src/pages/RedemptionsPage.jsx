import {
  useCallback,
  useEffect,
  useState,
} from "react";

import "./RedemptionsPage.css";
import { apiUrl } from "../lib/api";

const PAGE_LIMIT = 30;

function toLocalInputValue(date) {
  const timezoneOffset =
    date.getTimezoneOffset() * 60_000;

  return new Date(date.getTime() - timezoneOffset)
    .toISOString()
    .slice(0, 16);
}

function toIsoValue(value, endOfMinute = false) {
  if (!value) {
    return "";
  }

  const date = new Date(value);

  if (endOfMinute) {
    date.setSeconds(59, 999);
  }

  return date.toISOString();
}

function formatDateTime(value) {
  if (!value) {
    return "—";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "—";
  }

  return new Intl.DateTimeFormat("uk-UA", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

function shortenCode(code) {
  if (!code || code.length <= 14) {
    return code || "—";
  }

  return `${code.slice(0, 12)}…`;
}

function RedemptionsPage() {
  const [redemptions, setRedemptions] =
    useState([]);
  const [pagination, setPagination] =
    useState({
      page: 1,
      limit: PAGE_LIMIT,
      total: 0,
      totalPages: 0,
    });
  const [page, setPage] = useState(1);
  const [isLoading, setIsLoading] =
    useState(true);
  const [error, setError] = useState("");
  const [fromValue, setFromValue] =
    useState("");
  const [toValue, setToValue] =
    useState("");
  const [appliedRange, setAppliedRange] =
    useState({ from: "", to: "" });
  const [filterError, setFilterError] =
    useState("");

  const loadRedemptions = useCallback(
    async (signal) => {
      setIsLoading(true);
      setError("");

      try {
        const params = new URLSearchParams({
          page: String(page),
          limit: String(PAGE_LIMIT),
        });

        if (appliedRange.from) {
          params.set(
            "from",
            toIsoValue(appliedRange.from),
          );
        }

        if (appliedRange.to) {
          params.set(
            "to",
            toIsoValue(appliedRange.to, true),
          );
        }
        const response = await fetch(
          apiUrl(`/api/admin/redemptions?${params}`),
          { signal },
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

        setRedemptions(
          Array.isArray(data?.redemptions)
            ? data.redemptions
            : [],
        );
        setPagination(
          data?.pagination ?? {
            page,
            limit: PAGE_LIMIT,
            total: 0,
            totalPages: 0,
          },
        );
      } catch (requestError) {
        if (requestError.name === "AbortError") {
          return;
        }

        console.error(requestError);
        setError(
          requestError instanceof Error
            ? requestError.message
            : "Не вдалося завантажити журнал",
        );
      } finally {
        if (!signal?.aborted) {
          setIsLoading(false);
        }
      }
    },
    [appliedRange, page],
  );

  useEffect(() => {
    const controller = new AbortController();
    loadRedemptions(controller.signal);

    return () => controller.abort();
  }, [loadRedemptions]);

  const applyRange = (from, to) => {
    setFromValue(from);
    setToValue(to);
    setFilterError("");
    setPage(1);
    setAppliedRange({ from, to });
  };

  const applyPreset = (preset) => {
    const now = new Date();
    const from = new Date(now);
    const to = new Date(now);

    if (preset === "today") {
      from.setHours(0, 0, 0, 0);
    }

    if (preset === "yesterday") {
      from.setDate(from.getDate() - 1);
      from.setHours(0, 0, 0, 0);
      to.setDate(to.getDate() - 1);
      to.setHours(23, 59, 0, 0);
    }

    if (preset === "last7days") {
      from.setDate(from.getDate() - 6);
      from.setHours(0, 0, 0, 0);
    }

    if (preset === "month") {
      from.setDate(1);
      from.setHours(0, 0, 0, 0);
    }

    applyRange(
      toLocalInputValue(from),
      toLocalInputValue(to),
    );
  };

  const handleFilterSubmit = (event) => {
    event.preventDefault();

    if (
      fromValue &&
      toValue &&
      fromValue > toValue
    ) {
      setFilterError(
        "Початок періоду не може бути пізніше завершення",
      );
      return;
    }

    applyRange(fromValue, toValue);
  };

  return (
    <div className="page">
      <header className="page-header">
        <div>
          <h1>Журнал погашень</h1>

          <p>
            Історія використаних сертифікатів,
            операторів та часу погашення.
          </p>
        </div>
      </header>

      <main className="page-content">
        <form
          className="redemptions-filters"
          onSubmit={handleFilterSubmit}
        >
          <div className="redemptions-presets">
            <span>Швидкий період</span>

            <div>
              <button
                type="button"
                onClick={() => applyPreset("today")}
              >
                Сьогодні
              </button>
              <button
                type="button"
                onClick={() =>
                  applyPreset("yesterday")
                }
              >
                Вчора
              </button>
              <button
                type="button"
                onClick={() =>
                  applyPreset("last7days")
                }
              >
                Останні 7 днів
              </button>
              <button
                type="button"
                onClick={() => applyPreset("month")}
              >
                Цей місяць
              </button>
            </div>
          </div>

          <div className="redemptions-range-fields">
            <label>
              <span>Від</span>
              <input
                type="datetime-local"
                value={fromValue}
                onChange={(event) => {
                  setFromValue(event.target.value);
                  setFilterError("");
                }}
              />
            </label>

            <label>
              <span>До</span>
              <input
                type="datetime-local"
                value={toValue}
                onChange={(event) => {
                  setToValue(event.target.value);
                  setFilterError("");
                }}
              />
            </label>

            <button
              className="redemptions-apply-button"
              type="submit"
              disabled={isLoading}
            >
              Застосувати
            </button>

            <button
              className="redemptions-reset-button"
              type="button"
              disabled={isLoading}
              onClick={() => applyRange("", "")}
            >
              Скинути
            </button>
          </div>

          {filterError && (
            <p
              className="redemptions-filter-error"
              role="alert"
            >
              {filterError}
            </p>
          )}
        </form>

        {isLoading && redemptions.length === 0 && (
          <section className="redemptions-state-card">
            <span className="redemptions-loader" />
            <strong>Завантажуємо журнал…</strong>
          </section>
        )}

        {!isLoading && error && (
          <section className="redemptions-state-card redemptions-error-card">
            <strong>
              Не вдалося завантажити журнал
            </strong>
            <p>{error}</p>
            <button
              type="button"
              onClick={() =>
                loadRedemptions()
              }
            >
              Спробувати ще раз
            </button>
          </section>
        )}

        {!isLoading &&
          !error &&
          redemptions.length === 0 && (
            <section className="redemptions-state-card">
              <div className="redemptions-empty-icon">
                ✓
              </div>
              <h2>Погашень поки немає</h2>
              <p>
                Тут з’являться сертифікати після
                першого успішного погашення.
              </p>
            </section>
          )}

        {!error && redemptions.length > 0 && (
          <section className="redemptions-table-card">
            <div className="redemptions-table-scroll">
              <table className="redemptions-table">
                <thead>
                  <tr>
                    <th>Дата і час</th>
                    <th>Сертифікат</th>
                    <th>Код</th>
                    <th>Оператор</th>
                  </tr>
                </thead>

                <tbody>
                  {redemptions.map((redemption) => (
                    <tr key={redemption.certificateId}>
                      <td>
                        {formatDateTime(
                          redemption.redeemedAt,
                        )}
                      </td>
                      <td>
                        <strong>
                          {redemption.title}
                        </strong>
                      </td>
                      <td>
                        <code title={redemption.code}>
                          {shortenCode(redemption.code)}
                        </code>
                      </td>
                      <td>
                        {redemption.operator?.name ?? "—"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <footer className="redemptions-table-footer">
              <span>
                Всього погашень: {pagination.total}
              </span>

              <div>
                <button
                  type="button"
                  disabled={
                    isLoading || page <= 1
                  }
                  onClick={() =>
                    setPage((current) => current - 1)
                  }
                >
                  Назад
                </button>

                <span>
                  {page} із {pagination.totalPages}
                </span>

                <button
                  type="button"
                  disabled={
                    isLoading ||
                    page >= pagination.totalPages
                  }
                  onClick={() =>
                    setPage((current) => current + 1)
                  }
                >
                  Далі
                </button>
              </div>
            </footer>
          </section>
        )}
      </main>
    </div>
  );
}

export default RedemptionsPage;
