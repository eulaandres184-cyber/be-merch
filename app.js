const currency = new Intl.NumberFormat("es-AR", { style: "currency", currency: "ARS", maximumFractionDigits: 0 });
const unitPriceFormat = new Intl.NumberFormat("es-AR", { maximumFractionDigits: 2 });
const legacyStorageKey = "be-merch-quote-v1";
const quotesKey = "be-merch-quotes-v1";
const $ = (selector) => document.querySelector(selector);
const list = $("#items-list");
const template = $("#item-template");
const fields = ["project-name", "issue-date", "due-date", "payment-terms", "delivery-time", "notes", "tax-rate"];
let activeQuoteId = null;

function parseAmount(value) {
  const normalized = String(value ?? "").trim().replace(/\s/g, "").replace(/[^\d.,-]/g, "");
  if (normalized.includes(",")) return Number(normalized.replace(/\./g, "").replace(",", ".")) || 0;
  if (/^-?\d{1,3}(\.\d{3})+$/.test(normalized)) return Number(normalized.replace(/\./g, "")) || 0;
  return Number(normalized) || 0;
}
function formatMoney(value) { return currency.format(Number(value) || 0); }
function formatUnitPrice(value) { return unitPriceFormat.format(parseAmount(value)); }
function localDateValue(date = new Date()) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}
function getQuotes() { return JSON.parse(localStorage.getItem(quotesKey) || "[]"); }
function saveQuotes(quotes) { localStorage.setItem(quotesKey, JSON.stringify(quotes)); }
function quoteTotal(data) {
  const subtotal = data.items.reduce((sum, item) => sum + (Number(item.quantity) || 0) * parseAmount(item.price), 0);
  return subtotal * (1 + (Number(data.fields["tax-rate"]) || 0) / 100);
}

function calculate() {
  let subtotal = 0;
  [...list.children].forEach((row) => {
    const total = (Number(row.querySelector(".item-quantity").value) || 0) * parseAmount(row.querySelector(".item-price").value);
    row.querySelector(".item-total").textContent = formatMoney(total);
    subtotal += total;
  });
  const tax = subtotal * (Number($("#tax-rate").value) / 100);
  $("#subtotal").textContent = formatMoney(subtotal);
  $("#tax-total").textContent = formatMoney(tax);
  $("#grand-total").textContent = formatMoney(subtotal + tax);
  $("#summary-count").textContent = `${list.children.length} ÍTEM${list.children.length === 1 ? "" : "S"}`;
  renderDoc();
  save();
}

const escapeHtml = (text) => String(text ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);
const formatDate = (iso) => iso ? iso.split("-").reverse().join("/") : "-";
const contacts = [{ name: "Lua", phone: "2336419074" }, { name: "Andres", phone: "2302566844" }];
// Prefijo 549: código de país de Argentina para móviles en WhatsApp.
const contactLink = (contact, quoteName) => `https://wa.me/549${contact.phone}?text=${encodeURIComponent(`Te escribo por el presupuesto de ${quoteName}...`)}`;

