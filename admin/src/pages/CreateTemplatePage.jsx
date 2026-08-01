import { useEffect, useRef, useState } from "react";
import "../App.css";

function FileField({
  name,
  label,
  hint,
  preview,
  onChange,
}) {
  return (
    <label className="upload-field">
      <span className="field-label">{label}</span>

      <input
        type="file"
        name={name}
        accept="image/png,image/jpeg,image/webp"
        required
        onChange={onChange}
      />

      <span className="field-hint">{hint}</span>

      <div className="image-preview">
        {preview ? (
          <img src={preview} alt="" />
        ) : (
          <span>Предварительный просмотр</span>
        )}
      </div>
    </label>
  );
}

function CreateTemplatePage() {
  const [previews, setPreviews] = useState({});
  const previewUrlsRef = useRef({});

  const [isSubmitting, setIsSubmitting] =
    useState(false);

  const [error, setError] = useState("");
  const [createdTemplate, setCreatedTemplate] =
    useState(null);

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
        "/api/admin/certificate-templates",
        {
          method: "POST",
          body: formData,
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

      setCreatedTemplate(data.certificateTemplate);

      form.reset();
      clearPreviews();
    } catch (requestError) {
      console.error(requestError);

      setError(
        requestError instanceof Error
          ? requestError.message
          : "Не удалось создать шаблон",
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="page">
      <header className="page-header">
        <div>
          <h1>Создание шаблона сертификата</h1>
          <p>
            Задайте содержание сертификата и загрузите
            изображения для двух форматов.
          </p>
        </div>
      </header>

      <main className="page-content">
        <form
          className="template-form"
          onSubmit={handleSubmit}
        >
          <section className="form-card">
            <h2>Содержание</h2>

            <div className="field">
              <label htmlFor="code">
                Код шаблона
              </label>

              <input
                id="code"
                name="code"
                type="text"
                placeholder="free-pizza"
                pattern="[a-z0-9-]+"
                maxLength="64"
                required
              />

              <span className="field-hint">
                Только латинские строчные буквы,
                цифры и дефисы
              </span>
            </div>

            <div className="field">
              <label htmlFor="title">
                Название сертификата
              </label>

              <input
                id="title"
                name="title"
                type="text"
                placeholder="Сертифікат на безкоштовну піцу"
                maxLength="150"
                required
              />
            </div>

            <div className="field">
              <label htmlFor="description">
                Описание
              </label>

              <textarea
                id="description"
                name="description"
                rows="3"
                placeholder="Одна піца зі спеціального меню"
              />
            </div>

            <div className="field">
              <label htmlFor="terms">
                Условия использования
              </label>

              <textarea
                id="terms"
                name="terms"
                rows="3"
                placeholder="Сертифікат можна використати лише один раз"
              />
            </div>

            <div className="field">
              <label htmlFor="instructionText">
                Инструкция для получателя
              </label>

              <textarea
                id="instructionText"
                name="instructionText"
                rows="3"
                placeholder="Покажіть QR-код співробітнику закладу"
              />
            </div>

            <div className="field">
              <label htmlFor="validityDays">
                Срок действия, дней
              </label>

              <input
                id="validityDays"
                name="validityDays"
                type="number"
                min="1"
                step="1"
                defaultValue="10"
                required
              />
            </div>
          </section>

          <section className="form-card">
            <h2>Изображения</h2>

            <div className="upload-grid">
              <FileField
                name="coverPortrait"
                label="Вертикальная обложка"
                hint="Вертикальное изображение, минимальная ширина 1000 px"
                preview={previews.coverPortrait}
                onChange={handleFileChange}
              />

              <FileField
                name="coverLandscape"
                label="Горизонтальная обложка"
                hint="Горизонтальное изображение, минимальная ширина 1000 px"
                preview={previews.coverLandscape}
                onChange={handleFileChange}
              />

              <FileField
                name="logo"
                label="Логотип"
                hint="PNG или WebP с прозрачным фоном"
                preview={previews.logo}
                onChange={handleFileChange}
              />
            </div>

            <div className="format-note">
              <strong>Итоговые форматы:</strong>

              <span>
                вертикальный — 1080 × 1920 px
              </span>

              <span>
                горизонтальный — 1920 × 1080 px
              </span>
            </div>
          </section>

          <div className="form-actions">
            <button
              type="submit"
              disabled={isSubmitting}
            >
              {isSubmitting
                ? "Создаём шаблон..."
                : "Создать шаблон"}
            </button>
          </div>
        </form>

        {error && (
          <div className="message error-message">
            <strong>Ошибка</strong>
            <span>{error}</span>
          </div>
        )}

        {createdTemplate && (
          <section className="message success-message">
            <div>
              <strong>Шаблон создан</strong>

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
                Вертикальная обложка
              </a>

              <a
                href={
                  createdTemplate.coverLandscapeUrl
                }
                target="_blank"
                rel="noreferrer"
              >
                Горизонтальная обложка
              </a>

              <a
                href={createdTemplate.logoUrl}
                target="_blank"
                rel="noreferrer"
              >
                Логотип
              </a>
            </div>
          </section>
        )}
      </main>
    </div>
  );
}

export default CreateTemplatePage;