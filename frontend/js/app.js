const App = (() => {

  // =====================================================
  // ESTADO GENERAL DE LA APLICACIÓN
  // =====================================================

  const state = {
    role: null,
    name: "Usuario",
    email: null,
    selectedMonth: new Date(),
    payments: []
  };


  // =====================================================
  // FORMATEADORES
  // =====================================================

  const monthFormatter = new Intl.DateTimeFormat("es-PE", {
    month: "long",
    year: "numeric"
  });

  const dateFormatter = new Intl.DateTimeFormat("es-PE", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric"
  });

  const moneyFormatter = new Intl.NumberFormat("es-PE", {
    style: "currency",
    currency: "PEN",
    minimumFractionDigits: 2
  });


  // =====================================================
  // REFERENCIAS HTML
  // =====================================================

  const els = {};

  function cacheElements() {

    [
      "pageTitle",
      "profileName",
      "profileRole",
      "changeRoleBtn",

      "inicioView",
      "pagosView",

      "heroMonth",
      "heroCopy",
      "goPaymentsBtn",

      "summaryTotal",
      "summaryPaid",
      "summaryPending",
      "summaryOverdue",

      "upcomingList",

      "prevMonthBtn",
      "nextMonthBtn",
      "todayMonthBtn",

      "monthTitle",
      "newPaymentBtn",

      "paymentsTotal",
      "paymentsPaid",
      "paymentsPending",
      "paymentsOverdue",

      "paymentsBody",
      "emptyState",
      "actionsHeader",

      "roleModal",
      "newPaymentModal",
      "registerPaymentModal",
      "receiptModal",

      "loginForm",
      "emailInput",
      "passwordInput",

      "newPaymentForm",
      "providerInput",
      "conceptInput",
      "categoryInput",
      "amountInput",
      "dueDateInput",

      "registerPaymentForm",
      "paymentIdInput",
      "paidDateInput",
      "receiptInput",
      "selectedPaymentInfo",

      "receiptContent",
      "toast"

    ].forEach(id => {

      els[id] =
        document.getElementById(id);

    });

  }


  // =====================================================
  // FECHAS
  // =====================================================

  function normalizeMonth(date) {

    return new Date(
      date.getFullYear(),
      date.getMonth(),
      1,
      12,
      0,
      0
    );

  }


  function formatMonth(date) {

    const label =
      monthFormatter.format(date);

    return (
      label.charAt(0).toUpperCase() +
      label.slice(1)
    );

  }


  function formatDate(iso) {

    return dateFormatter.format(
      new Date(`${iso}T00:00:00`)
    );

  }


  // =====================================================
  // MENSAJES
  // =====================================================

  function showToast(message) {

    els.toast.textContent =
      message;

    els.toast.classList.remove(
      "hidden"
    );

    window.clearTimeout(
      showToast.timer
    );

    showToast.timer =
      window.setTimeout(
        () => {
          els.toast.classList.add(
            "hidden"
          );
        },
        2600
      );

  }


  // =====================================================
  // MODALES
  // =====================================================

  function openModal(id) {

    document
      .getElementById(id)
      .classList
      .remove("hidden");

  }


  function closeModal(id) {

    document
      .getElementById(id)
      .classList
      .add("hidden");

  }


  // =====================================================
  // ROLES
  // =====================================================

  function isAssistant() {

    return (
      state.role === "ASISTENTE"
    );

  }


  function isManager() {

    return (
      state.role === "GERENTE"
    );

  }


  function applyRole() {

    const authenticated =
      Boolean(state.role);

    /*
      Si todavía no existe una sesión,
      no mostramos controles del asistente.
    */
    if (!authenticated) {

      els.profileName.textContent =
        "Usuario";

      els.profileRole.textContent =
        "—";

      els.changeRoleBtn.textContent =
        "Salir";

      document
        .querySelectorAll(
          ".assistant-only"
        )
        .forEach(el => {

          el.classList.add(
            "hidden"
          );

        });

      els.actionsHeader.textContent =
        "";

      els.heroCopy.textContent =
        "Consulta rápidamente qué pagos están pendientes, pagados o vencidos.";

      return;
    }


    const assistant =
      isAssistant();


    els.profileName.textContent =
      state.name || "Usuario";


    if (assistant) {

      els.profileRole.textContent =
        "Asistente";

    } else if (isManager()) {

      els.profileRole.textContent =
        "Gerente";

    } else {

      els.profileRole.textContent =
        state.role;

    }


    els.changeRoleBtn.textContent =
      "Salir";


    /*
      Los controles con assistant-only
      solo aparecen para ASISTENTE.
    */
    document
      .querySelectorAll(
        ".assistant-only"
      )
      .forEach(el => {

        el.classList.toggle(
          "hidden",
          !assistant
        );

      });


    /*
      El gerente no necesita columna
      de acciones.
    */
    els.actionsHeader.textContent =
      assistant
        ? "Acción"
        : "";


    els.heroCopy.textContent =
      assistant
        ? "Revisa qué debes pagar este mes y registra los pagos realizados."
        : "Revisa rápidamente qué pagos están pendientes, pagados o vencidos.";

  }


  // =====================================================
  // CAMBIAR DE VISTA
  // =====================================================

  function switchView(viewName) {

    const isInicio =
      viewName === "inicio";


    els.inicioView.classList.toggle(
      "active",
      isInicio
    );


    els.pagosView.classList.toggle(
      "active",
      !isInicio
    );


    document
      .querySelectorAll(
        ".nav-item"
      )
      .forEach(btn => {

        btn.classList.toggle(
          "active",
          btn.dataset.view ===
            viewName
        );

      });


    els.pageTitle.textContent =
      isInicio
        ? "Resumen del mes"
        : "Pagos del mes";

  }


  // =====================================================
  // CARGAR PAGOS
  // =====================================================

  async function loadPayments() {

    const date =
      state.selectedMonth;


    state.payments =
      await Api.listPayments(
        date.getFullYear(),
        date.getMonth()
      );


    renderAll();

  }


  // =====================================================
  // RESUMEN
  // =====================================================

  function calcSummary(payments) {

    const total =
      payments.reduce(
        (sum, payment) =>
          sum +
          Number(
            payment.amount || 0
          ),
        0
      );


    const paid =
      payments
        .filter(
          payment =>
            payment.status ===
            "Pagado"
        )
        .reduce(
          (sum, payment) =>
            sum +
            Number(
              payment.amount || 0
            ),
          0
        );


    const pending =
      payments
        .filter(
          payment =>
            payment.status ===
            "Pendiente"
        )
        .reduce(
          (sum, payment) =>
            sum +
            Number(
              payment.amount || 0
            ),
          0
        );


    const overdue =
      payments
        .filter(
          payment =>
            payment.status ===
            "Vencido"
        )
        .reduce(
          (sum, payment) =>
            sum +
            Number(
              payment.amount || 0
            ),
          0
        );


    return {
      total,
      paid,
      pending,
      overdue
    };

  }


  // =====================================================
  // RENDER DEL RESUMEN
  // =====================================================

  function renderSummary() {

    const summary =
      calcSummary(
        state.payments
      );


    els.heroMonth.textContent =
      formatMonth(
        new Date()
      );


    els.monthTitle.textContent =
      formatMonth(
        state.selectedMonth
      );


    const map = [

      [
        els.summaryTotal,
        summary.total
      ],

      [
        els.summaryPaid,
        summary.paid
      ],

      [
        els.summaryPending,
        summary.pending
      ],

      [
        els.summaryOverdue,
        summary.overdue
      ],

      [
        els.paymentsTotal,
        summary.total
      ],

      [
        els.paymentsPaid,
        summary.paid
      ],

      [
        els.paymentsPending,
        summary.pending
      ],

      [
        els.paymentsOverdue,
        summary.overdue
      ]

    ];


    map.forEach(
      ([element, value]) => {

        element.textContent =
          moneyFormatter.format(
            value
          );

      }
    );

  }


  // =====================================================
  // PRÓXIMOS PAGOS
  // =====================================================

  function renderUpcoming() {

    const payments =
      state.payments
        .filter(
          payment =>
            payment.status !==
            "Pagado"
        )
        .slice(0, 4);


    els.upcomingList.innerHTML =
      "";


    if (!payments.length) {

      const div =
        document.createElement(
          "div"
        );


      div.className =
        "empty-state";


      div.innerHTML = `
        <strong>
          No tienes pagos pendientes en este mes
        </strong>

        <span>
          Los próximos vencimientos aparecerán aquí.
        </span>
      `;


      els.upcomingList.appendChild(
        div
      );

      return;
    }


    payments.forEach(
      payment => {

        const div =
          document.createElement(
            "div"
          );


        div.className =
          "simple-item";


        div.innerHTML = `

          <div>

            <strong>
              ${escapeHtml(
                payment.provider
              )}
            </strong>

            <span>
              ${escapeHtml(
                payment.concept
              )}
            </span>

          </div>


          <div>

            <strong>
              ${formatDate(
                payment.dueDate
              )}
            </strong>

            <span>
              Vencimiento
            </span>

          </div>


          <span
            class="status ${statusClass(
              payment.status
            )}"
          >
            ${payment.status}
          </span>

        `;


        els.upcomingList.appendChild(
          div
        );

      }
    );

  }


  // =====================================================
  // ESTADO VISUAL
  // =====================================================

  function statusClass(status) {

    if (status === "Pagado") {
      return "paid";
    }

    if (status === "Vencido") {
      return "overdue";
    }

    return "pending";

  }


  // =====================================================
  // TABLA DE PAGOS
  // =====================================================

  function renderTable() {

    els.paymentsBody.innerHTML =
      "";


    els.emptyState.classList.toggle(
      "hidden",
      state.payments.length > 0
    );


    state.payments.forEach(
      payment => {


        const tr =
          document.createElement(
            "tr"
          );


        // -----------------------------------------------
        // COMPROBANTE
        // -----------------------------------------------

        const receiptHtml =
          payment.receipt

            ? `
              <button
                class="link-btn view-receipt"
                data-id="${payment.id}"
                type="button"
              >
                Ver comprobante
              </button>
            `

            : `
              <span class="muted">
                —
              </span>
            `;


        // -----------------------------------------------
        // REGISTRAR PAGO
        // Solo para ASISTENTE
        // -----------------------------------------------

        const actionHtml =
          isAssistant() &&
          payment.status !==
            "Pagado"

            ? `
              <button
                class="action-btn register-payment"
                data-id="${payment.id}"
                type="button"
              >
                Registrar pago
              </button>
            `

            : "";


        // -----------------------------------------------
        // FECHA DE VENCIMIENTO
        // Solo el ASISTENTE la puede modificar.
        // -----------------------------------------------

        const dueDateHtml =
          isAssistant()

            ? `
              <button
                class="date-button edit-date"
                data-id="${payment.id}"
                data-date="${payment.dueDate}"
                type="button"
              >
                ${formatDate(
                  payment.dueDate
                )}
              </button>
            `

            : `
              <span>
                ${formatDate(
                  payment.dueDate
                )}
              </span>
            `;


        tr.innerHTML = `

          <td>
            ${escapeHtml(
              payment.provider
            )}
          </td>


          <td>
            ${escapeHtml(
              payment.concept
            )}
          </td>


          <td>
            ${escapeHtml(
              payment.category
            )}
          </td>


          <td>
            ${dueDateHtml}
          </td>


          <td>
            ${moneyFormatter.format(
              Number(
                payment.amount
              )
            )}
          </td>


          <td>

            <span
              class="status ${statusClass(
                payment.status
              )}"
            >
              ${payment.status}
            </span>

          </td>


          <td>
            ${receiptHtml}
          </td>


          <td>
            ${actionHtml}
          </td>

        `;


        els.paymentsBody.appendChild(
          tr
        );

      }
    );


    bindDynamicActions();

  }


  // =====================================================
  // RENDER GENERAL
  // =====================================================

  function renderAll() {

    renderSummary();
    renderUpcoming();
    renderTable();

  }


  // =====================================================
  // ACCIONES DE LA TABLA
  // =====================================================

  function bindDynamicActions() {


    // ---------------------------------------------------
    // MODIFICAR FECHA
    // ---------------------------------------------------

    document
      .querySelectorAll(
        ".edit-date"
      )
      .forEach(btn => {

        btn.addEventListener(
          "click",
          async () => {

            if (!isAssistant()) {
              return;
            }


            const current =
              btn.dataset.date;


            const next =
              window.prompt(
                "Nueva fecha de vencimiento (AAAA-MM-DD):",
                current
              );


            if (
              !next ||
              next === current
            ) {
              return;
            }


            if (
              !/^\d{4}-\d{2}-\d{2}$/.test(
                next
              )
            ) {

              showToast(
                "Ingresa una fecha válida con formato AAAA-MM-DD."
              );

              return;
            }


            try {

              await Api.updateDueDate(
                btn.dataset.id,
                next
              );


              showToast(
                "Fecha de vencimiento actualizada."
              );


              await loadPayments();


            } catch (error) {

              showToast(
                error.message ||
                "No se pudo actualizar la fecha."
              );

            }

          }
        );

      });


    // ---------------------------------------------------
    // REGISTRAR PAGO
    // ---------------------------------------------------

    document
      .querySelectorAll(
        ".register-payment"
      )
      .forEach(btn => {

        btn.addEventListener(
          "click",
          async () => {

            if (!isAssistant()) {
              return;
            }


            const payment =
              await Api.getPayment(
                btn.dataset.id
              );


            els.paymentIdInput.value =
              payment.id;


            els.paidDateInput.value =
              new Date()
                .toISOString()
                .slice(0, 10);


            els.receiptInput.value =
              "";


            els.selectedPaymentInfo.innerHTML = `

              <strong>

                ${escapeHtml(
                  payment.provider
                )}

                —

                ${escapeHtml(
                  payment.concept
                )}

              </strong>

              <br>

              <span>

                ${moneyFormatter.format(
                  Number(
                    payment.amount
                  )
                )}

                · vence

                ${formatDate(
                  payment.dueDate
                )}

              </span>

            `;


            openModal(
              "registerPaymentModal"
            );

          }
        );

      });


    // ---------------------------------------------------
    // VER COMPROBANTE
    // ---------------------------------------------------

    document
      .querySelectorAll(
        ".view-receipt"
      )
      .forEach(btn => {

        btn.addEventListener(
          "click",
          async () => {

            const payment =
              await Api.getPayment(
                btn.dataset.id
              );


            renderReceipt(
              payment
            );


            openModal(
              "receiptModal"
            );

          }
        );

      });

  }


  // =====================================================
  // COMPROBANTE
  // =====================================================

  function renderReceipt(payment) {

    const receipt =
      payment.receipt;


    if (!receipt) {

      els.receiptContent.innerHTML = `

        <div class="receipt-box">

          <strong>
            No existe comprobante
          </strong>

        </div>

      `;

      return;
    }


    let preview =
      "";


    if (
      receipt.type &&
      receipt.type.startsWith(
        "image/"
      )
    ) {

      preview = `

        <img
          class="receipt-preview"
          src="${receipt.dataUrl}"
          alt="Comprobante de pago"
        />

      `;

    } else if (
      receipt.type ===
      "application/pdf"
    ) {

      preview = `

        <iframe
          class="pdf-frame"
          src="${receipt.dataUrl}"
          title="Comprobante PDF"
        >
        </iframe>

      `;

    } else if (
      receipt.dataUrl
    ) {

      preview = `

        <a
          class="btn btn-secondary"
          href="${receipt.dataUrl}"
          target="_blank"
          rel="noopener"
        >
          Abrir archivo
        </a>

      `;

    }


    els.receiptContent.innerHTML = `

      <div class="receipt-box">

        <strong>
          ${escapeHtml(
            receipt.name
          )}
        </strong>


        <span>

          ${escapeHtml(
            payment.provider
          )}

          ·

          ${escapeHtml(
            payment.concept
          )}

        </span>


        ${preview}

      </div>

    `;

  }


  // =====================================================
  // SEGURIDAD BÁSICA AL MOSTRAR TEXTO
  // =====================================================

  function escapeHtml(value) {

    return String(
      value ?? ""
    )

      .replaceAll(
        "&",
        "&amp;"
      )

      .replaceAll(
        "<",
        "&lt;"
      )

      .replaceAll(
        ">",
        "&gt;"
      )

      .replaceAll(
        '"',
        "&quot;"
      )

      .replaceAll(
        "'",
        "&#039;"
      );

  }


  // =====================================================
  // EVENTOS FIJOS
  // =====================================================

  function bindStaticEvents() {


    // ---------------------------------------------------
    // MENÚ
    // ---------------------------------------------------

    document
      .querySelectorAll(
        ".nav-item"
      )
      .forEach(btn => {

        btn.addEventListener(
          "click",
          () => {

            switchView(
              btn.dataset.view
            );

          }
        );

      });


    els.goPaymentsBtn.addEventListener(
      "click",
      () => {

        switchView(
          "pagos"
        );

      }
    );


    // ---------------------------------------------------
    // NAVEGACIÓN POR MESES
    // ---------------------------------------------------

    els.prevMonthBtn.addEventListener(
      "click",
      async () => {

        state.selectedMonth =
          new Date(
            state.selectedMonth.getFullYear(),
            state.selectedMonth.getMonth() - 1,
            1
          );


        await loadPayments();

      }
    );


    els.nextMonthBtn.addEventListener(
      "click",
      async () => {

        state.selectedMonth =
          new Date(
            state.selectedMonth.getFullYear(),
            state.selectedMonth.getMonth() + 1,
            1
          );


        await loadPayments();

      }
    );


    els.todayMonthBtn.addEventListener(
      "click",
      async () => {

        state.selectedMonth =
          normalizeMonth(
            new Date()
          );


        await loadPayments();

      }
    );


    // ---------------------------------------------------
    // NUEVA OBLIGACIÓN
    // ---------------------------------------------------

    els.newPaymentBtn.addEventListener(
      "click",
      () => {

        if (!isAssistant()) {
          return;
        }


        const selected =
          state.selectedMonth;


        const year =
          selected.getFullYear();


        const month =
          String(
            selected.getMonth() + 1
          ).padStart(
            2,
            "0"
          );


        els.dueDateInput.value =
          `${year}-${month}-20`;


        openModal(
          "newPaymentModal"
        );

      }
    );


    // ---------------------------------------------------
    // CERRAR MODALES
    // ---------------------------------------------------

    document
      .querySelectorAll(
        ".close-modal"
      )
      .forEach(btn => {

        btn.addEventListener(
          "click",
          () => {

            closeModal(
              btn.dataset.target
            );

          }
        );

      });


    document
      .querySelectorAll(
        ".modal"
      )
      .forEach(modal => {

        modal.addEventListener(
          "click",
          event => {

            /*
              El login no se cierra haciendo clic
              fuera del formulario.
            */
            if (
              event.target === modal &&
              modal.id !==
                "roleModal"
            ) {

              closeModal(
                modal.id
              );

            }

          }
        );

      });


    // ===================================================
    // LOGIN REAL
    // ===================================================

    els.loginForm.addEventListener(
      "submit",
      async event => {

        event.preventDefault();


        const email =
          els.emailInput.value.trim();


        const password =
          els.passwordInput.value;


        if (
          !email ||
          !password
        ) {

          showToast(
            "Ingresa correo y contraseña."
          );

          return;
        }


        try {

          const data =
            await Api.login(
              email,
              password
            );


          state.role =
            data.usuario.rol;


          state.name =
            data.usuario.nombre;


          state.email =
            data.usuario.email;


          els.passwordInput.value =
            "";


          closeModal(
            "roleModal"
          );


          applyRole();


          await loadPayments();


          showToast(
            `Bienvenido, ${state.name}.`
          );


        } catch (error) {

          showToast(
            error.message ||
            "No se pudo iniciar sesión."
          );

        }

      }
    );


    // ===================================================
    // CERRAR SESIÓN
    // ===================================================

    els.changeRoleBtn.addEventListener(
      "click",
      () => {

        Api.logout();


        state.role =
          null;

        state.name =
          "Usuario";

        state.email =
          null;

        state.payments =
          [];


        els.emailInput.value =
          "";

        els.passwordInput.value =
          "";


        applyRole();

        renderAll();

        switchView(
          "inicio"
        );


        openModal(
          "roleModal"
        );

      }
    );


    // ===================================================
    // FORMULARIO NUEVA OBLIGACIÓN
    // ===================================================

    els.newPaymentForm.addEventListener(
      "submit",
      async event => {

        event.preventDefault();


        if (!isAssistant()) {
          return;
        }


        const payload = {

          provider:
            els.providerInput.value,

          concept:
            els.conceptInput.value,

          category:
            els.categoryInput.value,

          amount:
            els.amountInput.value,

          dueDate:
            els.dueDateInput.value

        };


        if (
          !payload.provider.trim() ||
          !payload.concept.trim() ||
          !payload.category ||
          !payload.dueDate ||
          Number(
            payload.amount
          ) <= 0
        ) {

          showToast(
            "Completa correctamente todos los campos obligatorios."
          );

          return;
        }


        try {

          await Api.createPayment(
            payload
          );


          els.newPaymentForm.reset();


          closeModal(
            "newPaymentModal"
          );


          showToast(
            "Obligación registrada correctamente."
          );


          await loadPayments();


        } catch (error) {

          showToast(
            error.message ||
            "No se pudo guardar la obligación."
          );

        }

      }
    );


    // ===================================================
    // FORMULARIO REGISTRAR PAGO
    // ===================================================

    els.registerPaymentForm.addEventListener(
      "submit",
      async event => {

        event.preventDefault();


        if (!isAssistant()) {
          return;
        }


        const file =
          els.receiptInput.files[0];


        if (!file) {

          showToast(
            "Debes adjuntar un comprobante."
          );

          return;
        }


        const allowed = [

          "application/pdf",
          "image/jpeg",
          "image/png"

        ];


        if (
          !allowed.includes(
            file.type
          )
        ) {

          showToast(
            "Formato no permitido. Usa PDF, JPG, JPEG o PNG."
          );

          return;
        }


        const maxBytes =
          1.5 *
          1024 *
          1024;


        if (
          file.size >
          maxBytes
        ) {

          showToast(
            "El comprobante supera el máximo de 1.5 MB para este prototipo."
          );

          return;
        }


        try {

          const dataUrl =
            await fileToDataUrl(
              file
            );


          const receipt = {

            name:
              file.name,

            type:
              file.type,

            dataUrl,

            /*
              El archivo se mantiene para poder
              enviarlo al backend real cuando
              USE_MOCK_API sea false.
            */
            file

          };


          await Api.registerPayment(

            els.paymentIdInput.value,

            els.paidDateInput.value,

            receipt

          );


          closeModal(
            "registerPaymentModal"
          );


          showToast(
            "Pago registrado correctamente."
          );


          await loadPayments();


        } catch (error) {

          showToast(
            error.message ||
            "No se pudo registrar el pago."
          );

        }

      }
    );

  }


  // =====================================================
  // ARCHIVO A DATA URL
  // =====================================================

  function fileToDataUrl(file) {

    return new Promise(
      (resolve, reject) => {

        const reader =
          new FileReader();


        reader.onload =
          () => {

            resolve(
              reader.result
            );

          };


        reader.onerror =
          reject;


        reader.readAsDataURL(
          file
        );

      }
    );

  }


  // =====================================================
  // INICIO DE LA APLICACIÓN
  // =====================================================

  async function init() {

    cacheElements();


    state.selectedMonth =
      normalizeMonth(
        new Date()
      );


    bindStaticEvents();


    /*
      Primero dejamos la interfaz en un estado
      seguro: sin permisos de asistente.
    */
    applyRole();


    const storedUser =
      Api.getStoredUser();


    /*
      Si nunca inició sesión, mostramos login.
    */
    if (!storedUser) {

      openModal(
        "roleModal"
      );

      return;
    }


    /*
      Si encontramos una sesión almacenada,
      preguntamos al backend si todavía es válida.
    */
    try {

      const data =
        await Api.getCurrentUser();


      state.role =
        data.usuario.rol;


      state.name =
        data.usuario.nombre;


      state.email =
        data.usuario.email;


      applyRole();


      await loadPayments();


    } catch (error) {

      Api.logout();


      state.role =
        null;

      state.name =
        "Usuario";

      state.email =
        null;


      applyRole();


      openModal(
        "roleModal"
      );

    }

  }


  // =====================================================
  // API INTERNA
  // =====================================================

  return {
    init
  };

})();


document.addEventListener(
  "DOMContentLoaded",
  App.init
);