function renderDoc() {
  const data = state();
  const f = data.fields;
  const doc = $("#quote-doc");
  doc.style.setProperty("--dk", "#006B54");
  doc.style.setProperty("--ac", "#ffffff");
  doc.style.setProperty("--sf", "#f5f5f5");
  doc.style.setProperty("--head-fg", "#ffffff");
  const subtotal = data.items.reduce((sum, item) => sum + (Number(item.quantity) || 0) * parseAmount(item.price), 0);
  const taxRate = Number(f["tax-rate"]) || 0;
  const rows = data.items.filter((item) => item.description.trim() || parseAmount(item.price)).map((item, i) => {
    const qty = Number(item.quantity) || 0;
    const price = parseAmount(item.price);
    return `<tr><td class="d-n">${String(i + 1).padStart(2, "0")}</td><td>${escapeHtml(item.description)}</td><td class="d-r">${qty}</td><td class="d-r">${formatMoney(price)}</td><td class="d-r d-b">${formatMoney(qty * price)}</td></tr>`;
  }).join("");
  doc.innerHTML = `
    <header class="d-head">
      <img src="img/Logo BE Merch largo.png" alt="BE MERCH" />
      <div><span>PRESUPUESTO</span><strong>${escapeHtml($("#quote-number").textContent)}</strong></div>
    </header>
    <div class="d-stripe"></div>
    <section class="d-intro">
      <div><span class="d-label">NOMBRE DEL PROYECTO</span><h2>${escapeHtml(f["project-name"] || "Proyecto sin nombre")}</h2>
        </div>
      <div class="d-dates"><div><span class="d-label">EMISIÓN</span><b>${formatDate(f["issue-date"])}</b></div><div><span class="d-label">VÁLIDO HASTA</span><b>${formatDate(f["due-date"])}</b></div></div>
    </section>
    <table class="d-table"><thead><tr><th>#</th><th>DESCRIPCIÓN</th><th class="d-r">CANT.</th><th class="d-r">PRECIO UNIT.</th><th class="d-r">TOTAL</th></tr></thead><tbody>${rows}</tbody></table>
    <section class="d-bottom">
      <div class="d-terms">
        <span class="d-label">CONDICIONES DE PAGO</span><p>${escapeHtml(f["payment-terms"])}</p>
        <span class="d-label">TIEMPO DE ENTREGA</span><p>${escapeHtml(f["delivery-time"])}</p>
        ${f.notes ? `<span class="d-label">OTROS DETALLES</span><p>${escapeHtml(f.notes).replace(/\n/g, "<br>")}</p>` : ""}
      </div>
      <div class="d-totals">
        <div><span>Subtotal</span><b>${formatMoney(subtotal)}</b></div>
        <div><span>${taxRate ? `IVA ${String(taxRate).replace(".", ",")}%` : "Sin IVA"}</span><b>${formatMoney(subtotal * taxRate / 100)}</b></div>
        <div class="d-grand"><span>TOTAL</span><strong>${formatMoney(subtotal * (1 + taxRate / 100))}</strong></div>
      </div>
    </section>
    <footer class="d-foot"><b>BE MERCH</b><span>Merchandising empresarial y eventos</span><span class="d-contacts">${contacts.map((c) => `${c.name}: <a href="${contactLink(c, f["project-name"] || $("#quote-number").textContent)}" target="_blank" rel="noopener">${c.phone}</a>`).join("<br>")}</span></footer>`;
}

function addItem(item = {}) {
  const row = template.content.firstElementChild.cloneNode(true);
  row.querySelector(".item-description").value = item.description || "";
  row.querySelector(".item-quantity").value = item.quantity || 1;
  row.querySelector(".item-price").value = item.price ? formatUnitPrice(item.price) : "";
  row.querySelectorAll("input").forEach((input) => input.addEventListener("input", calculate));
  row.querySelector(".item-price").addEventListener("blur", (event) => {
    const value = event.currentTarget.value.trim();
    event.currentTarget.value = value ? formatUnitPrice(value) : "";
    calculate();
  });
  row.querySelector(".remove-item").addEventListener("click", () => {
    if (list.children.length === 1) {
      row.querySelector(".item-description").value = "";
      row.querySelector(".item-quantity").value = 1;
      row.querySelector(".item-price").value = "";
    } else row.remove();
    calculate();
  });
  list.append(row);
}

function state() {
  return {
    fields: Object.fromEntries(fields.map((id) => [id, $(`#${id}`).value])),
    items: [...list.children].map((row) => ({ description: row.querySelector(".item-description").value, quantity: row.querySelector(".item-quantity").value, price: row.querySelector(".item-price").value }))
  };
}

function save() {
  if (!activeQuoteId) return;
  const quotes = getQuotes();
  const quote = quotes.find((entry) => entry.id === activeQuoteId);
  if (!quote) return;
  quote.data = state();
  quote.updatedAt = new Date().toISOString();
  quote.total = quoteTotal(quote.data);
  saveQuotes(quotes);
}

function defaultState() {
  const today = new Date();
  const due = new Date(today);
  due.setDate(today.getDate() + 7);
  return { fields: Object.fromEntries(fields.map((id) => [id, id === "issue-date" ? localDateValue(today) : id === "due-date" ? localDateValue(due) : id === "tax-rate" ? "0" : ""])), items: [{ description: "", quantity: 1, price: "" }] };
}

function loadQuote(quote) {
  if (quote.status === "Borrador") {
    const issueDate = new Date();
    const dueDate = new Date(issueDate);
    dueDate.setDate(dueDate.getDate() + 7);
    quote.data.fields["issue-date"] = localDateValue(issueDate);
    quote.data.fields["due-date"] = localDateValue(dueDate);
  }
  activeQuoteId = quote.id;
  list.replaceChildren();
  fields.forEach((id) => { $(`#${id}`).value = quote.data.fields[id] || ""; });
  quote.data.items.forEach(addItem);
  $("#quote-number").textContent = quote.number;
  $("#editor-title").textContent = quote.data.fields["project-name"] || "Nuevo presupuesto";
  calculate();
}

