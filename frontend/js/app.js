
const App = (() => {
  const state = {
    role: localStorage.getItem("sap_demo_role") || null,
    name: localStorage.getItem("sap_demo_name") || "Usuario Demo",
    selectedMonth: new Date(),
    payments: []
  };

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

  const els = {};

  function cacheElements() {
    [
      "pageTitle","profileName","profileRole","changeRoleBtn",
      "inicioView","pagosView","heroMonth","heroCopy","goPaymentsBtn",
      "summaryTotal","summaryPaid","summaryPending","summaryOverdue","upcomingList",
      "prevMonthBtn","nextMonthBtn","todayMonthBtn","monthTitle","newPaymentBtn",
      "paymentsTotal","paymentsPaid","paymentsPending","paymentsOverdue",
      "paymentsBody","emptyState","actionsHeader",
      "roleModal","newPaymentModal","registerPaymentModal","receiptModal",
      "newPaymentForm","providerInput","conceptInput","categoryInput","amountInput","dueDateInput",
      "registerPaymentForm","paymentIdInput","paidDateInput","receiptInput","selectedPaymentInfo",
      "receiptContent","toast"
    ].forEach(id => els[id] = document.getElementById(id));
  }

  function normalizeMonth(date) {
    return new Date(date.getFullYear(), date.getMonth(), 1, 12, 0, 0);
  }

  function formatMonth(date) {
    const label = monthFormatter.format(date);
    return label.charAt(0).toUpperCase() + label.slice(1);
  }

  function formatDate(iso) {
    return dateFormatter.format(new Date(`${iso}T00:00:00`));
  }

  function showToast(message) {
    els.toast.textContent = message;
    els.toast.classList.remove("hidden");
    window.clearTimeout(showToast.timer);
    showToast.timer = window.setTimeout(() => els.toast.classList.add("hidden"), 2600);
  }

  function openModal(id) {
    document.getElementById(id).classList.remove("hidden");
  }

  function closeModal(id) {
    document.getElementById(id).classList.add("hidden");
  }

  function statusClass(status) {
    if (status === "Pagado") return "paid";
    if (status === "Vencido") return "overdue";
    return "pending";
  }

  function isAssistant() {
    return state.role === "ASISTENTE";
  }

  function applyRole() {
    const assistant = isAssistant();
    els.profileName.textContent = assistant ? "Asistente Demo" : "Gerente Demo";
    els.profileRole.textContent = assistant ? "Asistente" : "Gerente";
    els.changeRoleBtn.textContent = assistant ? "AS" : "GE";

    document.querySelectorAll(".assistant-only").forEach(el => {
      el.classList.toggle("hidden", !assistant);
    });

    els.actionsHeader.textContent = assistant ? "Acción" : "";
    els.heroCopy.textContent = assistant
      ? "Revisa qué debes pagar este mes y registra los pagos realizados."
      : "Revisa rápidamente qué pagos están pendientes, pagados o vencidos.";
  }

  function switchView(viewName) {
    const isInicio = viewName === "inicio";
    els.inicioView.classList.toggle("active", isInicio);
    els.pagosView.classList.toggle("active", !isInicio);
    document.querySelectorAll(".nav-item").forEach(btn => {
      btn.classList.toggle("active", btn.dataset.view === viewName);
    });
    els.pageTitle.textContent = isInicio ? "Resumen del mes" : "Pagos del mes";
  }

  async function loadPayments() {
    const d = state.selectedMonth;
    state.payments = await Api.listPayments(d.getFullYear(), d.getMonth());
    renderAll();
  }

  function calcSummary(payments) {
    const total = payments.reduce((s,p) => s + Number(p.amount || 0), 0);
    const paid = payments.filter(p => p.status === "Pagado")
      .reduce((s,p) => s + Number(p.amount || 0), 0);
    const pending = payments.filter(p => p.status === "Pendiente")
      .reduce((s,p) => s + Number(p.amount || 0), 0);
    const overdue = payments.filter(p => p.status === "Vencido")
      .reduce((s,p) => s + Number(p.amount || 0), 0);
    return { total, paid, pending, overdue };
  }

  function renderSummary() {
    const summary = calcSummary(state.payments);
    els.heroMonth.textContent = formatMonth(new Date());
    els.monthTitle.textContent = formatMonth(state.selectedMonth);

    const map = [
      [els.summaryTotal, summary.total],
      [els.summaryPaid, summary.paid],
      [els.summaryPending, summary.pending],
      [els.summaryOverdue, summary.overdue],
      [els.paymentsTotal, summary.total],
      [els.paymentsPaid, summary.paid],
      [els.paymentsPending, summary.pending],
      [els.paymentsOverdue, summary.overdue],
    ];
    map.forEach(([el, value]) => el.textContent = moneyFormatter.format(value));
  }

  function renderUpcoming() {
    const now = new Date();
    const nowMonthPayments = state.payments
      .filter(p => p.status !== "Pagado")
      .slice(0, 4);

    els.upcomingList.innerHTML = "";
    if (!nowMonthPayments.length) {
      const div = document.createElement("div");
      div.className = "empty-state";
      div.innerHTML = "<strong>No tienes pagos pendientes en este mes</strong><span>Los próximos vencimientos aparecerán aquí.</span>";
      els.upcomingList.appendChild(div);
      return;
    }

    nowMonthPayments.forEach(p => {
      const div = document.createElement("div");
      div.className = "simple-item";
      div.innerHTML = `
        <div>
          <strong>${escapeHtml(p.provider)}</strong>
          <span>${escapeHtml(p.concept)}</span>
        </div>
        <div>
          <strong>${formatDate(p.dueDate)}</strong>
          <span>Vencimiento</span>
        </div>
        <span class="status ${statusClass(p.status)}">${p.status}</span>
      `;
      els.upcomingList.appendChild(div);
    });
  }

  function renderTable() {
    els.paymentsBody.innerHTML = "";
    els.emptyState.classList.toggle("hidden", state.payments.length > 0);

    state.payments.forEach(payment => {
      const tr = document.createElement("tr");

      const receiptHtml = payment.receipt
        ? `<button class="link-btn view-receipt" data-id="${payment.id}">Ver comprobante</button>`
        : `<span class="muted">—</span>`;

      const actionHtml = isAssistant() && payment.status !== "Pagado"
        ? `<button class="action-btn register-payment" data-id="${payment.id}">Registrar pago</button>`
        : "";

      const dueDateHtml = isAssistant()
        ? `<button class="date-button edit-date" data-id="${payment.id}" data-date="${payment.dueDate}">${formatDate(payment.dueDate)}</button>`
        : `<span>${formatDate(payment.dueDate)}</span>`;

      tr.innerHTML = `
        <td>${escapeHtml(payment.provider)}</td>
        <td>${escapeHtml(payment.concept)}</td>
        <td>${escapeHtml(payment.category)}</td>
        <td>${dueDateHtml}</td>
        <td>${moneyFormatter.format(Number(payment.amount))}</td>
        <td><span class="status ${statusClass(payment.status)}">${payment.status}</span></td>
        <td>${receiptHtml}</td>
        <td>${actionHtml}</td>
      `;
      els.paymentsBody.appendChild(tr);
    });

    bindDynamicActions();
  }

  function renderAll() {
    renderSummary();
    renderUpcoming();
    renderTable();
  }

  function bindDynamicActions() {
    document.querySelectorAll(".edit-date").forEach(btn => {
      btn.addEventListener("click", async () => {
        if (!isAssistant()) return;
        const current = btn.dataset.date;
        const next = window.prompt("Nueva fecha de vencimiento (AAAA-MM-DD):", current);
        if (!next || next === current) return;
        if (!/^\d{4}-\d{2}-\d{2}$/.test(next)) {
          showToast("Ingresa una fecha válida con formato AAAA-MM-DD.");
          return;
        }
        try {
          await Api.updateDueDate(btn.dataset.id, next);
          showToast("Fecha de vencimiento actualizada.");
          await loadPayments();
        } catch (err) {
          showToast(err.message || "No se pudo actualizar la fecha.");
        }
      });
    });

    document.querySelectorAll(".register-payment").forEach(btn => {
      btn.addEventListener("click", async () => {
        const payment = await Api.getPayment(btn.dataset.id);
        els.paymentIdInput.value = payment.id;
        els.paidDateInput.value = new Date().toISOString().slice(0, 10);
        els.receiptInput.value = "";
        els.selectedPaymentInfo.innerHTML =
          `<strong>${escapeHtml(payment.provider)} — ${escapeHtml(payment.concept)}</strong><br>` +
          `<span>${moneyFormatter.format(Number(payment.amount))} · vence ${formatDate(payment.dueDate)}</span>`;
        openModal("registerPaymentModal");
      });
    });

    document.querySelectorAll(".view-receipt").forEach(btn => {
      btn.addEventListener("click", async () => {
        const payment = await Api.getPayment(btn.dataset.id);
        renderReceipt(payment);
        openModal("receiptModal");
      });
    });
  }

  function renderReceipt(payment) {
    const receipt = payment.receipt;
    if (!receipt) {
      els.receiptContent.innerHTML = `<div class="receipt-box"><strong>No existe comprobante</strong></div>`;
      return;
    }

    let preview = "";
    if (receipt.type && receipt.type.startsWith("image/")) {
      preview = `<img class="receipt-preview" src="${receipt.dataUrl}" alt="Comprobante de pago" />`;
    } else if (receipt.type === "application/pdf") {
      preview = `<iframe class="pdf-frame" src="${receipt.dataUrl}" title="Comprobante PDF"></iframe>`;
    } else if (receipt.dataUrl) {
      preview = `<a class="btn btn-secondary" href="${receipt.dataUrl}" target="_blank" rel="noopener">Abrir archivo</a>`;
    }

    els.receiptContent.innerHTML = `
      <div class="receipt-box">
        <strong>${escapeHtml(receipt.name)}</strong>
        <span>${escapeHtml(payment.provider)} · ${escapeHtml(payment.concept)}</span>
        ${preview}
      </div>
    `;
  }

  function escapeHtml(value) {
    return String(value ?? "")
      .replaceAll("&","&amp;")
      .replaceAll("<","&lt;")
      .replaceAll(">","&gt;")
      .replaceAll('"',"&quot;")
      .replaceAll("'","&#039;");
  }

  function bindStaticEvents() {
    document.querySelectorAll(".nav-item").forEach(btn => {
      btn.addEventListener("click", () => switchView(btn.dataset.view));
    });

    els.goPaymentsBtn.addEventListener("click", () => switchView("pagos"));

    els.prevMonthBtn.addEventListener("click", async () => {
      state.selectedMonth = new Date(state.selectedMonth.getFullYear(), state.selectedMonth.getMonth() - 1, 1);
      await loadPayments();
    });

    els.nextMonthBtn.addEventListener("click", async () => {
      state.selectedMonth = new Date(state.selectedMonth.getFullYear(), state.selectedMonth.getMonth() + 1, 1);
      await loadPayments();
    });

    els.todayMonthBtn.addEventListener("click", async () => {
      state.selectedMonth = normalizeMonth(new Date());
      await loadPayments();
    });

    els.newPaymentBtn.addEventListener("click", () => {
      const selected = state.selectedMonth;
      const y = selected.getFullYear();
      const m = String(selected.getMonth() + 1).padStart(2, "0");
      els.dueDateInput.value = `${y}-${m}-20`;
      openModal("newPaymentModal");
    });

    document.querySelectorAll(".close-modal").forEach(btn => {
      btn.addEventListener("click", () => closeModal(btn.dataset.target));
    });

    document.querySelectorAll(".modal").forEach(modal => {
      modal.addEventListener("click", e => {
        if (e.target === modal && modal.id !== "roleModal") closeModal(modal.id);
      });
    });

    els.changeRoleBtn.addEventListener("click", () => openModal("roleModal"));

    document.querySelectorAll(".role-card").forEach(btn => {
      btn.addEventListener("click", async () => {
        state.role = btn.dataset.role;
        localStorage.setItem("sap_demo_role", state.role);
        closeModal("roleModal");
        applyRole();
        await loadPayments();
      });
    });

    els.newPaymentForm.addEventListener("submit", async e => {
      e.preventDefault();
      if (!isAssistant()) return;

      const payload = {
        provider: els.providerInput.value,
        concept: els.conceptInput.value,
        category: els.categoryInput.value,
        amount: els.amountInput.value,
        dueDate: els.dueDateInput.value
      };

      if (!payload.provider.trim() || !payload.concept.trim() || !payload.category || !payload.dueDate || Number(payload.amount) <= 0) {
        showToast("Completa correctamente todos los campos obligatorios.");
        return;
      }

      try {
        await Api.createPayment(payload);
        els.newPaymentForm.reset();
        closeModal("newPaymentModal");
        showToast("Pago registrado correctamente.");
        await loadPayments();
      } catch (err) {
        showToast(err.message || "No se pudo guardar la obligación.");
      }
    });

    els.registerPaymentForm.addEventListener("submit", async e => {
      e.preventDefault();
      if (!isAssistant()) return;

      const file = els.receiptInput.files[0];
      if (!file) {
        showToast("Debes adjuntar un comprobante.");
        return;
      }

      const allowed = ["application/pdf","image/jpeg","image/png"];
      if (!allowed.includes(file.type)) {
        showToast("Formato no permitido. Usa PDF, JPG, JPEG o PNG.");
        return;
      }

      const maxBytes = 1.5 * 1024 * 1024;
      if (file.size > maxBytes) {
        showToast("El comprobante supera el máximo de 1.5 MB para este prototipo.");
        return;
      }

      try {
        const dataUrl = await fileToDataUrl(file);
        const receipt = {
          name: file.name,
          type: file.type,
          dataUrl,
          file // usado solo si luego se conecta al backend real
        };
        await Api.registerPayment(
          els.paymentIdInput.value,
          els.paidDateInput.value,
          receipt
        );
        closeModal("registerPaymentModal");
        showToast("Pago registrado correctamente.");
        await loadPayments();
      } catch (err) {
        showToast(err.message || "No se pudo registrar el pago.");
      }
    });
  }

  function fileToDataUrl(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  }

  async function init() {
    cacheElements();
    state.selectedMonth = normalizeMonth(new Date());
    bindStaticEvents();

    if (!state.role) openModal("roleModal");

    applyRole();
    await loadPayments();
  }

  return { init };
})();

document.addEventListener("DOMContentLoaded", App.init);
