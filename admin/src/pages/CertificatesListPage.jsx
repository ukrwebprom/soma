import {
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import { useSearchParams } from "react-router";
import "../App.css";
import { apiUrl } from "../lib/api";

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

const ISSUE_SOURCE_LABELS = {
  MANUAL: "Ручний випуск",
  GAME_NEMO_SUPERSTAR: "Гра Nemo Superstar",
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

function createEmptyCertificateImages() {
  return {
    PORTRAIT: null,
    LANDSCAPE: null,
  };
}

function CertificatesListPage() {
  const [searchParams, setSearchParams] =
    useSearchParams();

  const selectedTemplateId =
    searchParams.get("template") ?? "ALL";

  const selectedStatus =
    searchParams.get("status") ?? "ALL";

  const selectedIssueGroup =
    searchParams.get("issueGroup") ?? "ALL";

    const searchQuery =
    searchParams.get("q") ?? "";

    const [selectedCertificate, setSelectedCertificate] =
    useState(null);

    const [copyMessage, setCopyMessage] =
    useState("");

    const [isDetailsLoading, setIsDetailsLoading] =
    useState(false);

    const [detailsError, setDetailsError] =
    useState("");

  const [certificates, setCertificates] =
    useState([]);

  const [templates, setTemplates] =
    useState([]);

  const [isLoading, setIsLoading] =
    useState(true);

  const [error, setError] = useState("");

  const [imageLayout, setImageLayout] =
  useState("PORTRAIT");

const [certificateImages, setCertificateImages] =
  useState(createEmptyCertificateImages);

const [isImageLoading, setIsImageLoading] =
  useState(false);

const [imageError, setImageError] =
  useState("");

const certificateImagesRef = useRef(
  createEmptyCertificateImages(),
);

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
            apiUrl(`/api/admin/certificates?${certificateParams}`),
            {
              signal: controller.signal,
            },
          ),

          fetch(
            apiUrl("/api/admin/certificate-templates"),
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
}, [selectedCertificate]);useEffect(() => {
  if (!selectedCertificate) {
    return undefined;
  }

  if (certificateImages[imageLayout]) {
    setImageError("");
    return undefined;
  }

  const controller = new AbortController();
  const requestedLayout = imageLayout;

  async function loadCertificateImage() {
    setIsImageLoading(true);
    setImageError("");

    try {
      const layoutQuery =
        requestedLayout === "LANDSCAPE"
          ? "?layout=LANDSCAPE"
          : "";

      const response = await fetch(
        apiUrl(`/api/certificates/${encodeURIComponent(
          selectedCertificate.code,
        )}/image${layoutQuery}`),
        {
          signal: controller.signal,
        },
      );

      if (!response.ok) {
        const errorData = await response
          .json()
          .catch(() => null);

        throw new Error(
          errorData?.message ??
            `Помилка сервера: ${response.status}`,
        );
      }

      const blob = await response.blob();
      const previewUrl =
        URL.createObjectURL(blob);

      if (controller.signal.aborted) {
        URL.revokeObjectURL(previewUrl);
        return;
      }

      setCertificateImages((currentImages) => {
        /*
         * Запит міг завершитися після того,
         * як цей формат уже було завантажено.
         */
        if (
          currentImages[requestedLayout]
        ) {
          URL.revokeObjectURL(previewUrl);
          return currentImages;
        }

        const nextImages = {
          ...currentImages,

          [requestedLayout]: {
            blob,
            previewUrl,
          },
        };

        certificateImagesRef.current =
          nextImages;

        return nextImages;
      });
    } catch (requestError) {
      if (
        requestError.name === "AbortError"
      ) {
        return;
      }

      console.error(requestError);

      setImageError(
        requestError instanceof Error
          ? requestError.message
          : "Не вдалося створити зображення",
      );
    } finally {
      if (!controller.signal.aborted) {
        setIsImageLoading(false);
      }
    }
  }

  loadCertificateImage();

  return () => {
    controller.abort();
  };
}, [
  selectedCertificate,
  imageLayout,
  certificateImages,
]);

useEffect(() => {
  return () => {
    Object.values(
      certificateImagesRef.current,
    ).forEach((image) => {
      if (image?.previewUrl) {
        URL.revokeObjectURL(
          image.previewUrl,
        );
      }
    });
  };
}, []);

const selectedCertificateId = selectedCertificate?.id;

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
        throw new Error(data?.message ?? `Помилка сервера: ${response.status}`);
      }

      if (!controller.signal.aborted && data?.certificate) {
        setSelectedCertificate((currentCertificate) =>
          currentCertificate?.id === selectedCertificateId
            ? { ...currentCertificate, ...data.certificate }
            : currentCertificate,
        );
      }
    } catch (requestError) {
      if (requestError.name === "AbortError") return;
      console.error(requestError);
      setDetailsError(
        requestError instanceof Error
          ? requestError.message
          : "Не вдалося завантажити деталі сертифіката",
      );
    } finally {
      if (!controller.signal.aborted) setIsDetailsLoading(false);
    }
  }

  loadCertificateDetails();
  return () => controller.abort();
}, [selectedCertificateId]);

