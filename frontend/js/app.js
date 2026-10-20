const App = (() => {
  const state = {
    role: null,
    name: "Usuario",
    email: null,
    selectedMonth: null,
    payments: [],
    activePayment: null
  };

  const els = {};
  const monthFormatter = new Intl.DateTimeFormat("es-PE", { month: "long", year: "numeric" });
  const dateFormatter = new Intl.DateTimeFormat("es-PE", { day: "2-digit", month: "2-digit", year: "numeric" });
  const moneyFormatter = new Intl.NumberFormat("es-PE", { style: "currency", currency: "PEN", minimumFractionDigits: 2 });

  function cacheElements() {
    document.querySelectorAll("[id]").forEach(el => { els[el.id] = el; });
  }

  function normalizeMonth(date) {
    return new Date(date.getFullYear(), date.getMonth(), 1, 12, 0, 0);
  }

  function formatMonth(date) {
    const value = monthFormatter.format(date);
    return value.charAt(0).toUpperCase() + value.slice(1);
  }

  function formatDate(iso) {
    if (!iso) return "—";
    return dateFormatter.format(new Date(`${iso}T00:00:00`));
  }

  function todayISO() {
    const d = new Date();
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    return `${y}-${m}-${day}`;
  }

  function escapeHtml(value) {
    return String(value ?? "")
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");
  }

  function showToast(message) {
    els.toast.textContent = message;
    els.toast.classList.remove("hidden");
    clearTimeout(showToast.timer);
    showToast.timer = setTimeout(() => els.toast.classList.add("hidden"), 3200);
  }

  function openModal(id) { document.getElementById(id)?.classList.remove("hidden"); }
  function closeModal(id) { document.getElementById(id)?.classList.add("hidden"); }
  function isAssistant() { return state.role === "ASISTENTE"; }
  function isManager() { return state.role === "GERENTE"; }

  function applyRole() {
    const authenticated = Boolean(state.role);
    els.profileName.textContent = authenticated ? (state.name || "Usuario") : "Usuario";
    els.profileRole.textContent = !authenticated ? "—" : isAssistant() ? "Asistente" : isManager() ? "Gerente" : state.role;
    document.querySelectorAll(".assistant-only").forEach(el => {
      el.classList.toggle("hidden", !authenticated || !isAssistant());
    });
    els.actionsHeader.textContent = isAssistant() ? "Acción" : "";
    els.heroCopy.textContent = isAssistant()
      ? "Controla las obligaciones del mes, registra los pagos realizados y adjunta sus comprobantes."
      : "Consulta obligaciones, estados y comprobantes del mes.";
  }

  function switchView(viewName) {
    const inicio = viewName === "inicio";
    els.inicioView.classList.toggle("active", inicio);
    els.pagosView.classList.toggle("active", !inicio);
    document.querySelectorAll(".nav-item").forEach(btn => {
      btn.classList.toggle("active", btn.dataset.view === viewName);
    });
    els.pageTitle.textContent = inicio ? "Resumen del mes" : "Pagos del mes";
  }

  async function loadPayments() {
    const d = state.selectedMonth;
    state.payments = await Api.listPayments(d.getFullYear(), d.getMonth());
    renderAll();
  }

  function displayAmount(payment) {
    if (payment.status === "Pagado" && payment.receipt?.paidAmount > 0) {
      return Number(payment.receipt.paidAmount);
    }
    return Number(payment.currentTotal ?? payment.amount ?? 0);
  }

  function calcSummary(payments) {
    return payments.reduce((acc, p) => {
      const value = displayAmount(p);
      acc.total += value;
      if (p.status === "Pagado") acc.paid += value;
      else if (p.status === "Vencido") acc.overdue += value;
      else acc.pending += value;
      return acc;
    }, { total: 0, paid: 0, pending: 0, overdue: 0 });
  }

  function renderSummary() {
    const s = calcSummary(state.payments);
    els.heroMonth.textContent = formatMonth(new Date());
    els.monthTitle.textContent = formatMonth(state.selectedMonth);
    [
      [els.summaryTotal, s.total], [els.summaryPaid, s.paid],
      [els.summaryPending, s.pending], [els.summaryOverdue, s.overdue],
      [els.paymentsTotal, s.total], [els.paymentsPaid, s.paid],
      [els.paymentsPending, s.pending], [els.paymentsOverdue, s.overdue]
    ].forEach(([el, val]) => { el.textContent = moneyFormatter.format(val); });
  }

  function statusClass(status) {
    if (status === "Pagado") return "paid";
    if (status === "Vencido") return "overdue";
    return "pending";
  }

  function verificationLabel(status) {
    if (status === "APROBADO") return "Aprobado";
    if (status === "RECHAZADO") return "Rechazado";
    return "Pendiente";
  }

  function verificationClass(status) {
    if (status === "APROBADO") return "verification-approved";
    if (status === "RECHAZADO") return "verification-rejected";
    return "verification-pending";
  }

  function renderUpcoming() {
    const payments = state.payments.filter(p => p.status !== "Pagado").slice(0, 4);
    els.upcomingList.innerHTML = "";
    if (!payments.length) {
      els.upcomingList.innerHTML = '<div class="empty-state"><strong>No tienes pagos pendientes en este mes</strong><span>Los próximos vencimientos aparecerán aquí.</span></div>';
      return;
    }
    payments.forEach(payment => {
      const div = document.createElement("div");
      div.className = "simple-item";
      div.innerHTML = `
        <div><strong>${escapeHtml(payment.provider)}</strong><span>${escapeHtml(payment.concept)}</span></div>
        <div><strong>${moneyFormatter.format(displayAmount(payment))}</strong><span>${payment.daysLate > 0 ? `${payment.daysLate} día(s) de atraso` : `Vence ${formatDate(payment.dueDate)}`}</span></div>
        <span class="status ${statusClass(payment.status)}">${payment.status}</span>`;
      els.upcomingList.appendChild(div);
    });
  }

  function amountBreakdown(payment) {
    const total = displayAmount(payment);
    const notes = [];
    if (payment.category === "Préstamos" && payment.lateFee > 0 && payment.status !== "Pagado") {
      notes.push(`Base ${moneyFormatter.format(payment.baseAmount)} + mora ${moneyFormatter.format(payment.lateFee)}`);
    }
    if (payment.category === "Impuestos" && payment.taxSurcharge > 0) {
      notes.push(`Base ${moneyFormatter.format(payment.baseAmount)} + recargo ${moneyFormatter.format(payment.taxSurcharge)}`);
    }
    return `<strong>${moneyFormatter.format(total)}</strong>${notes.length ? `<small class="amount-note">${escapeHtml(notes.join(" · "))}</small>` : ""}`;
  }

  function renderTable() {
    els.paymentsBody.innerHTML = "";
    els.emptyState.classList.toggle("hidden", state.payments.length > 0);

    state.payments.forEach(payment => {
      const tr = document.createElement("tr");
      const receiptHtml = payment.receipt
        ? `<button class="link-btn view-receipt" data-id="${payment.id}" type="button">Ver comprobante</button>`
        : '<span class="muted">—</span>';

      const verificationHtml = payment.receipt
        ? `<span class="verification-badge ${verificationClass(payment.receipt.verificationStatus)}">${verificationLabel(payment.receipt.verificationStatus)}</span>`
        : '<span class="muted">—</span>';

      let actionHtml = "";
      if (isAssistant() && payment.status !== "Pagado") {
        const verification = payment.receipt?.verificationStatus;
        if (verification === "PENDIENTE") {
          actionHtml = `<span class="review-state">En revisión</span>`;
        } else {
          const correction = verification === "RECHAZADO";
          actionHtml = `<button class="action-btn register-payment" data-id="${payment.id}" type="button">${correction ? "Corregir pago" : "Registrar pago"}</button>`;
        }
      }

      const dueDateHtml = `<span>${formatDate(payment.dueDate)}</span>`;

      const conceptExtra = payment.category === "Préstamos" && payment.loan?.mode === "CUOTAS"
        ? `<small class="amount-note">Cuota ${payment.loan.installmentNumber}/${payment.loan.installments}</small>`
        : payment.category === "Impuestos" && payment.tax
          ? `<small class="amount-note">${escapeHtml(payment.tax.type || "")} · ${escapeHtml(payment.tax.period || "")}</small>`
          : "";

      tr.innerHTML = `
        <td>${escapeHtml(payment.provider)}</td>
        <td>${escapeHtml(payment.concept)}${conceptExtra}</td>
        <td>${escapeHtml(payment.category)}</td>
        <td>${dueDateHtml}${payment.daysLate > 0 && payment.status !== "Pagado" ? `<small class="amount-note overdue-text">${payment.daysLate} día(s) tarde</small>` : ""}</td>
        <td class="amount-cell">${amountBreakdown(payment)}</td>
        <td><span class="status ${statusClass(payment.status)}">${payment.status}</span></td>
        <td>${receiptHtml}</td>
        <td class="verification-cell">${verificationHtml}</td>
        <td>${actionHtml}</td>`;
      els.paymentsBody.appendChild(tr);
    });

    bindDynamicActions();
  }

  function renderAll() {
    renderSummary();
    renderUpcoming();
    renderTable();
  }

  function daysBetween(fromISO, toISO) {
    if (!fromISO || !toISO || toISO <= fromISO) return 0;
    const a = new Date(`${fromISO}T00:00:00Z`);
    const b = new Date(`${toISO}T00:00:00Z`);
    return Math.max(0, Math.floor((b - a) / 86400000));
  }

  function expectedAmountForPayment(payment, paidDate) {
    let total = Number(payment.baseAmount ?? payment.amount ?? 0);
    if (payment.category === "Impuestos") total += Number(payment.taxSurcharge || 0);
    if (payment.category === "Préstamos" && payment.loan?.hasLateFee) {
      const days = daysBetween(payment.dueDate, paidDate);
      total += Number(payment.baseAmount || payment.amount) * (Number(payment.loan.lateFeeDailyRate || 0) / 100) * days;
    }
    return Math.round((total + Number.EPSILON) * 100) / 100;
  }

  function refreshPaidAmount() {
    if (!state.activePayment) return;
    els.paidAmountInput.value = expectedAmountForPayment(state.activePayment, els.paidDateInput.value).toFixed(2);
  }

  async function openRegisterPayment(payment) {
    state.activePayment = payment;
    els.paymentIdInput.value = payment.id;
    els.paidDateInput.value = todayISO();
    els.paymentMethodInput.value = "";
    els.payerNameInput.value = state.name || "";
    els.operationCodeInput.value = "";
    els.cardBrandInput.value = "";
    els.cardLast4Input.value = "";
    els.bankOriginInput.value = "";
    els.receiptInput.value = "";
    refreshPaidAmount();
    updatePaymentMethodFields();

    els.selectedPaymentInfo.innerHTML = `
      <strong>${escapeHtml(payment.provider)} — ${escapeHtml(payment.concept)}</strong><br>
      <span>Total para hoy: ${moneyFormatter.format(expectedAmountForPayment(payment, todayISO()))} · vence ${formatDate(payment.dueDate)}</span>
      ${payment.receipt?.verificationStatus === "RECHAZADO" ? `<div class="rejection-note">Comprobante anterior rechazado: ${escapeHtml(payment.receipt.rejectionReason || "Sin motivo")}</div>` : ""}`;
    openModal("registerPaymentModal");
  }

  function bindDynamicActions() {
    document.querySelectorAll(".register-payment").forEach(btn => {
      btn.addEventListener("click", async () => {
        try {
          const payment = state.payments.find(p => p.id === btn.dataset.id) || await Api.getPayment(btn.dataset.id);
          await openRegisterPayment(payment);
        } catch (error) { showToast(error.message || "No se pudo cargar la obligación."); }
      });
    });

    document.querySelectorAll(".view-receipt").forEach(btn => {
      btn.addEventListener("click", async () => {
        try {
          const payment = state.payments.find(p => p.id === btn.dataset.id) || await Api.getPayment(btn.dataset.id);
          const receipt = await Api.getReceipt(btn.dataset.id);
          renderReceipt(payment, receipt);
          openModal("receiptModal");
        } catch (error) { showToast(error.message || "No se pudo abrir el comprobante."); }
      });
    });
  }

  function renderReceipt(payment, receipt) {
    if (!receipt) {
      els.receiptContent.innerHTML = '<div class="receipt-box"><strong>No existe comprobante</strong></div>';
      return;
    }

    let preview = "";
    if (receipt.type?.startsWith("image/") && receipt.url) {
      preview = `<img class="receipt-preview" src="${receipt.url}" alt="Comprobante de pago" />`;
    } else if (receipt.type === "application/pdf" && receipt.url) {
      preview = `<iframe class="pdf-frame" src="${receipt.url}" title="Comprobante PDF"></iframe>`;
    } else if (receipt.url) {
      preview = `<a class="btn btn-secondary" href="${receipt.url}" target="_blank" rel="noopener">Abrir archivo</a>`;
    }

    let methodDetail = "";
    if (receipt.method === "TARJETA") methodDetail = `${receipt.cardBrand || "Tarjeta"} •••• ${receipt.cardLast4 || ""}`;
    if (receipt.method === "TRANSFERENCIA") methodDetail = receipt.bankOrigin || "";

    const verification = receipt.verificationStatus || "PENDIENTE";
    const managerActions = isManager() && verification === "PENDIENTE" ? `
      <div class="verification-actions">
        <label><span>Motivo si se rechaza</span><textarea id="verificationReasonInput" rows="3" placeholder="Ej. El monto de la captura no coincide con la obligación"></textarea></label>
        <div class="form-actions">
          <button id="rejectReceiptBtn" class="btn btn-danger" type="button">Rechazar comprobante</button>
          <button id="approveReceiptBtn" class="btn btn-primary" type="button">Aprobar comprobante</button>
        </div>
      </div>` : "";

    els.receiptContent.innerHTML = `
      <div class="receipt-box">
        <div class="receipt-title-row">
          <strong>${escapeHtml(receipt.name || "Comprobante")}</strong>
          <span class="verification-badge ${verificationClass(verification)}">${verificationLabel(verification)}</span>
        </div>
        <div class="receipt-details">
          <span><b>Proveedor:</b> ${escapeHtml(payment.provider)}</span>
          <span><b>Concepto:</b> ${escapeHtml(payment.concept)}</span>
          <span><b>Monto registrado:</b> ${moneyFormatter.format(receipt.paidAmount || displayAmount(payment))}</span>
          <span><b>Método:</b> ${escapeHtml(receipt.method || "No especificado")} ${methodDetail ? `· ${escapeHtml(methodDetail)}` : ""}</span>
          <span><b>Pagador:</b> ${escapeHtml(receipt.payerName || "—")}</span>
          <span><b>N.º de operación:</b> ${escapeHtml(receipt.operationCode || "—")}</span>
          <span><b>Fecha de pago declarada:</b> ${formatDate(receipt.paidDate || payment.paidDate)}</span>
          ${verification === "RECHAZADO" ? `<span class="rejection-note"><b>Motivo del rechazo:</b> ${escapeHtml(receipt.rejectionReason || "—")}</span>` : ""}
        </div>
        ${preview}
        ${managerActions}
      </div>`;

    if (isManager() && verification === "PENDIENTE") {
      document.getElementById("approveReceiptBtn")?.addEventListener("click", () => verifyReceipt(payment.id, "APROBADO"));
      document.getElementById("rejectReceiptBtn")?.addEventListener("click", () => {
        const reason = document.getElementById("verificationReasonInput")?.value.trim() || "";
        if (!reason) return showToast("Indica el motivo del rechazo.");
        verifyReceipt(payment.id, "RECHAZADO", reason);
      });
    }
  }

  async function verifyReceipt(id, estado, motivo = "") {
    try {
      const result = await Api.verifyReceipt(id, estado, motivo);
      closeModal("receiptModal");
      showToast(result.mensaje || "Comprobante actualizado.");
      await loadPayments();
    } catch (error) { showToast(error.message || "No se pudo verificar el comprobante."); }
  }

  function updatePaymentMethodFields() {
    const method = els.paymentMethodInput.value;
    const showsOperation = ["YAPE", "TARJETA", "TRANSFERENCIA", "EFECTIVO"].includes(method);
    const operationRequired = ["YAPE", "TARJETA", "TRANSFERENCIA"].includes(method);
    const isCard = method === "TARJETA";
    const isTransfer = method === "TRANSFERENCIA";

    els.operationCodeField.classList.toggle("hidden", !showsOperation);
    els.cardBrandField.classList.toggle("hidden", !isCard);
    els.cardLast4Field.classList.toggle("hidden", !isCard);
    els.bankOriginField.classList.toggle("hidden", !isTransfer);
    els.operationCodeInput.required = operationRequired;
    els.cardBrandInput.required = isCard;
    els.cardLast4Input.required = isCard;
    els.bankOriginInput.required = isTransfer;

    els.operationCodeInput.removeAttribute("pattern");
    els.operationCodeInput.removeAttribute("inputmode");
    els.operationCodeInput.maxLength = 30;
    els.operationCodeInput.placeholder = "";
    els.operationCodeHint.textContent = "";

    let help = "";
    if (method === "YAPE") {
      els.operationCodeLabel.textContent = "N.º de operación Yape *";
      els.operationCodeInput.maxLength = 8;
      els.operationCodeInput.setAttribute("inputmode", "numeric");
      els.operationCodeInput.setAttribute("pattern", "[0-9]{8}");
      els.operationCodeInput.placeholder = "Ej. 34758141";
      els.operationCodeHint.textContent = "Exactamente 8 dígitos numéricos.";
      help = "Registra el número de operación y adjunta la captura emitida por Yape.";
    } else if (method === "TARJETA") {
      els.operationCodeLabel.textContent = "Código de autorización / operación *";
      els.operationCodeInput.maxLength = 20;
      els.operationCodeInput.setAttribute("pattern", "[A-Za-z0-9-]{1,20}");
      els.operationCodeInput.placeholder = "Ej. AUTH-839201";
      els.operationCodeHint.textContent = "Máximo 20 caracteres: letras, números o guion.";
      help = "Solo se registran marca y últimos 4 dígitos; nunca CVV ni número completo.";
    } else if (method === "TRANSFERENCIA") {
      els.operationCodeLabel.textContent = "N.º de operación / referencia *";
      els.operationCodeInput.maxLength = 30;
      els.operationCodeInput.setAttribute("pattern", "[A-Za-z0-9-]{1,30}");
      els.operationCodeInput.placeholder = "Ej. TRX-20261020-583921";
      els.operationCodeHint.textContent = "Máximo 30 caracteres: letras, números o guion.";
      help = "Registra la referencia y adjunta la constancia del banco.";
    } else if (method === "EFECTIVO") {
      els.operationCodeLabel.textContent = "N.º de recibo / referencia (opcional)";
      els.operationCodeInput.maxLength = 30;
      els.operationCodeInput.setAttribute("pattern", "[A-Za-z0-9-]{0,30}");
      els.operationCodeInput.placeholder = "Ej. REC-001258";
      els.operationCodeHint.textContent = "Opcional. Máximo 30 caracteres.";
      help = "Adjunta el recibo o constancia correspondiente al pago en efectivo.";
    } else if (method === "OTRO") {
      help = "Adjunta evidencia que permita al gerente verificar el pago.";
    }
    els.paymentMethodHelp.textContent = help;
    els.paymentMethodHelp.classList.toggle("hidden", !help);
  }

  function loanPaymentEstimate(capital, ratePct, installments) {
    const p = Number(capital);
    const n = Number(installments);
    const i = Number(ratePct) / 100;
    if (!(p > 0) || !(n > 0) || !(i >= 0)) return 0;
    if (i === 0) return p / n;
    return p * (i * Math.pow(1 + i, n)) / (Math.pow(1 + i, n) - 1);
  }

  function updateLoanPreview() {
    if (els.categoryInput.value !== "Préstamos") return;
    const mode = els.loanModeInput.value;
    const capital = Number(els.loanCapitalInput.value || 0);
    const hasInterest = els.loanHasInterestInput.value === "SI";
    const rate = hasInterest ? Number(els.loanInterestRateInput.value || 0) : 0;
    const hasLate = els.loanHasLateFeeInput.value === "SI";

    if (mode === "CUOTAS") {
      const n = Number(els.loanInstallmentsInput.value || 0);
      const quota = loanPaymentEstimate(capital, rate, n);
      els.loanPreview.innerHTML = capital > 0 && n > 0
        ? `<strong>Vista previa:</strong> ${n} cuota(s) aproximadas de <b>${moneyFormatter.format(quota)}</b>.${hasLate ? ` Mora diaria: ${escapeHtml(els.loanLateFeeRateInput.value || "0")}% sobre la cuota vencida.` : ""}`
        : "";
    } else {
      const total = capital * (1 + rate / 100);
      els.loanPreview.innerHTML = capital > 0
        ? `<strong>Vista previa:</strong> total pactado <b>${moneyFormatter.format(total)}</b>.${hasLate ? ` Mora diaria: ${escapeHtml(els.loanLateFeeRateInput.value || "0")}% después del vencimiento.` : ""}`
        : "";
    }
  }

  function updateCategoryFields() {
    const category = els.categoryInput.value;
    const isLoan = category === "Préstamos";
    const isTax = category === "Impuestos";
    els.loanFields.classList.toggle("hidden", !isLoan);
    els.taxFields.classList.toggle("hidden", !isTax);
    els.amountField.classList.toggle("hidden", isLoan);
    els.amountInput.required = !isLoan;
    els.amountLabel.textContent = isTax ? "Monto del impuesto (S/) *" : "Monto (S/) *";
    els.loanCapitalInput.required = isLoan;
    els.taxTypeInput.required = isTax;
    els.taxPeriodInput.required = isTax;
    els.dueDateLabel.textContent = isLoan && els.loanModeInput.value === "CUOTAS" ? "Fecha de primera cuota *" : "Fecha de vencimiento *";
    updateLoanFields();
  }

  function updateLoanFields() {
    const isLoan = els.categoryInput.value === "Préstamos";
    const installments = isLoan && els.loanModeInput.value === "CUOTAS";
    const hasInterest = isLoan && els.loanHasInterestInput.value === "SI";
    const hasLateFee = isLoan && els.loanHasLateFeeInput.value === "SI";

    els.loanInstallmentsField.classList.toggle("hidden", !installments);
    els.loanFrequencyField.classList.toggle("hidden", !installments);
    els.loanInterestRateField.classList.toggle("hidden", !hasInterest);
    els.loanLateFeeRateField.classList.toggle("hidden", !hasLateFee);
    els.loanInstallmentsInput.required = installments;
    els.loanFrequencyInput.required = installments;
    els.loanInterestRateInput.required = hasInterest;
    els.loanLateFeeRateInput.required = hasLateFee;
    els.loanInterestRateLabel.textContent = installments
      ? "Tasa efectiva por periodo de cuota (%) *"
      : "Interés total pactado (%) *";
    els.dueDateLabel.textContent = installments ? "Fecha de primera cuota *" : "Fecha de vencimiento *";
    updateLoanPreview();
  }

  function buildNewObligationPayload() {
    const category = els.categoryInput.value;
    const payload = {
      provider: els.providerInput.value.trim(),
      concept: els.conceptInput.value.trim(),
      category,
      dueDate: els.dueDateInput.value
    };

    if (category === "Préstamos") {
      payload.loanMode = els.loanModeInput.value;
      payload.loanCapital = els.loanCapitalInput.value;
      payload.loanHasInterest = els.loanHasInterestInput.value === "SI";
      payload.loanInterestRate = payload.loanHasInterest ? els.loanInterestRateInput.value : 0;
      payload.loanInstallments = els.loanInstallmentsInput.value;
      payload.loanFrequency = els.loanFrequencyInput.value;
      payload.loanHasLateFee = els.loanHasLateFeeInput.value === "SI";
      payload.loanLateFeeRate = payload.loanHasLateFee ? els.loanLateFeeRateInput.value : 0;
      payload.amount = els.loanCapitalInput.value;
    } else {
      payload.amount = els.amountInput.value;
    }

    if (category === "Impuestos") {
      payload.taxType = els.taxTypeInput.value.trim();
      payload.taxPeriod = els.taxPeriodInput.value.trim();
      payload.taxOrder = els.taxOrderInput.value.trim();
      payload.taxSurcharge = els.taxSurchargeInput.value || 0;
    }
    return payload;
  }

  function resetNewObligationForm() {
    els.newPaymentForm.reset();
    els.taxSurchargeInput.value = "0";
    els.loanInstallmentsInput.value = "12";
    els.loanInterestRateInput.value = "0";
    els.loanLateFeeRateInput.value = "0.10";
    updateCategoryFields();
  }

  function bindStaticEvents() {
    document.querySelectorAll(".nav-item").forEach(btn => btn.addEventListener("click", () => switchView(btn.dataset.view)));
    els.goPaymentsBtn.addEventListener("click", () => switchView("pagos"));

    els.prevMonthBtn.addEventListener("click", async () => {
      state.selectedMonth = normalizeMonth(new Date(state.selectedMonth.getFullYear(), state.selectedMonth.getMonth() - 1, 1));
      await loadPayments();
    });
    els.nextMonthBtn.addEventListener("click", async () => {
      state.selectedMonth = normalizeMonth(new Date(state.selectedMonth.getFullYear(), state.selectedMonth.getMonth() + 1, 1));
      await loadPayments();
    });
    els.todayMonthBtn.addEventListener("click", async () => {
      state.selectedMonth = normalizeMonth(new Date());
      await loadPayments();
    });

    els.newPaymentBtn.addEventListener("click", () => {
      if (!isAssistant()) return;
      resetNewObligationForm();
      const y = state.selectedMonth.getFullYear();
      const m = String(state.selectedMonth.getMonth() + 1).padStart(2, "0");
      const candidate = `${y}-${m}-20`;
      const today = todayISO();
      els.dueDateInput.min = today;
      els.dueDateInput.value = candidate < today ? today : candidate;
      openModal("newPaymentModal");
    });

    document.querySelectorAll(".close-modal").forEach(btn => {
      btn.addEventListener("click", () => closeModal(btn.dataset.target));
    });

    els.categoryInput.addEventListener("change", updateCategoryFields);
    [els.loanModeInput, els.loanHasInterestInput, els.loanHasLateFeeInput].forEach(el => el.addEventListener("change", updateLoanFields));
    [els.loanCapitalInput, els.loanInterestRateInput, els.loanInstallmentsInput, els.loanLateFeeRateInput].forEach(el => el.addEventListener("input", updateLoanPreview));
    els.loanFrequencyInput.addEventListener("change", updateLoanPreview);

    els.paymentMethodInput.addEventListener("change", updatePaymentMethodFields);
    els.paidDateInput.addEventListener("change", refreshPaidAmount);



    els.loginForm.addEventListener("submit", async event => {
      event.preventDefault();
      try {
        const data = await Api.login(els.emailInput.value.trim(), els.passwordInput.value);
        state.role = data.usuario.rol;
        state.name = data.usuario.nombre;
        state.email = data.usuario.email;
        els.passwordInput.value = "";
        closeModal("roleModal");
        applyRole();
        await loadPayments();
        showToast(`Bienvenido, ${state.name}.`);
      } catch (error) { showToast(error.message || "No se pudo iniciar sesión."); }
    });

    els.changeRoleBtn.addEventListener("click", () => {
      Api.logout();
      state.role = null;
      state.name = "Usuario";
      state.email = null;
      state.payments = [];
      applyRole();
      renderAll();
      switchView("inicio");
      openModal("roleModal");
    });

    els.newPaymentForm.addEventListener("submit", async event => {
      event.preventDefault();
      if (!isAssistant()) return;

      const payload = buildNewObligationPayload();
      if (!payload.dueDate || payload.dueDate < todayISO()) {
        return showToast("La fecha de vencimiento no puede ser anterior a hoy.");
      }

      const confirmed = window.confirm("¿Estás seguro de crear esta obligación?");
      if (!confirmed) return;

      const submitButton = event.submitter || els.newPaymentForm.querySelector('button[type="submit"]');
      if (!submitButton || submitButton.disabled) return;

      const originalText = submitButton.textContent;
      submitButton.disabled = true;
      submitButton.textContent = "Guardando...";

      try {
        const result = await Api.createPayment(payload);
        closeModal("newPaymentModal");
        showToast(result.message || "Obligación registrada correctamente.");
        resetNewObligationForm();
        await loadPayments();
      } catch (error) {
        showToast(error.message || "No se pudo guardar la obligación.");
      } finally {
        submitButton.disabled = false;
        submitButton.textContent = originalText;
      }
    });

    els.registerPaymentForm.addEventListener("submit", async event => {
      event.preventDefault();
      if (!isAssistant()) return;
      const file = els.receiptInput.files[0];
      if (!file) return showToast("Debes adjuntar un comprobante.");
      if (!["application/pdf", "image/jpeg", "image/png"].includes(file.type)) return showToast("Formato no permitido. Usa PDF, JPG, JPEG o PNG.");
      if (file.size > 5 * 1024 * 1024) return showToast("El comprobante supera el máximo de 5 MB.");
      if (!els.paymentMethodInput.value) return showToast("Selecciona el método de pago.");

      const method = els.paymentMethodInput.value;
      const operation = els.operationCodeInput.value.trim();
      if (method === "YAPE" && !/^\d{8}$/.test(operation)) {
        return showToast("El número de operación de Yape debe tener exactamente 8 dígitos.");
      }
      if (method === "TARJETA" && !/^[A-Za-z0-9-]{1,20}$/.test(operation)) {
        return showToast("El código de tarjeta debe tener máximo 20 caracteres.");
      }
      if (method === "TRANSFERENCIA" && !/^[A-Za-z0-9-]{1,30}$/.test(operation)) {
        return showToast("La referencia de transferencia debe tener máximo 30 caracteres.");
      }
      if (method === "EFECTIVO" && operation && !/^[A-Za-z0-9-]{1,30}$/.test(operation)) {
        return showToast("La referencia de efectivo debe tener máximo 30 caracteres.");
      }

      try {
        const result = await Api.registerPayment(els.paymentIdInput.value, {
          paidDate: els.paidDateInput.value,
          paidAmount: els.paidAmountInput.value,
          method: els.paymentMethodInput.value,
          payerName: els.payerNameInput.value.trim(),
          operationCode: els.operationCodeInput.value.trim(),
          cardBrand: els.cardBrandInput.value,
          cardLast4: els.cardLast4Input.value.trim(),
          bankOrigin: els.bankOriginInput.value.trim(),
          file
        });
        closeModal("registerPaymentModal");
        state.activePayment = null;
        showToast(result.mensaje || "Pago registrado para revisión del gerente.");
        await loadPayments();
      } catch (error) { showToast(error.message || "No se pudo registrar el pago."); }
    });
  }

  async function init() {
    cacheElements();
    state.selectedMonth = normalizeMonth(new Date());
    els.dueDateInput.min = todayISO();
    els.paidDateInput.max = todayISO();
    bindStaticEvents();
    updateCategoryFields();
    updatePaymentMethodFields();
    applyRole();

    if (!Api.getStoredUser()) {
      openModal("roleModal");
      return;
    }

    try {
      const data = await Api.getCurrentUser();
      state.role = data.usuario.rol;
      state.name = data.usuario.nombre;
      state.email = data.usuario.email;
      applyRole();
      await loadPayments();
    } catch {
      Api.logout();
      state.role = null;
      state.name = "Usuario";
      applyRole();
      openModal("roleModal");
    }
  }

  return { init };
})();

document.addEventListener("DOMContentLoaded", App.init);