function createQuote() {
  const quote = { id: crypto.randomUUID(), number: `#BM-${new Date().getFullYear()}-${String(getQuotes().length + 1).padStart(3, "0")}`, status: "Borrador", updatedAt: new Date().toISOString(), data: defaultState(), total: 0 };
  const quotes = getQuotes();
  quotes.unshift(quote);
  saveQuotes(quotes);
  loadQuote(quote);
  showEditor();
}

function migrateLegacyQuote() {
  if (getQuotes().length) return;
  const legacy = JSON.parse(localStorage.getItem(legacyStorageKey) || "null");
  if (!legacy) return;
  saveQuotes([{ id: crypto.randomUUID(), number: "#BM-2026-024", status: "Borrador", updatedAt: new Date().toISOString(), data: legacy, total: quoteTotal(legacy) }]);
  localStorage.removeItem(legacyStorageKey);
}

function renderQuotes() {
  const quotes = getQuotes().sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt));
  const container = $("#quotes-list");
  container.replaceChildren();
  $("#quotes-count").textContent = `${quotes.length} presupuesto${quotes.length === 1 ? "" : "s"}`;
  $("#empty-quotes").hidden = quotes.length > 0;
  quotes.forEach((quote) => {
    const row = $("#quote-template").content.firstElementChild.cloneNode(true);
    row.querySelector(".quote-id").textContent = quote.number;
    row.querySelector(".quote-title").textContent = quote.data.fields["project-name"] || "Proyecto sin nombre";
    row.querySelector(".quote-date").textContent = new Intl.DateTimeFormat("es-AR", { dateStyle: "medium" }).format(new Date(quote.updatedAt));
    row.querySelector(".quote-value").textContent = formatMoney(quote.total);
    const status = row.querySelector(".quote-status");
    status.value = quote.status;
    status.dataset.status = status.value;
    status.addEventListener("change", () => {
      status.dataset.status = status.value;
      const savedQuotes = getQuotes();
      savedQuotes.find((entry) => entry.id === quote.id).status = status.value;
      saveQuotes(savedQuotes);
    });
    row.querySelector(".quote-main").addEventListener("click", () => { loadQuote(quote); showEditor(); });
    container.append(row);
  });
}

function showDashboard() { $("#editor-view").hidden = true; $("#dashboard-view").hidden = false; renderQuotes(); }
function showEditor() { $("#dashboard-view").hidden = true; $("#editor-view").hidden = false; }
let toastTimer;
function notify(message) {
  const toast = $("#toast");
  toast.textContent = message;
  toast.classList.add("show");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toast.classList.remove("show"), 2800);
}

fields.forEach((id) => $(`#${id}`).addEventListener("input", save));
$("#project-name").addEventListener("input", () => {
  $("#editor-title").textContent = $("#project-name").value || "Nuevo presupuesto";
  renderDoc();
});
$("#tax-rate").addEventListener("change", calculate);
$("#add-item").addEventListener("click", () => { addItem(); calculate(); });
$("#add-item-mobile").addEventListener("click", () => { addItem(); calculate(); });
$("#save-draft").addEventListener("click", () => { save(); $("#draft-dialog").hidden = false; $("#draft-continue").focus(); });
$("#draft-continue").addEventListener("click", () => { $("#draft-dialog").hidden = true; notify("Borrador guardado correctamente."); });
$("#draft-home").addEventListener("click", () => { $("#draft-dialog").hidden = true; showDashboard(); notify("Borrador guardado correctamente."); });
$("#draft-dialog").addEventListener("click", (event) => { if (event.target === event.currentTarget) event.currentTarget.hidden = true; });

function applyTheme(dark) {
  document.documentElement.classList.toggle("dark", dark);
  $("#theme-toggle").textContent = dark ? "☀" : "☾";
  document.querySelector('meta[name="theme-color"]').content = dark ? "#121311" : "#1d1e1c";
}
$("#theme-toggle").addEventListener("click", () => {
  const dark = !document.documentElement.classList.contains("dark");
  localStorage.setItem("be-merch-theme", dark ? "dark" : "light");
  applyTheme(dark);
});
applyTheme(localStorage.getItem("be-merch-theme") === "dark");