const issueGroupOptions = useMemo(() => {
  const groups = new Map();

  certificates.forEach((certificate) => {
    if (
      certificate.issueGroupId &&
      !groups.has(certificate.issueGroupId)
    ) {
      groups.set(
        certificate.issueGroupId,
        certificate.issueReason || "Без причини",
      );
    }
  });

  return Array.from(groups, ([value, label]) => ({
    value,
    label,
  }));
}, [certificates]);

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

    const matchesIssueGroup =
      selectedIssueGroup === "ALL" ||
      (selectedIssueGroup === "NONE"
        ? !certificate.issueGroupId
        : certificate.issueGroupId === selectedIssueGroup);

    return matchesTemplate && matchesSearch && matchesIssueGroup;
  });
}, [
  certificates,
  selectedTemplateId,
  selectedIssueGroup,
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

function clearCertificateImages() {
  Object.values(
    certificateImagesRef.current,
  ).forEach((image) => {
    if (image?.previewUrl) {
      URL.revokeObjectURL(
        image.previewUrl,
      );
    }
  });

  const emptyImages =
    createEmptyCertificateImages();

  certificateImagesRef.current =
    emptyImages;

  setCertificateImages(emptyImages);
}

function openCertificateDetails(certificate) {
  clearCertificateImages();

  setSelectedCertificate(certificate);
  setImageLayout("PORTRAIT");
  setImageError("");
  setCopyMessage("");
  setDetailsError("");
}

function closeCertificateDetails() {
  clearCertificateImages();

  setSelectedCertificate(null);
  setImageLayout("PORTRAIT");
  setImageError("");
  setCopyMessage("");
  setDetailsError("");
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
  selectedIssueGroup !== "ALL" ||
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


function downloadCertificateImage() {
  const currentImage =
    certificateImages[imageLayout];

  if (
    !currentImage ||
    !selectedCertificate
  ) {
    return;
  }

  const layoutName =
    imageLayout === "LANDSCAPE"
      ? "landscape"
      : "portrait";

  const downloadLink =
    document.createElement("a");

  downloadLink.href =
    currentImage.previewUrl;

  downloadLink.download =
    `certificate-${selectedCertificate.code}-${layoutName}.png`;

  document.body.appendChild(
    downloadLink,
  );

  downloadLink.click();
  downloadLink.remove();
}

const currentCertificateImage =
  certificateImages[imageLayout];


  return (
    <div className="page">
      <header className="page-header">
        <div className="page-header-row">
          <div>
            <h1>Сертифікати</h1>

            <p>
              Усі випущені цифрові сертифікати,
              їхні статуси та терміни дії.
            </p>
          </div>

          <label className="filter-field certificate-header-search">
            <span>Пошук сертифіката</span>

            <input
              type="search"
              value={searchQuery}
              placeholder="Код або назва сертифіката"
              onChange={(event) =>
                updateSearch(event.target.value)
              }
            />
          </label>
        </div>
      </header>

      <main className="page-content">
        <section className="certificates-filters">
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

          <label className="filter-field">
            <span>Серія</span>

            <select
              value={selectedIssueGroup}
              onChange={(event) =>
                updateFilter(
                  "issueGroup",
                  event.target.value,
                )
              }
            >
              <option value="ALL">
                Усі сертифікати
              </option>

              <option value="NONE">Без серії</option>

              {issueGroupOptions.map((option) => (
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

          {isDetailsLoading && (
            <span className="drawer-details-loading">
              Оновлюємо деталі…
            </span>
          )}
        </div>

        {detailsError && (
          <div className="drawer-details-error">
            {detailsError}
          </div>
        )}

<section className="drawer-section certificate-image-section">
  <h3>Зображення сертифіката</h3>

  <div
    className={
      `certificate-image-preview ` +
      `certificate-image-preview-${imageLayout.toLowerCase()}`
    }
  >
    {isImageLoading && (
      <div className="certificate-image-loading">
        <span className="certificate-image-spinner" />

        <strong>
          Генеруємо сертифікат…
        </strong>

        <small>
          Це може зайняти кілька секунд
        </small>
      </div>
    )}

    {!isImageLoading &&
      imageError && (
        <div className="certificate-image-error">
          <strong>
            Не вдалося створити зображення
          </strong>

          <span>{imageError}</span>
        </div>
      )}

    {!isImageLoading &&
      !imageError &&
      currentCertificateImage && (
        <img
          src={
            currentCertificateImage.previewUrl
          }
          alt={
            imageLayout === "LANDSCAPE"
              ? "Горизонтальний сертифікат"
              : "Вертикальний сертифікат"
          }
        />
      )}
  </div>

  <div className="certificate-image-toolbar">
    <div
      className="certificate-layout-switcher"
      role="radiogroup"
      aria-label="Формат сертифіката"
    >
      <button
        className={
          imageLayout === "PORTRAIT"
            ? "layout-switch-button layout-switch-button-active"
            : "layout-switch-button"
        }
        type="button"
        role="radio"
        aria-checked={
          imageLayout === "PORTRAIT"
        }
        onClick={() =>
          setImageLayout("PORTRAIT")
        }
      >
        Портрет
      </button>

      <button
        className={
          imageLayout === "LANDSCAPE"
            ? "layout-switch-button layout-switch-button-active"
            : "layout-switch-button"
        }
        type="button"
        role="radio"
        aria-checked={
          imageLayout === "LANDSCAPE"
        }
        onClick={() =>
          setImageLayout("LANDSCAPE")
        }
      >
        Лендскейп
      </button>
    </div>

    <button
      className="certificate-download-button"
      type="button"
      disabled={
        !currentCertificateImage ||
        isImageLoading
      }
      onClick={
        downloadCertificateImage
      }
    >
      Завантажити PNG
    </button>
  </div>
</section>

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
              <dt>Джерело</dt>
              <dd>
                {ISSUE_SOURCE_LABELS[selectedCertificate.issueSource] ??
                  selectedCertificate.issueSource ?? "—"}
              </dd>
            </div>

            <div>
              <dt>Причина випуску</dt>
              <dd className="drawer-detail-text">
                {selectedCertificate.issueReason ?? "—"}
              </dd>
            </div>

            {selectedCertificate.issueComment && (
              <div>
                <dt>Коментар</dt>
                <dd className="drawer-detail-text">
                  {selectedCertificate.issueComment}
                </dd>
              </div>
            )}

            {selectedCertificate.issueGroupId && (
              <div>
                <dt>ID серії</dt>
                <dd className="drawer-detail-identifier">
                  {selectedCertificate.issueGroupId}
                </dd>
              </div>
            )}

            {selectedCertificate.sourceEventId && (
              <div>
                <dt>ID події джерела</dt>
                <dd className="drawer-detail-identifier">
                  {selectedCertificate.sourceEventId}
                </dd>
              </div>
            )}
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
                  {formatDateTime(
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
