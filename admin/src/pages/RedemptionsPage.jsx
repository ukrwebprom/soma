import {
  useCallback,
  useEffect,
  useState,
} from "react";

import "./RedemptionsPage.css";
import { apiUrl } from "../lib/api";

const PAGE_LIMIT = 30;

const ISSUE_SOURCE_LABELS = {
  MANUAL: "Ручний випуск",
  GAME_NEMO_SUPERSTAR: "Гра Nemo Superstar",
};

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

function formatDate(value) {
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
  const [selectedRedemption, setSelectedRedemption] =
    useState(null);
  const [isDetailsLoading, setIsDetailsLoading] =
    useState(false);
  const [detailsError, setDetailsError] =
    useState("");
  const [copyMessage, setCopyMessage] =
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

  const selectedCertificateId =
    selectedRedemption?.certificateId;

  useEffect(() => {
    if (!selectedCertificateId) {
      return undefined;
    }

    const controller = new AbortController();

    async function loadCertificateDetails() {
      setIsDetailsLoading(true);
      setDetailsError("");

      try {
        const response = await fetch(
          apiUrl(`/api/admin/certificates/${encodeURIComponent(selectedCertificateId)}`),
          { signal: controller.signal },
        );
        const data = await response.json().catch(() => null);

        if (!response.ok) {
          throw new Error(
            data?.message ?? `Помилка сервера: ${response.status}`,
          );
        }

        if (!controller.signal.aborted && data?.certificate) {
          setSelectedRedemption((current) =>
            current?.certificateId === selectedCertificateId
              ? { ...current, ...data.certificate }
              : current,
          );
        }
      } catch (requestError) {
        if (requestError.name === "AbortError") {
          return;
        }

        console.error(requestError);
        setDetailsError(
          requestError instanceof Error
            ? requestError.message
            : "Не вдалося завантажити деталі сертифіката",
        );
      } finally {
        if (!controller.signal.aborted) {
          setIsDetailsLoading(false);
        }
      }
    }

    loadCertificateDetails();
    return () => controller.abort();
  }, [selectedCertificateId]);

  useEffect(() => {
    if (!selectedRedemption) {
      return undefined;
    }

    function handleKeyDown(event) {
      if (event.key === "Escape") {
        setSelectedRedemption(null);
      }
    }

    document.addEventListener("keydown", handleKeyDown);
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = previousOverflow;
    };
  }, [selectedRedemption]);

  function closeRedemptionDetails() {
    setSelectedRedemption(null);
    setDetailsError("");
    setCopyMessage("");
  }

  async function copyCertificateCode() {
    if (!selectedRedemption?.code) {
      return;
    }

    try {
      await navigator.clipboard.writeText(selectedRedemption.code);
      setCopyMessage("Код скопійовано");
    } catch {
      setCopyMessage("Не вдалося скопіювати код");
    }
  }

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
                    <tr
                      key={redemption.certificateId}
                      className="redemptions-table-row"
                      tabIndex="0"
                      onClick={() => {
                        setSelectedRedemption(redemption);
                        setCopyMessage("");
                      }}
                      onKeyDown={(event) => {
                        if (event.key === "Enter" || event.key === " ") {
                          event.preventDefault();
                          setSelectedRedemption(redemption);
                          setCopyMessage("");
                        }
                      }}
                    >
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

      {selectedRedemption && (
        <div
          className="certificate-details-overlay"
          role="presentation"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) {
              closeRedemptionDetails();
            }
          }}
        >
          <aside
            className="certificate-details-drawer"
            aria-label="Інформація про погашений сертифікат"
          >
            <header className="drawer-header">
              <div>
                <span className="drawer-eyebrow">Сертифікат</span>
                <h2>{selectedRedemption.title}</h2>
              </div>

              <button
                className="drawer-close-button"
                type="button"
                aria-label="Закрити"
                onClick={closeRedemptionDetails}
              >
                ×
              </button>
            </header>

            <div className="drawer-content">
              <div className="drawer-status-row">
                <span className="certificate-status certificate-status-redeemed">
                  Погашений
                </span>

                {isDetailsLoading && (
                  <span className="drawer-details-loading">
                    Оновлюємо деталі…
                  </span>
                )}
              </div>

              {detailsError && (
                <div className="drawer-details-error">{detailsError}</div>
              )}

              <section className="drawer-section">
                <h3>Унікальний код</h3>
                <div className="drawer-code-box">
                  <code>{selectedRedemption.code}</code>
                  <button type="button" onClick={copyCertificateCode}>
                    Копіювати
                  </button>
                </div>
                {copyMessage && (
                  <span className="copy-message">{copyMessage}</span>
                )}
              </section>

              <section className="drawer-section">
                <h3>Інформація</h3>
                <dl className="drawer-details-list">
                  <div>
                    <dt>Джерело</dt>
                    <dd>
                      {ISSUE_SOURCE_LABELS[selectedRedemption.issueSource] ??
                        selectedRedemption.issueSource ?? "—"}
                    </dd>
                  </div>
                  <div>
                    <dt>Причина випуску</dt>
                    <dd className="drawer-detail-text">
                      {selectedRedemption.issueReason ?? "—"}
                    </dd>
                  </div>
                  {selectedRedemption.issueComment && (
                    <div>
                      <dt>Коментар</dt>
                      <dd className="drawer-detail-text">
                        {selectedRedemption.issueComment}
                      </dd>
                    </div>
                  )}
                  {selectedRedemption.issueGroupId && (
                    <div>
                      <dt>ID серії</dt>
                      <dd className="drawer-detail-identifier">
                        {selectedRedemption.issueGroupId}
                      </dd>
                    </div>
                  )}
                  {selectedRedemption.sourceEventId && (
                    <div>
                      <dt>ID події джерела</dt>
                      <dd className="drawer-detail-identifier">
                        {selectedRedemption.sourceEventId}
                      </dd>
                    </div>
                  )}
                  <div>
                    <dt>Шаблон</dt>
                    <dd>
                      {selectedRedemption.template?.title ??
                        selectedRedemption.template?.code ?? "—"}
                    </dd>
                  </div>
                  <div>
                    <dt>Дата випуску</dt>
                    <dd>{formatDate(selectedRedemption.issuedAt)}</dd>
                  </div>
                  <div>
                    <dt>Дійсний до</dt>
                    <dd>{formatDate(selectedRedemption.expiresAt)}</dd>
                  </div>
                  <div>
                    <dt>Погашено</dt>
                    <dd>{formatDateTime(selectedRedemption.redeemedAt)}</dd>
                  </div>
                  <div>
                    <dt>Оператор</dt>
                    <dd>
                      {selectedRedemption.redeemedByOperator?.name ??
                        selectedRedemption.operator?.name ?? "—"}
                    </dd>
                  </div>
                </dl>
              </section>

              <section className="drawer-section">
                <h3>Вміст сертифіката</h3>
                <div className="drawer-text-content">
                  {selectedRedemption.description && (
                    <p>{selectedRedemption.description}</p>
                  )}
                  {selectedRedemption.terms && (
                    <p>
                      <strong>Умови:</strong>{" "}
                      {selectedRedemption.terms}
                    </p>
                  )}
                  {!selectedRedemption.description &&
                    !selectedRedemption.terms && (
                      <p>Додаткового опису немає.</p>
                    )}
                </div>
              </section>
            </div>
          </aside>
        </div>
      )}
    </div>
  );
}

export default RedemptionsPage;