function pdfFileName() {
  const projectName = $("#project-name").value.trim() || "Presupuesto";
  const safeProjectName = projectName.replace(/[\\/:*?"<>|]/g, "-").replace(/\s+/g, " ");
  return `${safeProjectName} - ${$("#quote-number").textContent.replace("#", "")}.pdf`;
}

function downloadBlob(blob, fileName) {
  const url = URL.createObjectURL(blob);
  const link = Object.assign(document.createElement("a"), { href: url, download: fileName });
  document.body.append(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 60000);
}

async function runWithBusyButton(button, action) {
  if (button.disabled) return;
  const label = button.innerHTML;
  button.disabled = true;
  button.setAttribute("aria-busy", "true");
  try {
    await action();
  } finally {
    button.disabled = false;
    button.removeAttribute("aria-busy");
    button.innerHTML = label;
  }
}

$("#whatsapp-quote").addEventListener("click", () => runWithBusyButton($("#whatsapp-quote"), async () => {
  save();
  notify("Preparando el PDF para compartir…");
  try {
    const blob = await buildPdf();
    const file = new File([blob], pdfFileName(), { type: "application/pdf" });
    const shareData = { files: [file], title: file.name };
    let canShareFile = typeof navigator.share === "function";
    try {
      if (canShareFile && navigator.canShare) canShareFile = navigator.canShare(shareData);
    } catch {
      canShareFile = false;
    }
    if (canShareFile) {
      try {
        await navigator.share(shareData);
        const quotes = getQuotes();
        const quote = quotes.find((entry) => entry.id === activeQuoteId);
        if (quote) { quote.status = "Enviado"; saveQuotes(quotes); }
        notify("PDF compartido.");
        return;
      } catch (error) {
        if (error.name === "AbortError") return;
        downloadBlob(blob, file.name);
        notify("No se pudo abrir compartir. PDF descargado; adjuntalo en WhatsApp.");
        return;
      }
    }
    downloadBlob(blob, file.name);
    notify("PDF descargado. Adjuntalo en el chat de WhatsApp.");
  } catch (error) {
    if (error.name === "AbortError") return;
    notify("No se pudo compartir el PDF. Probá descargarlo y adjuntarlo en WhatsApp.");
  }
}));

async function buildPdf() {
  renderDoc();
  const holder = document.createElement("div");
  holder.style.cssText = "position:fixed;left:-10000px;top:0;width:794px";
  const clone = $("#quote-doc").cloneNode(true);
  clone.style.display = "block";
  clone.removeAttribute("id");
  holder.append(clone);
  document.body.append(holder);
  try {
    await Promise.all([...clone.querySelectorAll("img")].map((img) => img.decode().catch(() => {})));
    // html2canvas ignora filter:invert, así que el logo se invierte a mano.
    const logo = clone.querySelector(".d-head img");
    if (logo) {
      const canvas = document.createElement("canvas");
      canvas.width = logo.naturalWidth;
      canvas.height = logo.naturalHeight;
      const ctx = canvas.getContext("2d");
      ctx.drawImage(logo, 0, 0);
      const pixels = ctx.getImageData(0, 0, canvas.width, canvas.height);
      for (let i = 0; i < pixels.data.length; i += 4) {
        pixels.data[i] = 255 - pixels.data[i];
        pixels.data[i + 1] = 255 - pixels.data[i + 1];
        pixels.data[i + 2] = 255 - pixels.data[i + 2];
      }
      ctx.putImageData(pixels, 0, 0);
      logo.src = canvas.toDataURL("image/png");
      logo.style.filter = "none";
      await logo.decode().catch(() => {});
    }
    return await html2pdf().set({
      margin: 0,
      image: { type: "jpeg", quality: 0.95 },
      html2canvas: { scale: 2, useCORS: true, backgroundColor: "#ffffff" },
      jsPDF: { unit: "mm", format: "a4", orientation: "portrait" }
    }).from(clone).outputPdf("blob");
  } finally {
    holder.remove();
  }
}
$("#print-quote").addEventListener("click", () => window.print());
$("#download-quote").addEventListener("click", () => runWithBusyButton($("#download-quote"), async () => {
  try {
    const blob = await buildPdf();
    downloadBlob(blob, pdfFileName());
    notify("PDF descargado.");
  } catch (error) {
    notify("No se pudo generar el PDF.");
  }
}));
$("#send-quote").addEventListener("click", () => {
  save();
  const quotes = getQuotes();
  const quote = quotes.find((entry) => entry.id === activeQuoteId);
  if (!quote) return;
  quote.status = "Enviado";
  saveQuotes(quotes);
  notify("Presupuesto marcado como enviado.");
});
$("#new-quote").addEventListener("click", createQuote);
$("#empty-new-quote").addEventListener("click", createQuote);
$("#back-to-list").addEventListener("click", showDashboard);
$(".brand").addEventListener("click", (event) => { event.preventDefault(); showDashboard(); });

migrateLegacyQuote();
showDashboard();
