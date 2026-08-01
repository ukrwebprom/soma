import {
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";
import { Link } from "react-router";
import "../App.css";

const STATUS_LABELS = {
  ACTIVE: "Активный",
  INACTIVE: "Неактивный",
  ARCHIVED: "Архивный",
};

function formatDate(value) {
  if (!value) {
    return "—";
  }

  return new Intl.DateTimeFormat("ru-RU", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(new Date(value));
}

function TemplatesListPage() {
  const [templates, setTemplates] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");

  const certificateDialogRef = useRef(null);

  const [selectedTemplate, setSelectedTemplate] = useState(null);

  const [dialogState, setDialogState] = useState("confirm");

  const [createdCertificate, setCreatedCertificate] = useState(null);

  const [creationError, setCreationError] = useState("");

  const [openMenuId, setOpenMenuId] = useState(null);

  const loadTemplates = useCallback(async (signal) => {
    setIsLoading(true);
    setError("");

    try {
      const response = await fetch(
        "/api/admin/certificate-templates",
        { signal },
      );

      const data = await response
        .json()
        .catch(() => null);

      if (!response.ok) {
        throw new Error(
          data?.message ??
            `Ошибка сервера: ${response.status}`,
        );
      }

      const receivedTemplates = Array.isArray(data)
        ? data
        : data?.certificateTemplates ?? [];

      setTemplates(receivedTemplates);
    } catch (requestError) {
      if (requestError.name === "AbortError") {
        return;
      }

      console.error(requestError);

      setError(
        requestError instanceof Error
          ? requestError.message
          : "Не удалось получить список шаблонов",
      );
    } finally {
      if (!signal?.aborted) {
        setIsLoading(false);
      }
    }
  }, []);

  useEffect(() => {
    const controller = new AbortController();

    loadTemplates(controller.signal);

    return () => {
      controller.abort();
    };
  }, [loadTemplates]);

  useEffect(() => {
  function handleDocumentClick() {
    setOpenMenuId(null);
  }

  document.addEventListener("click", handleDocumentClick);

  return () => {
    document.removeEventListener(
      "click",
      handleDocumentClick,
    );
  };
}, []);

  function handleRefresh() {
    const controller = new AbortController();
    loadTemplates(controller.signal);
  }

  function openCertificateDialog(template) {
  setSelectedTemplate(template);
  setCreatedCertificate(null);
  setCreationError("");
  setDialogState("confirm");

  if (!certificateDialogRef.current?.open) {
    certificateDialogRef.current?.showModal();
  }
}

function closeCertificateDialog() {
  if (dialogState === "creating") {
    return;
  }

  certificateDialogRef.current?.close();
}

function resetCertificateDialog() {
  setSelectedTemplate(null);
  setCreatedCertificate(null);
  setCreationError("");
  setDialogState("confirm");
}

async function createCertificate() {
  if (!selectedTemplate) {
    return;
  }

  setDialogState("creating");
  setCreationError("");

  try {
    const response = await fetch(
      "/api/admin/certificates",
      {
        method: "POST",

        headers: {
          "Content-Type": "application/json",
        },

        body: JSON.stringify({
          templateId: selectedTemplate.id,
        }),
      },
    );

    const data = await response
      .json()
      .catch(() => null);

    if (!response.ok) {
      throw new Error(
        data?.message ??
          `Ошибка сервера: ${response.status}`,
      );
    }

    const certificate =
      data?.certificate ?? data;

    if (!certificate?.code) {
      throw new Error(
        "Сервер не вернул код сертификата",
      );
    }

    setCreatedCertificate(certificate);
    setDialogState("success");
  } catch (requestError) {
    console.error(requestError);

    setCreationError(
      requestError instanceof Error
        ? requestError.message
        : "Не удалось создать сертификат",
    );

    setDialogState("error");
  }
}


function toggleTemplateMenu(event, templateId) {
  event.stopPropagation();

  setOpenMenuId((currentId) =>
    currentId === templateId ? null : templateId,
  );
}

function handleTemplateMenuAction(action, template) {
  setOpenMenuId(null);

  if (action === "edit") {
    window.alert(
      `Редагування шаблону "${template.title}" зробимо наступним кроком`,
    );
    return;
  }

  if (action === "status") {
    window.alert(
      `Зміну статусу для "${template.title}" також підключимо наступним кроком`,
    );
  }
}

  return (
    <div className="page">
      <header className="page-header">
        <div className="page-header-row">
          <div>

            <h1>Шаблоны сертификатов</h1>

            <p>
              Здесь находятся все шаблоны, на основе
              которых выпускаются цифровые сертификаты.
            </p>
          </div>

          <Link
            className="primary-link"
            to="/templates/new"
          >
            Создать шаблон
          </Link>
        </div>
      </header>

      <main className="page-content">
        <div className="templates-toolbar">
          <span className="templates-count">
            Шаблонов: {templates.length}
          </span>

          <button
            className="secondary-button"
            type="button"
            disabled={isLoading}
            onClick={handleRefresh}
          >
            {isLoading ? "Обновляем..." : "Обновить"}
          </button>
        </div>

        {isLoading && templates.length === 0 && (
          <div className="state-card">
            Загружаем шаблоны...
          </div>
        )}

        {error && (
          <div className="state-card state-card-error">
            <strong>Не удалось загрузить список</strong>
            <span>{error}</span>
          </div>
        )}

        {!isLoading &&
          !error &&
          templates.length === 0 && (
            <div className="state-card">
              <strong>Шаблонов пока нет</strong>

              <span>
                Создай первый шаблон сертификата.
              </span>

              <Link
                className="primary-link"
                to="/templates/new"
              >
                Создать шаблон
              </Link>
            </div>
          )}

        {templates.length > 0 && (
          <section className="templates-grid">
            {templates.map((template) => {
              const status =
                template.status ?? "ACTIVE";

              return (
                <article
                  className="template-card"
                  key={template.id}
                >

<div className="template-card-cover">
  {template.coverPortraitUrl ? (
    <img
      src={template.coverPortraitUrl}
      alt=""
    />
  ) : (
    <div className="cover-placeholder">
      Нет обложки
    </div>
  )}

  <div className="template-card-topbar">
    <span
      className={`status-badge status-${status.toLowerCase()}`}
    >
      {STATUS_LABELS[status] ?? status}
    </span>

    <div
      className="template-card-menu"
      onClick={(event) => event.stopPropagation()}
    >
      <button
        className="template-menu-button"
        type="button"
        aria-label="Дії з шаблоном"
        aria-haspopup="menu"
        aria-expanded={openMenuId === template.id}
        onClick={(event) =>
          toggleTemplateMenu(event, template.id)
        }
      >
        <span>⋮</span>
      </button>

      {openMenuId === template.id && (
        <div
          className="template-dropdown-menu"
          role="menu"
        >
          <button
            type="button"
            onClick={() =>
              handleTemplateMenuAction(
                "edit",
                template,
              )
            }
          >
            Редагувати шаблон
          </button>

          <button
            type="button"
            onClick={() =>
              handleTemplateMenuAction(
                "status",
                template,
              )
            }
          >
            Змінити статус
          </button>
        </div>
      )}
    </div>
  </div>
</div>

                  <div className="template-card-content">
                    <div className="template-code">
                      {template.code}
                    </div>

                    <h2>{template.title}</h2>

                    {template.description && (
                      <p className="template-description">
                        {template.description}
                      </p>
                    )}

                    <dl className="template-meta">
                      <div>
                        <dt>Срок действия</dt>
                        <dd>
                          {template.validityDays} дней
                        </dd>
                      </div>

                      <div>
                        <dt>Создан</dt>
                        <dd>
                          {formatDate(
                            template.createdAt,
                          )}
                        </dd>
                      </div>
                    </dl>

                    <button
                        className="create-certificate-button"
                        type="button"
                        disabled={status !== "ACTIVE"}
                        onClick={() =>
                            openCertificateDialog(template)
                        }
                        >
                        Створити сертифікат
                        </button>
                  </div>
                </article>
              );
            })}
          </section>
        )}
      </main>
      <dialog
  ref={certificateDialogRef}
  className="certificate-dialog"
  onClose={resetCertificateDialog}
  onCancel={(event) => {
    if (dialogState === "creating") {
      event.preventDefault();
    }
  }}
>
  <div className="certificate-dialog-content">
    {dialogState === "confirm" && (
      <>
        <div className="dialog-heading">
          <span className="dialog-label">
            Випуск сертифіката
          </span>

          <h2>Створити новий сертифікат?</h2>

          <p>
            Буде створено чинний сертифікат за
            шаблоном:
          </p>
        </div>

        <div className="selected-template">
          {selectedTemplate?.coverPortraitUrl && (
            <img
              src={
                selectedTemplate.coverPortraitUrl
              }
              alt=""
            />
          )}

          <div>
            <strong>
              {selectedTemplate?.title}
            </strong>

            <span>
              Дійсний протягом{" "}
              {selectedTemplate?.validityDays} днів
            </span>
          </div>
        </div>

        <div className="dialog-actions">
          <button
            className="dialog-secondary-button"
            type="button"
            onClick={closeCertificateDialog}
          >
            Скасувати
          </button>

          <button
            className="dialog-primary-button"
            type="button"
            onClick={createCertificate}
          >
            Створити
          </button>
        </div>
      </>
    )}

    {dialogState === "creating" && (
      <div className="dialog-progress">
        <div className="dialog-spinner" />

        <h2>Створюємо сертифікат…</h2>

        <p>
          Генеруємо унікальний код і розраховуємо
          термін дії.
        </p>
      </div>
    )}

    {dialogState === "success" &&
      createdCertificate && (
        <>
          <div className="dialog-success-icon">
            ✓
          </div>

          <div className="dialog-heading centered">
            <span className="dialog-label">
              Готово
            </span>

            <h2>Сертифікат створено</h2>

            <p>
              {createdCertificate.title ??
                selectedTemplate?.title}
            </p>
          </div>

          <dl className="created-certificate-info">
            <div>
              <dt>Дійсний до</dt>

              <dd>
                {formatDate(
                  createdCertificate.expiresAt,
                )}
              </dd>
            </div>

            <div>
              <dt>Унікальний код</dt>

              <dd className="certificate-code">
                {createdCertificate.code}
              </dd>
            </div>
          </dl>

          <div className="dialog-actions">
            <button
              className="dialog-secondary-button"
              type="button"
              onClick={() => {
                setCreatedCertificate(null);
                setDialogState("confirm");
              }}
            >
              Створити ще один
            </button>

            <button
              className="dialog-primary-button"
              type="button"
              onClick={closeCertificateDialog}
            >
              Закрити
            </button>
          </div>
        </>
      )}

    {dialogState === "error" && (
      <>
        <div className="dialog-error-icon">
          !
        </div>

        <div className="dialog-heading centered">
          <h2>Не вдалося створити сертифікат</h2>

          <p>{creationError}</p>
        </div>

        <div className="dialog-actions">
          <button
            className="dialog-secondary-button"
            type="button"
            onClick={closeCertificateDialog}
          >
            Закрити
          </button>

          <button
            className="dialog-primary-button"
            type="button"
            onClick={createCertificate}
          >
            Спробувати ще раз
          </button>
        </div>
      </>
    )}
  </div>
</dialog>
    </div>
  );
}

export default TemplatesListPage;