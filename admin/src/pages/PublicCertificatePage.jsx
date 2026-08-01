import {
  useEffect,
  useState,
} from "react";

import { useParams } from "react-router";

import "./PublicCertificatePage.css";

const STATUS_CONTENT = {
  ACTIVE: {
    icon: "✓",
    title: "Сертифікат чинний",
    description:
      "Сертифікат можна використати.",
  },

  REDEEMED: {
    icon: "✓",
    title: "Сертифікат погашено",
    description:
      "Цей сертифікат уже був використаний.",
  },

  EXPIRED: {
    icon: "!",
    title: "Термін дії завершився",
    description:
      "Цей сертифікат більше не діє.",
  },

  REVOKED: {
    icon: "×",
    title: "Сертифікат відкликано",
    description:
      "Цей сертифікат було скасовано.",
  },
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
    day: "numeric",
    month: "long",
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
    day: "numeric",
    month: "long",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

function PublicCertificatePage() {
  const { code = "" } = useParams();

  const [verification, setVerification] =
    useState(null);

  const [isLoading, setIsLoading] =
    useState(true);

  const [error, setError] =
    useState("");

  useEffect(() => {
    const controller = new AbortController();

    async function loadCertificate() {
      setIsLoading(true);
      setError("");

      try {
        const response = await fetch(
          `/api/certificates/verify/${encodeURIComponent(
            code,
          )}`,
          {
            signal: controller.signal,
          },
        );

        const data = await response
          .json()
          .catch(() => null);

        if (!response.ok) {
          throw new Error(
            data?.message ??
              "Сертифікат не знайдено",
          );
        }

        setVerification(data);
      } catch (requestError) {
        if (
          requestError instanceof DOMException &&
          requestError.name === "AbortError"
        ) {
          return;
        }

        console.error(requestError);

        setError(
          requestError instanceof Error
            ? requestError.message
            : "Не вдалося перевірити сертифікат",
        );
      } finally {
        if (!controller.signal.aborted) {
          setIsLoading(false);
        }
      }
    }

    loadCertificate();

    return () => {
      controller.abort();
    };
  }, [code]);

  if (isLoading) {
    return (
      <main className="public-certificate-page">
        <section className="public-certificate-card public-loading-card">
          <span className="public-loader" />

          <strong>
            Перевіряємо сертифікат…
          </strong>
        </section>
      </main>
    );
  }

  if (error || !verification?.certificate) {
    return (
      <main className="public-certificate-page">
        <section className="public-certificate-card">
          <div className="public-status-icon public-status-icon-error">
            ×
          </div>

          <h1>
            Сертифікат не знайдено
          </h1>

          <p className="public-status-description">
            {error ||
              "Перевірте адресу або відскануйте QR-код повторно."}
          </p>
        </section>
      </main>
    );
  }

  const certificate =
    verification.certificate;

  const status =
    certificate.status ?? "ACTIVE";

  const statusContent =
    STATUS_CONTENT[status] ??
    STATUS_CONTENT.REVOKED;

  const isActive =
    status === "ACTIVE" &&
    verification.valid === true;

  return (
    <main
      className={
        `public-certificate-page ` +
        `public-certificate-page-${status.toLowerCase()}`
      }
    >
      <section className="public-certificate-card">
        <header className="public-certificate-header">
          <span className="public-product-name">
            SOMA CERTIFICATES
          </span>

          <div
            className={
              `public-status-icon ` +
              `public-status-icon-${status.toLowerCase()}`
            }
          >
            {statusContent.icon}
          </div>

          <h1>{statusContent.title}</h1>

          <p className="public-status-description">
            {statusContent.description}
          </p>
        </header>

        <section className="public-certificate-main">
          <span className="public-section-label">
            Сертифікат
          </span>

          <h2>{certificate.title}</h2>

          {certificate.description && (
            <p className="public-certificate-description">
              {certificate.description}
            </p>
          )}

          <dl className="public-certificate-details">
            <div>
              <dt>Випущено</dt>

              <dd>
                {formatDate(
                  certificate.issuedAt,
                )}
              </dd>
            </div>

            <div>
              <dt>Дійсний до</dt>

              <dd>
                {formatDate(
                  certificate.expiresAt,
                )}
              </dd>
            </div>

            {certificate.redeemedAt && (
              <div>
                <dt>Погашено</dt>

                <dd>
                  {formatDateTime(
                    certificate.redeemedAt,
                  )}
                </dd>
              </div>
            )}
          </dl>

          {certificate.terms && (
            <div className="public-certificate-terms">
              <strong>Умови використання</strong>

              <p>{certificate.terms}</p>
            </div>
          )}

          <div className="public-certificate-code">
            <span>Код сертифіката</span>

            <code>{certificate.code}</code>
          </div>

          {isActive && (
            <button
              className="public-redeem-button"
              type="button"
              disabled
            >
              Погасити сертифікат
            </button>
          )}

          {isActive && (
            <p className="public-redeem-note">
              Введення PIN оператора підключимо
              наступним кроком.
            </p>
          )}
        </section>
      </section>
    </main>
  );
}

export default PublicCertificatePage;