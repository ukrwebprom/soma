import {
  useEffect,
  useMemo,
  useState,
} from "react";

import { useSearchParams } from "react-router";
import "../App.css";

const STATUS_OPTIONS = [
  {
    value: "ALL",
    label: "Усі статуси",
  },
  {
    value: "ACTIVE",
    label: "Чинні",
  },
  {
    value: "REDEEMED",
    label: "Погашені",
  },
  {
    value: "EXPIRED",
    label: "Прострочені",
  },
  {
    value: "REVOKED",
    label: "Відкликані",
  },
];

const STATUS_LABELS = {
  ACTIVE: "Чинний",
  REDEEMED: "Погашений",
  EXPIRED: "Прострочений",
  REVOKED: "Відкликаний",
};

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

function CertificatesListPage() {
  const [searchParams, setSearchParams] =
    useSearchParams();

  const selectedTemplateId =
    searchParams.get("template") ?? "ALL";

  const selectedStatus =
    searchParams.get("status") ?? "ALL";

    const searchQuery =
    searchParams.get("q") ?? "";

    const [selectedCertificate, setSelectedCertificate] =
    useState(null);

    const [copyMessage, setCopyMessage] =
    useState("");

  const [certificates, setCertificates] =
    useState([]);

  const [templates, setTemplates] =
    useState([]);

  const [isLoading, setIsLoading] =
    useState(true);

  const [error, setError] = useState("");

  useEffect(() => {
    const controller = new AbortController();

    async function loadData() {
      setIsLoading(true);
      setError("");

      try {
        const certificateParams =
          new URLSearchParams({
            status: selectedStatus,
            page: "1",
            limit: "100",
          });

        const [
          certificatesResponse,
          templatesResponse,
        ] = await Promise.all([
          fetch(
            `/api/admin/certificates?${certificateParams}`,
            {
              signal: controller.signal,
            },
          ),

          fetch(
            "/api/admin/certificate-templates",
            {
              signal: controller.signal,
            },
          ),
        ]);

        const certificatesData =
          await certificatesResponse
            .json()
            .catch(() => null);

        const templatesData =
          await templatesResponse
            .json()
            .catch(() => null);

        if (!certificatesResponse.ok) {
          throw new Error(
            certificatesData?.message ??
              `Помилка сервера: ${certificatesResponse.status}`,
          );
        }

        if (!templatesResponse.ok) {
          throw new Error(
            templatesData?.message ??
              `Помилка сервера: ${templatesResponse.status}`,
          );
        }

        const receivedCertificates =
          Array.isArray(certificatesData)
            ? certificatesData
            : certificatesData?.certificates ?? [];

        const receivedTemplates =
          Array.isArray(templatesData)
            ? templatesData
            : templatesData?.certificateTemplates ??
              [];

        setCertificates(receivedCertificates);
        setTemplates(receivedTemplates);
      } catch (requestError) {
        if (requestError.name === "AbortError") {
          return;
        }

        console.error(requestError);

        setError(
          requestError instanceof Error
            ? requestError.message
            : "Не вдалося завантажити сертифікати",
        );
      } finally {
        if (!controller.signal.aborted) {
          setIsLoading(false);
        }
      }
    }

    loadData();

    return () => {
      controller.abort();
    };
  }, [selectedStatus]);


  useEffect(() => {
  if (!selectedCertificate) {
    return undefined;
  }

  function handleKeyDown(event) {
    if (event.key === "Escape") {
      setSelectedCertificate(null);
    }
  }

  document.addEventListener(
    "keydown",
    handleKeyDown,
  );

  const previousOverflow =
    document.body.style.overflow;

  document.body.style.overflow = "hidden";

  return () => {
    document.removeEventListener(
      "keydown",
      handleKeyDown,
    );

    document.body.style.overflow =
      previousOverflow;
  };
}, [selectedCertificate]);

const visibleCertificates = useMemo(() => {
  const normalizedSearch =
    searchQuery.trim().toLocaleLowerCase("uk-UA");

  return certificates.filter((certificate) => {
    const certificateTemplateId =
      certificate.template?.id ??
      certificate.templateId;

    const matchesTemplate =
      selectedTemplateId === "ALL" ||
      certificateTemplateId ===
        selectedTemplateId;

    const searchableText = [
      certificate.title,
      certificate.code,
      certificate.template?.code,
    ]
      .filter(Boolean)
      .join(" ")
      .toLocaleLowerCase("uk-UA");

    const matchesSearch =
      !normalizedSearch ||
      searchableText.includes(normalizedSearch);

    return matchesTemplate && matchesSearch;
  });
}, [
  certificates,
  selectedTemplateId,
  searchQuery,
]);

  function updateFilter(name, value) {
    const nextParams =
      new URLSearchParams(searchParams);

    if (value === "ALL") {
      nextParams.delete(name);
    } else {
      nextParams.set(name, value);
    }

    setSearchParams(nextParams, {
      replace: true,
    });
  }

function updateSearch(value) {
  const nextParams =
    new URLSearchParams(searchParams);

  if (value.trim()) {
    nextParams.set("q", value);
  } else {
    nextParams.delete("q");
  }

  setSearchParams(nextParams, {
    replace: true,
  });
}

function resetFilters() {
  setSearchParams({}, {
    replace: true,
  });
}

function openCertificateDetails(certificate) {
  setSelectedCertificate(certificate);
  setCopyMessage("");
}

function closeCertificateDetails() {
  setSelectedCertificate(null);
  setCopyMessage("");
}

async function copyCertificateCode() {
  if (!selectedCertificate?.code) {
    return;
  }

  try {
    await navigator.clipboard.writeText(
      selectedCertificate.code,
    );

    setCopyMessage("Код скопійовано");
  } catch (copyError) {
    console.error(copyError);
    setCopyMessage("Не вдалося скопіювати код");
  }
}

const hasActiveFilters =
  Boolean(searchQuery) ||
  selectedTemplateId !== "ALL" ||
  selectedStatus !== "ALL";

const selectedCertificateTemplate =
  selectedCertificate
    ? templates.find((template) => {
        const templateId =
          selectedCertificate.template?.id ??
          selectedCertificate.templateId;

        return template.id === templateId;
      })
    : null;

  return (
    <div className="page">
      <header className="page-header">
        <div>
          <h1>Сертифікати</h1>

          <p>
            Усі випущені цифрові сертифікати,
            їхні статуси та терміни дії.
          </p>
        </div>
      </header>

      <main className="page-content">
        <section className="certificates-filters">
            <label className="filter-field filter-search">
            <span>Пошук</span>

            <input
                type="search"
                value={searchQuery}
                placeholder="Код або назва сертифіката"
                onChange={(event) =>
                updateSearch(event.target.value)
                }
            />
            </label>
          <label className="filter-field">
            <span>Шаблон</span>

            <select
              value={selectedTemplateId}
              onChange={(event) =>
                updateFilter(
                  "template",
                  event.target.value,
                )
              }
            >
              <option value="ALL">
                Усі шаблони
              </option>

              {templates.map((template) => (
                <option
                  key={template.id}
                  value={template.id}
                >
                  {template.title}
                </option>
              ))}
            </select>
          </label>

          <label className="filter-field">
            <span>Статус</span>

            <select
              value={selectedStatus}
              onChange={(event) =>
                updateFilter(
                  "status",
                  event.target.value,
                )
              }
            >
              {STATUS_OPTIONS.map((option) => (
                <option
                  key={option.value}
                  value={option.value}
                >
                  {option.label}
                </option>
              ))}
            </select>
          </label>

          <div className="certificates-result-count">
            Знайдено:{" "}
            <strong>
              {visibleCertificates.length}
            </strong>
          </div>
          {hasActiveFilters && (
            <button
                className="filters-reset-button"
                type="button"
                onClick={resetFilters}
            >
                Скинути
            </button>
            )}
        </section>

        {isLoading && (
          <div className="state-card">
            Завантажуємо сертифікати…
          </div>
        )}

        {!isLoading && error && (
          <div className="state-card state-card-error">
            <strong>
              Не вдалося завантажити список
            </strong>

            <span>{error}</span>
          </div>
        )}

        {!isLoading &&
          !error &&
          visibleCertificates.length === 0 && (
            <div className="state-card">
              <strong>
                Сертифікатів не знайдено
              </strong>

              <span>
                Спробуйте змінити параметри
                фільтрації.
              </span>
            </div>
          )}

        {!isLoading &&
          !error &&
          visibleCertificates.length > 0 && (
            <section
              className="certificates-list"
              role="table"
              aria-label="Список сертифікатів"
            >
              <div
                className="certificates-list-header"
                role="row"
              >
                <div role="columnheader">
                  Назва
                </div>

                <div role="columnheader">
                  Код
                </div>

                <div role="columnheader">
                  Статус
                </div>

                <div role="columnheader">
                  Випущено
                </div>

                <div role="columnheader">
                  Дійсний до
                </div>
              </div>

              <div role="rowgroup">
                {visibleCertificates.map(
                  (certificate) => {
                    const status =
                      certificate.status ??
                      "ACTIVE";

                    return (
<article
  className="certificate-list-row"
  role="row"
  tabIndex="0"
  key={certificate.id}
  aria-label={`Відкрити сертифікат ${certificate.title}`}
  onClick={() =>
    openCertificateDetails(certificate)
  }
  onKeyDown={(event) => {
    if (
      event.key === "Enter" ||
      event.key === " "
    ) {
      event.preventDefault();
      openCertificateDetails(certificate);
    }
  }}
>
                        <div
                          className="certificate-title-cell"
                          role="cell"
                          data-label="Назва"
                        >
                          <strong>
                            {certificate.title}
                          </strong>
                        </div>

                        <div
                          className="certificate-code-cell"
                          role="cell"
                          data-label="Код"
                          title={certificate.code}
                        >
                          {certificate.code}
                        </div>

                        <div
                          role="cell"
                          data-label="Статус"
                        >
                          <span
                            className={
                              `certificate-status ` +
                              `certificate-status-${status.toLowerCase()}`
                            }
                          >
                            {STATUS_LABELS[status] ??
                              status}
                          </span>
                        </div>

                        <div
                          className="certificate-date-cell"
                          role="cell"
                          data-label="Випущено"
                        >
                          {formatDate(
                            certificate.issuedAt,
                          )}
                        </div>

                        <div
                          className="certificate-date-cell"
                          role="cell"
                          data-label="Дійсний до"
                        >
                          {formatDate(
                            certificate.expiresAt,
                          )}
                        </div>
                      </article>
                    );
                  },
                )}
              </div>
            </section>
          )}
      </main>

{selectedCertificate && (
  <div
    className="certificate-details-overlay"
    role="presentation"
    onMouseDown={(event) => {
      if (event.target === event.currentTarget) {
        closeCertificateDetails();
      }
    }}
  >
    <aside
      className="certificate-details-drawer"
      aria-label="Інформація про сертифікат"
    >
      <header className="drawer-header">
        <div>
          <span className="drawer-eyebrow">
            Сертифікат
          </span>

          <h2>
            {selectedCertificate.title}
          </h2>
        </div>

        <button
          className="drawer-close-button"
          type="button"
          aria-label="Закрити"
          onClick={closeCertificateDetails}
        >
          ×
        </button>
      </header>

      <div className="drawer-content">
        <div className="drawer-status-row">
          <span
            className={
              `certificate-status ` +
              `certificate-status-${selectedCertificate.status.toLowerCase()}`
            }
          >
            {STATUS_LABELS[
              selectedCertificate.status
            ] ?? selectedCertificate.status}
          </span>
        </div>

        <section className="drawer-section">
          <h3>Унікальний код</h3>

          <div className="drawer-code-box">
            <code>
              {selectedCertificate.code}
            </code>

            <button
              type="button"
              onClick={copyCertificateCode}
            >
              Копіювати
            </button>
          </div>

          {copyMessage && (
            <span className="copy-message">
              {copyMessage}
            </span>
          )}
        </section>

        <section className="drawer-section">
          <h3>Інформація</h3>

          <dl className="drawer-details-list">
            <div>
              <dt>Шаблон</dt>

              <dd>
                {selectedCertificateTemplate?.title ??
                  selectedCertificate.template?.code ??
                  "—"}
              </dd>
            </div>

            <div>
              <dt>Дата випуску</dt>

              <dd>
                {formatDate(
                  selectedCertificate.issuedAt,
                )}
              </dd>
            </div>

            <div>
              <dt>Дійсний до</dt>

              <dd>
                {formatDate(
                  selectedCertificate.expiresAt,
                )}
              </dd>
            </div>

            {selectedCertificate.redeemedAt && (
              <div>
                <dt>Погашено</dt>

                <dd>
                  {formatDate(
                    selectedCertificate.redeemedAt,
                  )}
                </dd>
              </div>
            )}

            {selectedCertificate
              .redeemedByOperator?.name && (
              <div>
                <dt>Оператор</dt>

                <dd>
                  {
                    selectedCertificate
                      .redeemedByOperator.name
                  }
                </dd>
              </div>
            )}
          </dl>
        </section>

        <section className="drawer-section">
          <h3>Вміст сертифіката</h3>

          <div className="drawer-text-content">
            {selectedCertificate.description && (
              <p>
                {selectedCertificate.description}
              </p>
            )}

            {selectedCertificate.terms && (
              <p>
                <strong>Умови:</strong>{" "}
                {selectedCertificate.terms}
              </p>
            )}

            {!selectedCertificate.description &&
              !selectedCertificate.terms && (
                <p>Додаткового опису немає.</p>
              )}
          </div>
        </section>

        <div className="drawer-actions">
          <button
            className="drawer-primary-button"
            type="button"
            onClick={copyCertificateCode}
          >
            Скопіювати код
          </button>

          {selectedCertificate.status ===
            "ACTIVE" && (
            <button
              className="drawer-danger-button"
              type="button"
              disabled
              title="Підключимо після створення API відкликання"
            >
              Відкликати
            </button>
          )}
        </div>
      </div>
    </aside>
  </div>
)}

    </div>
  );
}

export default CertificatesListPage;