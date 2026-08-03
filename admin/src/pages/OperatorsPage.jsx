import {
  useCallback,
  useEffect,
  useRef,
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
  const createDialogRef = useRef(null);
  const operatorNameInputRef = useRef(null);
  const pinDialogRef = useRef(null);
  const customPinInputRef = useRef(null);

  const [operators, setOperators] =
    useState([]);

  const [isLoading, setIsLoading] =
    useState(true);

  const [error, setError] =
    useState("");

  const [operatorName, setOperatorName] =
    useState("");

  const [isCreating, setIsCreating] =
    useState(false);

  const [createError, setCreateError] =
    useState("");

  const [createdOperator, setCreatedOperator] =
    useState(null);

  const [openMenuId, setOpenMenuId] =
    useState(null);

  const [menuPosition, setMenuPosition] =
    useState(null);

  const [statusUpdatingId, setStatusUpdatingId] =
    useState(null);

  const [operatorActionError, setOperatorActionError] =
    useState("");

  const [pinOperator, setPinOperator] =
    useState(null);

  const [customPin, setCustomPin] =
    useState("");

  const [generateRandomPin, setGenerateRandomPin] =
    useState(true);

  const [isChangingPin, setIsChangingPin] =
    useState(false);

  const [changePinError, setChangePinError] =
    useState("");

  const [changedPin, setChangedPin] =
    useState(null);

  const openCreateDialog = () => {
    setOperatorName("");
    setCreateError("");
    setCreatedOperator(null);
    createDialogRef.current?.showModal();
    operatorNameInputRef.current?.focus();
  };

  const closeCreateDialog = () => {
    if (isCreating) {
      return;
    }

    createDialogRef.current?.close();
    setOperatorName("");
    setCreateError("");
    setCreatedOperator(null);
  };

  const handleDialogBackdropClick = (
    event,
  ) => {
    if (event.target === event.currentTarget) {
      closeCreateDialog();
    }
  };

  const handleCreateOperator = async (
    event,
  ) => {
    event.preventDefault();

    const name = operatorName.trim();

    if (!name) {
      setCreateError(
        "Вкажіть ім’я оператора",
      );
      operatorNameInputRef.current?.focus();
      return;
    }

    setIsCreating(true);
    setCreateError("");

    try {
      const response = await fetch(
        "/api/admin/operators",
        {
          method: "POST",
          headers: {
            "Content-Type":
              "application/json",
          },
          body: JSON.stringify({ name }),
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

      if (!data?.operator || !data?.pin) {
        throw new Error(
          "Сервер повернув некоректну відповідь",
        );
      }

      const operator = {
        ...data.operator,
        redeemedCertificatesCount: 0,
      };

      setOperators((currentOperators) =>
        [...currentOperators, operator].sort(
          (firstOperator, secondOperator) => {
            if (
              firstOperator.isActive !==
              secondOperator.isActive
            ) {
              return firstOperator.isActive
                ? -1
                : 1;
            }

            return firstOperator.name.localeCompare(
              secondOperator.name,
              "uk-UA",
            );
          },
        ),
      );

      setCreatedOperator({
        operator,
        pin: data.pin,
      });
    } catch (requestError) {
      console.error(requestError);

      setCreateError(
        requestError instanceof Error
          ? requestError.message
          : "Не вдалося створити оператора",
      );
    } finally {
      setIsCreating(false);
    }
  };

  const handleToggleOperatorStatus = async (
    operator,
  ) => {
    setStatusUpdatingId(operator.id);
    setOperatorActionError("");

    try {
      const response = await fetch(
        `/api/admin/operators/${operator.id}/status`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            isActive: !operator.isActive,
          }),
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

      if (!data?.operator) {
        throw new Error(
          "Сервер повернув некоректну відповідь",
        );
      }

      setOperators((currentOperators) =>
        currentOperators.map((currentOperator) =>
          currentOperator.id === operator.id
            ? {
                ...currentOperator,
                ...data.operator,
              }
            : currentOperator,
        ),
      );

      setOpenMenuId(null);
      setMenuPosition(null);
    } catch (requestError) {
      console.error(requestError);
      setOperatorActionError(
        requestError instanceof Error
          ? requestError.message
          : "Не вдалося змінити статус оператора",
      );
    } finally {
      setStatusUpdatingId(null);
    }
  };

  const openPinDialog = (operator) => {
    setOpenMenuId(null);
    setMenuPosition(null);
    setPinOperator(operator);
    setCustomPin("");
    setGenerateRandomPin(true);
    setChangePinError("");
    setChangedPin(null);
    pinDialogRef.current?.showModal();
  };

  const closePinDialog = () => {
    if (isChangingPin) {
      return;
    }

    pinDialogRef.current?.close();
    setPinOperator(null);
    setCustomPin("");
    setChangePinError("");
    setChangedPin(null);
  };

  const handleChangePin = async (event) => {
    event.preventDefault();

    if (!pinOperator) {
      return;
    }

    if (
      !generateRandomPin &&
      !/^\d{4}$/.test(customPin)
    ) {
      setChangePinError(
        "PIN має містити рівно 4 цифри",
      );
      customPinInputRef.current?.focus();
      return;
    }

    setIsChangingPin(true);
    setChangePinError("");

    try {
      const response = await fetch(
        `/api/admin/operators/${pinOperator.id}/reset-pin`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(
            generateRandomPin
              ? {}
              : { pin: customPin },
          ),
        },
      );

      const data = await response
        .json()
        .catch(() => null);

      if (!response.ok) {
        const message =
          data?.error ===
          "OPERATOR_PIN_ALREADY_IN_USE"
            ? "Цей PIN вже використовується іншим оператором"
            : data?.message ??
              `Помилка сервера: ${response.status}`;

        throw new Error(message);
      }

      if (!data?.operator || !data?.pin) {
        throw new Error(
          "Сервер повернув некоректну відповідь",
        );
      }

      setOperators((currentOperators) =>
        currentOperators.map((operator) =>
          operator.id === data.operator.id
            ? { ...operator, ...data.operator }
            : operator,
        ),
      );
      setChangedPin(data.pin);
    } catch (requestError) {
      console.error(requestError);
      setChangePinError(
        requestError instanceof Error
          ? requestError.message
          : "Не вдалося змінити PIN",
      );
    } finally {
      setIsChangingPin(false);
    }
  };

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

  useEffect(() => {
    if (!openMenuId) {
      return undefined;
    }

    const closeMenu = (event) => {
      if (
        event.type === "keydown" &&
        event.key !== "Escape"
      ) {
        return;
      }

      if (
        event.type === "pointerdown" &&
        event.target.closest(
          ".operator-actions, .operator-dropdown-menu",
        )
      ) {
        return;
      }

      setOpenMenuId(null);
      setMenuPosition(null);
    };

    document.addEventListener(
      "pointerdown",
      closeMenu,
    );
    document.addEventListener(
      "keydown",
      closeMenu,
    );

    return () => {
      document.removeEventListener(
        "pointerdown",
        closeMenu,
      );
      document.removeEventListener(
        "keydown",
        closeMenu,
      );
    };
  }, [openMenuId]);

  const menuOperator = operators.find(
    (operator) => operator.id === openMenuId,
  );

  return (
    <div className="page">
      <header className="page-header">
        <div className="page-header-row">
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
            onClick={openCreateDialog}
          >
            + Додати оператора
          </button>
        </div>
      </header>

      <main className="page-content">

      {operatorActionError && (
        <div
          className="operators-action-error"
          role="alert"
        >
          <span>{operatorActionError}</span>

          <button
            type="button"
            aria-label="Закрити повідомлення"
            onClick={() =>
              setOperatorActionError("")
            }
          >
            ×
          </button>
        </div>
      )}

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
                          <div className="operator-actions">
                            <button
                              className="operator-menu-button"
                              type="button"
                              aria-label={
                                `Дії оператора ${operator.name}`
                              }
                              aria-haspopup="menu"
                              aria-expanded={
                                openMenuId === operator.id
                              }
                              onClick={(event) => {
                                if (
                                  openMenuId === operator.id
                                ) {
                                  setOpenMenuId(null);
                                  setMenuPosition(null);
                                  return;
                                }

                                const buttonBounds =
                                  event.currentTarget
                                    .getBoundingClientRect();

                                setMenuPosition({
                                  top:
                                    buttonBounds.bottom + 6,
                                  right:
                                    window.innerWidth -
                                    buttonBounds.right,
                                });
                                setOpenMenuId(operator.id);
                              }}
                            >
                              ⋮
                            </button>
                          </div>
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

      {menuOperator && menuPosition && (
        <div
          className="operator-dropdown-menu"
          role="menu"
          aria-label={
            `Дії оператора ${menuOperator.name}`
          }
          style={menuPosition}
        >
          <button
            type="button"
            role="menuitem"
            onClick={() =>
              openPinDialog(menuOperator)
            }
          >
            Змінити PIN
          </button>

          <button
            type="button"
            role="menuitem"
            disabled={
              statusUpdatingId === menuOperator.id
            }
            onClick={() =>
              handleToggleOperatorStatus(
                menuOperator,
              )
            }
          >
            {statusUpdatingId === menuOperator.id
              ? "Змінюємо статус…"
              : menuOperator.isActive
                ? "Деактивувати"
                : "Активувати"}
          </button>
        </div>
      )}

      <dialog
        ref={createDialogRef}
        className="operator-create-dialog"
        aria-labelledby="operator-create-title"
        onClick={handleDialogBackdropClick}
        onCancel={(event) => {
          if (isCreating) {
            event.preventDefault();
          }
        }}
      >
        <form
          className="operator-create-form"
          onSubmit={handleCreateOperator}
        >
          {createdOperator ? (
            <div className="operator-created-result">
              <div className="operator-created-icon">
                ✓
              </div>

              <h2 id="operator-create-title">
                Оператора створено
              </h2>

              <strong>
                {createdOperator.operator.name}
              </strong>

              <div className="operator-pin-card">
                <span>PIN</span>
                <code>{createdOperator.pin}</code>
              </div>

              <p>
                Збережіть або передайте PIN
                співробітнику. Після закриття
                він більше не відображатиметься.
              </p>

              <button
                className="operator-dialog-submit"
                type="button"
                onClick={closeCreateDialog}
              >
                Готово
              </button>
            </div>
          ) : (
            <>
              <header className="operator-dialog-header">
                <div>
                  <h2 id="operator-create-title">
                    Додати оператора
                  </h2>

                  <p>
                    Оператор зможе погашати
                    сертифікати за допомогою
                    особистого PIN-коду.
                  </p>
                </div>

                <button
                  className="operator-dialog-close"
                  type="button"
                  aria-label="Закрити"
                  disabled={isCreating}
                  onClick={closeCreateDialog}
                >
                  ×
                </button>
              </header>

              <label className="operator-name-field">
                <span>Ім’я оператора</span>

                <input
                  ref={operatorNameInputRef}
                  type="text"
                  value={operatorName}
                  placeholder="Наприклад, Марина"
                  autoComplete="off"
                  maxLength={100}
                  disabled={isCreating}
                  aria-invalid={Boolean(createError)}
                  aria-describedby={
                    createError
                      ? "operator-create-error"
                      : undefined
                  }
                  onChange={(event) => {
                    setOperatorName(
                      event.target.value,
                    );
                    setCreateError("");
                  }}
                />

                <small>
                  PIN буде згенеровано
                  автоматично після створення.
                </small>
              </label>

              {createError && (
                <p
                  id="operator-create-error"
                  className="operator-create-error"
                  role="alert"
                >
                  {createError}
                </p>
              )}

              <footer className="operator-dialog-actions">
                <button
                  className="operator-dialog-cancel"
                  type="button"
                  disabled={isCreating}
                  onClick={closeCreateDialog}
                >
                  Скасувати
                </button>

                <button
                  className="operator-dialog-submit"
                  type="submit"
                  disabled={
                    isCreating ||
                    !operatorName.trim()
                  }
                >
                  {isCreating
                    ? "Створюємо…"
                    : "Додати оператора"}
                </button>
              </footer>
            </>
          )}
        </form>
      </dialog>

      <dialog
        ref={pinDialogRef}
        className="operator-create-dialog"
        aria-labelledby="operator-pin-title"
        onClick={(event) => {
          if (event.target === event.currentTarget) {
            closePinDialog();
          }
        }}
        onCancel={(event) => {
          if (isChangingPin) {
            event.preventDefault();
          }
        }}
      >
        <form
          className="operator-create-form"
          onSubmit={handleChangePin}
        >
          {changedPin ? (
            <div className="operator-created-result">
              <div className="operator-created-icon">
                ✓
              </div>

              <h2 id="operator-pin-title">
                PIN змінено
              </h2>

              <strong>{pinOperator?.name}</strong>

              <div className="operator-pin-card">
                <span>Новий PIN</span>
                <code>{changedPin}</code>
              </div>

              <p>
                Збережіть або передайте PIN
                співробітнику. Після закриття
                він більше не відображатиметься.
              </p>

              <button
                className="operator-dialog-submit"
                type="button"
                onClick={closePinDialog}
              >
                Готово
              </button>
            </div>
          ) : (
            <>
              <header className="operator-dialog-header">
                <div>
                  <h2 id="operator-pin-title">
                    Змінити PIN
                  </h2>

                  <p>
                    Встановіть новий PIN для
                    оператора {pinOperator?.name}.
                  </p>
                </div>

                <button
                  className="operator-dialog-close"
                  type="button"
                  aria-label="Закрити"
                  disabled={isChangingPin}
                  onClick={closePinDialog}
                >
                  ×
                </button>
              </header>

              <label className="operator-name-field">
                <span>Новий PIN</span>

                <input
                  ref={customPinInputRef}
                  type="text"
                  inputMode="numeric"
                  value={customPin}
                  placeholder="4 цифри"
                  autoComplete="off"
                  maxLength={4}
                  disabled={
                    generateRandomPin ||
                    isChangingPin
                  }
                  aria-invalid={Boolean(changePinError)}
                  onChange={(event) => {
                    setCustomPin(
                      event.target.value
                        .replace(/\D/g, "")
                        .slice(0, 4),
                    );
                    setChangePinError("");
                  }}
                />

                <small>
                  PIN має складатися рівно з
                  чотирьох цифр.
                </small>
              </label>

              <label className="operator-random-pin-option">
                <input
                  type="checkbox"
                  checked={generateRandomPin}
                  disabled={isChangingPin}
                  onChange={(event) => {
                    setGenerateRandomPin(
                      event.target.checked,
                    );
                    setChangePinError("");

                    if (!event.target.checked) {
                      requestAnimationFrame(() =>
                        customPinInputRef.current
                          ?.focus(),
                      );
                    }
                  }}
                />

                <span>
                  Згенерувати випадковий PIN
                </span>
              </label>

              {changePinError && (
                <p
                  className="operator-create-error"
                  role="alert"
                >
                  {changePinError}
                </p>
              )}

              <footer className="operator-dialog-actions">
                <button
                  className="operator-dialog-cancel"
                  type="button"
                  disabled={isChangingPin}
                  onClick={closePinDialog}
                >
                  Скасувати
                </button>

                <button
                  className="operator-dialog-submit"
                  type="submit"
                  disabled={
                    isChangingPin ||
                    (!generateRandomPin &&
                      !/^\d{4}$/.test(customPin))
                  }
                >
                  {isChangingPin
                    ? "Змінюємо PIN…"
                    : "Змінити PIN"}
                </button>
              </footer>
            </>
          )}
        </form>
      </dialog>
    </div>
  );
}

export default OperatorsPage;
