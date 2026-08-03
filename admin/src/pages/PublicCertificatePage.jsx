import {
  useEffect,
  useRef,
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
  const redeemDialogRef = useRef(null);
  const pinInputRef = useRef(null);

  const [verification, setVerification] =
    useState(null);

  const [isLoading, setIsLoading] =
    useState(true);

  const [error, setError] =
    useState("");

  const [operatorPin, setOperatorPin] =
    useState("");

  const [isRedeeming, setIsRedeeming] =
    useState(false);

  const [redeemError, setRedeemError] =
    useState("");

  const [redemptionResult, setRedemptionResult] =
    useState(null);

  const openRedeemDialog = () => {
    setOperatorPin("");
    setRedeemError("");
    setRedemptionResult(null);
    redeemDialogRef.current?.showModal();
    pinInputRef.current?.focus();
  };

  const closeRedeemDialog = () => {
    if (isRedeeming) {
      return;
    }

    redeemDialogRef.current?.close();
    setOperatorPin("");
    setRedeemError("");
    setRedemptionResult(null);
  };

  const handleRedeem = async (event) => {
    event.preventDefault();

    if (!/^\d{4}$/.test(operatorPin)) {
      setRedeemError(
        "PIN має містити рівно 4 цифри",
      );
      pinInputRef.current?.focus();
      return;
    }

    setIsRedeeming(true);
    setRedeemError("");

    try {
      const response = await fetch(
        `/api/certificates/${encodeURIComponent(
          code,
        )}/redeem`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            pin: operatorPin,
          }),
        },
      );

      const data = await response
        .json()
        .catch(() => null);

      if (!response.ok) {
        const errorMessages = {
          INVALID_OPERATOR_PIN:
            "Невірний PIN оператора",
          CERTIFICATE_NOT_FOUND:
            "Сертифікат не знайдено",
          CERTIFICATE_ALREADY_REDEEMED:
            "Сертифікат уже погашено",
          CERTIFICATE_REVOKED:
            "Сертифікат відкликано",
          CERTIFICATE_EXPIRED:
            "Термін дії сертифіката завершився",
          VALIDATION_ERROR:
            "Перевірте введений PIN",
        };

        throw new Error(
          errorMessages[data?.error] ??
            data?.message ??
            `Помилка сервера: ${response.status}`,
        );
      }

      if (
        data?.redeemed !== true ||
        !data?.certificate
      ) {
        throw new Error(
          "Сервер повернув некоректну відповідь",
        );
      }

      setVerification((currentVerification) => ({
        ...currentVerification,
        valid: false,
        certificate: {
          ...currentVerification.certificate,
          ...data.certificate,
        },
      }));
      setRedemptionResult(data.certificate);
      setOperatorPin("");
    } catch (requestError) {
      console.error(requestError);
      setRedeemError(
        requestError instanceof Error
          ? requestError.message
          : "Не вдалося погасити сертифікат",
      );
    } finally {
      setIsRedeeming(false);
    }
  };

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

            {certificate.redeemedByOperator?.name && (
              <div>
                <dt>Оператор</dt>

                <dd>
                  {certificate.redeemedByOperator.name}
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
              onClick={openRedeemDialog}
            >
              Погасити сертифікат
            </button>
          )}
        </section>
      </section>

      <dialog
        ref={redeemDialogRef}
        className="public-redeem-dialog"
        aria-labelledby="public-redeem-title"
        onClick={(event) => {
          if (event.target === event.currentTarget) {
            closeRedeemDialog();
          }
        }}
        onCancel={(event) => {
          if (isRedeeming) {
            event.preventDefault();
          }
        }}
      >
        <form
          className="public-redeem-form"
          onSubmit={handleRedeem}
        >
          {redemptionResult ? (
            <div className="public-redeem-success">
              <div className="public-redeem-success-icon">
                ✓
              </div>

              <h2 id="public-redeem-title">
                Сертифікат погашено
              </h2>

              <p>
                {redemptionResult.title}
              </p>

              <dl>
                <div>
                  <dt>Оператор</dt>
                  <dd>
                    {redemptionResult
                      .redeemedByOperator?.name ?? "—"}
                  </dd>
                </div>

                <div>
                  <dt>Дата і час</dt>
                  <dd>
                    {formatDateTime(
                      redemptionResult.redeemedAt,
                    )}
                  </dd>
                </div>
              </dl>

              <button
                className="public-dialog-confirm"
                type="button"
                onClick={closeRedeemDialog}
              >
                Готово
              </button>
            </div>
          ) : (
            <>
          <header className="public-redeem-dialog-header">
            <div>
              <h2 id="public-redeem-title">
                Погасити сертифікат
              </h2>

              <p>
                Введіть особистий PIN оператора,
                щоб підтвердити погашення.
              </p>
            </div>

            <button
              className="public-dialog-close"
              type="button"
              aria-label="Закрити"
              disabled={isRedeeming}
              onClick={closeRedeemDialog}
            >
              ×
            </button>
          </header>

          <label className="public-pin-field">
            <span>PIN оператора</span>

            <input
              ref={pinInputRef}
              type="password"
              inputMode="numeric"
              value={operatorPin}
              placeholder="••••"
              autoComplete="off"
              maxLength={4}
              disabled={isRedeeming}
              aria-invalid={Boolean(redeemError)}
              aria-describedby="public-pin-hint"
              onChange={(event) => {
                setOperatorPin(
                  event.target.value
                    .replace(/\D/g, "")
                    .slice(0, 4),
                );
                setRedeemError("");
              }}
            />

            <small id="public-pin-hint">
              PIN складається з чотирьох цифр.
            </small>
          </label>

          {redeemError && (
            <p
              className="public-redeem-error"
              role="alert"
            >
              {redeemError}
            </p>
          )}

          <footer className="public-redeem-dialog-actions">
            <button
              className="public-dialog-cancel"
              type="button"
              disabled={isRedeeming}
              onClick={closeRedeemDialog}
            >
              Скасувати
            </button>

            <button
              className="public-dialog-confirm"
              type="submit"
              disabled={
                isRedeeming ||
                !/^\d{4}$/.test(operatorPin)
              }
            >
              {isRedeeming
                ? "Погашаємо…"
                : "Погасити"}
            </button>
          </footer>
            </>
          )}
        </form>
      </dialog>
    </main>
  );
}

export default PublicCertificatePage;
