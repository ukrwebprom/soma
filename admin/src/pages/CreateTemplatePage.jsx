import { useEffect, useRef, useState } from "react";
import { useNavigate, useSearchParams } from "react-router";
import "../App.css";
import { apiUrl } from "../lib/api";

function FileField({
  name,
  label,
  hint,
  preview,
  onChange,
  required = true,
}) {
  return (
    <label className="upload-field">
      <span className="field-label">{label}</span>

      <input
        type="file"
        name={name}
        accept="image/png,image/jpeg,image/webp"
        required={required}
        onChange={onChange}
      />

      <span className="field-hint">{hint}</span>

      <div className="image-preview">
        {preview ? (
          <img src={preview} alt="" />
        ) : (
          <span>Попередній перегляд</span>
        )}
      </div>
    </label>
  );
}

function CreateTemplatePage({ mode = "create" }) {
  const navigate = useNavigate();
  const isEditing = mode === "edit";
  const [searchParams] = useSearchParams();
  const templateId = searchParams.get("id");
  const [previews, setPreviews] = useState({});
  const previewUrlsRef = useRef({});

  const [isSubmitting, setIsSubmitting] =
    useState(false);

  const [error, setError] = useState("");
  const [createdTemplate, setCreatedTemplate] =
    useState(null);
  const [template, setTemplate] = useState(null);
  const [isLoading, setIsLoading] = useState(isEditing);

  useEffect(() => {
    if (!isEditing) return undefined;

    const controller = new AbortController();

    async function loadTemplate() {
      if (!templateId) {
        setError("Не вказано шаблон для редагування");
        setIsLoading(false);
        return;
      }

      try {
        const response = await fetch(
          apiUrl("/api/admin/certificate-templates"),
          { signal: controller.signal },
        );
        const data = await response.json().catch(() => null);

        if (!response.ok) {
          throw new Error(
            data?.message ?? `Помилка сервера: ${response.status}`,
          );
        }

        const templates = Array.isArray(data)
          ? data
          : data?.certificateTemplates ?? [];
        const selectedTemplate = templates.find(
          (item) => item.id === templateId,
        );

        if (!selectedTemplate) throw new Error("Шаблон не знайдено");
        setTemplate(selectedTemplate);
      } catch (requestError) {
        if (requestError.name !== "AbortError") {
          setError(
            requestError instanceof Error
              ? requestError.message
              : "Не вдалося завантажити шаблон",
          );
        }
      } finally {
        if (!controller.signal.aborted) setIsLoading(false);
      }
    }

    loadTemplate();
    return () => controller.abort();
  }, [isEditing, templateId]);

  useEffect(() => {
    return () => {
      Object.values(previewUrlsRef.current).forEach(
        (url) => URL.revokeObjectURL(url),
      );
    };
  }, []);

  function clearPreviews() {
    Object.values(previewUrlsRef.current).forEach(
      (url) => URL.revokeObjectURL(url),
    );

    previewUrlsRef.current = {};
    setPreviews({});
  }

  function handleFileChange(event) {
    const { name, files } = event.target;
    const file = files?.[0];

    const previousUrl =
      previewUrlsRef.current[name];

    if (previousUrl) {
      URL.revokeObjectURL(previousUrl);
    }

    if (file) {
      previewUrlsRef.current[name] =
        URL.createObjectURL(file);
    } else {
      delete previewUrlsRef.current[name];
    }

    setPreviews({
      ...previewUrlsRef.current,
    });
  }

  async function handleSubmit(event) {
    event.preventDefault();

    const form = event.currentTarget;

    setError("");
    setCreatedTemplate(null);
    setIsSubmitting(true);

    try {
      const formData = new FormData(form);

      const response = await fetch(
        apiUrl(
          isEditing
            ? `/api/admin/certificate-templates/${templateId}`
            : "/api/admin/certificate-templates",
        ),
        {
          method: isEditing ? "PATCH" : "POST",
          body: formData,
        },
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

      setCreatedTemplate(data.certificateTemplate);

      if (isEditing) {
        setTemplate(data.certificateTemplate);
      } else {
        form.reset();
        clearPreviews();
      }
    } catch (requestError) {
      console.error(requestError);

      setError(
        requestError instanceof Error
          ? requestError.message
          : isEditing
            ? "Не вдалося зберегти шаблон"
            : "Не вдалося створити шаблон",
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="page">
      <header className="page-header">
        <div>
          <h1>
            {isEditing
              ? "Редагування шаблону сертифіката"
              : "Створення шаблону сертифіката"}
          </h1>
          <p>
            Задайте вміст сертифіката та завантажте
            зображення для двох форматів.
          </p>
        </div>
      </header>

      <main className="page-content">
        {isLoading && (
          <div className="message">Завантаження шаблону...</div>
        )}

        {!isLoading && (!isEditing || template) && (
        <form
          key={template?.id ?? "new"}
          className="template-form"
          onSubmit={handleSubmit}
        >
          <section className="form-card">
            <h2>Вміст</h2>

            <div className="field">
              <label htmlFor="code">
                Код шаблону
              </label>

              <input
                id="code"
                name="code"
                type="text"
                placeholder="free-pizza"
                pattern="[a-z0-9-]+"
                maxLength="64"
                required
                defaultValue={template?.code ?? ""}
              />

              <span className="field-hint">
                Лише латинські малі літери,
                цифри та дефіси
              </span>
            </div>

            <div className="field">
              <label htmlFor="title">
                Назва сертифіката
              </label>

              <input
                id="title"
                name="title"
                type="text"
                placeholder="Сертифікат на безкоштовну піцу"
                maxLength="150"
                required
                defaultValue={template?.title ?? ""}
              />
            </div>

            <div className="field">
              <label htmlFor="description">
                Опис
              </label>

              <textarea
                id="description"
                name="description"
                rows="3"
                placeholder="Одна піца зі спеціального меню"
                defaultValue={template?.description ?? ""}
              />
            </div>

            <div className="field">
              <label htmlFor="terms">
                Умови використання
              </label>

              <textarea
                id="terms"
                name="terms"
                rows="3"
                placeholder="Сертифікат можна використати лише один раз"
                defaultValue={template?.terms ?? ""}
              />
            </div>

            <div className="field">
              <label htmlFor="instructionText">
                Інструкція для отримувача
              </label>

              <textarea
                id="instructionText"
                name="instructionText"
                rows="3"
                placeholder="Покажіть QR-код співробітнику закладу"
                defaultValue={template?.instructionText ?? ""}
              />
            </div>

            <div className="field">
              <label htmlFor="validityDays">
                Термін дії, днів
              </label>

              <input
                id="validityDays"
                name="validityDays"
                type="number"
                min="1"
                step="1"
                defaultValue={template?.validityDays ?? 10}
                required
              />
            </div>
          </section>

          <section className="form-card">
            <h2>Зображення</h2>

            <div className="upload-grid">
              <FileField
                name="coverPortrait"
                label="Вертикальна обкладинка"
                hint="Вертикальне зображення, мінімальна ширина 1000 px"
                preview={previews.coverPortrait ?? template?.coverPortraitUrl}
                onChange={handleFileChange}
                required={!isEditing}
              />

              <FileField
                name="coverLandscape"
                label="Горизонтальна обкладинка"
                hint="Горизонтальне зображення, мінімальна ширина 1000 px"
                preview={previews.coverLandscape ?? template?.coverLandscapeUrl}
                onChange={handleFileChange}
                required={!isEditing}
              />

              <FileField
                name="logo"
                label="Логотип"
                hint="Необов'язково. PNG або WebP із прозорим фоном"
                preview={previews.logo ?? template?.logoUrl}
                onChange={handleFileChange}
                required={false}
              />
            </div>

            <div className="format-note">
              <strong>Підсумкові формати:</strong>

              <span>
                вертикальний — 1080 × 1920 px
              </span>

              <span>
                горизонтальний — 1920 × 1080 px
              </span>
            </div>
          </section>

          <div className="form-actions">
            <button
              className="cancel-button"
              type="button"
              onClick={() => navigate("/templates")}
            >
              Скасувати
            </button>

            <button
              type="submit"
              disabled={isSubmitting}
            >
              {isSubmitting
                ? isEditing
                  ? "Зберігаємо..."
                  : "Створюємо шаблон..."
                : isEditing
                  ? "Зберегти"
                  : "Створити шаблон"}
            </button>
          </div>
        </form>
        )}

        {error && (
          <div className="message error-message">
            <strong>Помилка</strong>
            <span>{error}</span>
          </div>
        )}

        {createdTemplate && (
          <section className="message success-message">
            <div>
              <strong>
                {isEditing ? "Шаблон збережено" : "Шаблон створено"}
              </strong>

              <span>
                {createdTemplate.title}
              </span>

              <small>
                ID: {createdTemplate.id}
              </small>
            </div>

            <div className="result-links">
              <a
                href={
                  createdTemplate.coverPortraitUrl
                }
                target="_blank"
                rel="noreferrer"
              >
                Вертикальна обкладинка
              </a>

              <a
                href={
                  createdTemplate.coverLandscapeUrl
                }
                target="_blank"
                rel="noreferrer"
              >
                Горизонтальна обкладинка
              </a>

              {createdTemplate.logoUrl && (
                <a
                  href={createdTemplate.logoUrl}
                  target="_blank"
                  rel="noreferrer"
                >
                  Логотип
                </a>
              )}
            </div>
          </section>
        )}
      </main>
    </div>
  );
}

export default CreateTemplatePage;
