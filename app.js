const currency = new Intl.NumberFormat("es-AR", { style: "currency", currency: "ARS", maximumFractionDigits: 0 });
const legacyStorageKey = "be-merch-quote-v1";
const quotesKey = "be-merch-quotes-v1";
const $ = (selector) => document.querySelector(selector);
const list = $("#items-list");
const template = $("#item-template");
const fields = ["client-name", "contact-name", "contact-email", "project-name", "issue-date", "due-date", "payment-terms", "delivery-time", "notes", "tax-rate"];
let activeQuoteId = null;

function formatMoney(value) { return currency.format(Number(value) || 0); }
function getQuotes() { return JSON.parse(localStorage.getItem(quotesKey) || "[]"); }
function saveQuotes(quotes) { localStorage.setItem(quotesKey, JSON.stringify(quotes)); }
function quoteTotal(data) {
  const subtotal = data.items.reduce((sum, item) => sum + (Number(item.quantity) || 0) * (Number(item.price) || 0), 0);
  return subtotal * (1 + (Number(data.fields["tax-rate"]) || 0) / 100);
}

function calculate() {
  let subtotal = 0;
  [...list.children].forEach((row) => {
    const total = (Number(row.querySelector(".item-quantity").value) || 0) * (Number(row.querySelector(".item-price").value) || 0);
    row.querySelector(".item-total").textContent = formatMoney(total);
    subtotal += total;
  });
  const tax = subtotal * (Number($("#tax-rate").value) / 100);
  $("#subtotal").textContent = formatMoney(subtotal);
  $("#tax-total").textContent = formatMoney(tax);
  $("#grand-total").textContent = formatMoney(subtotal + tax);
  $("#summary-count").textContent = `${list.children.length} ÍTEM${list.children.length === 1 ? "" : "S"}`;
  save();
}

function addItem(item = {}) {
  const row = template.content.firstElementChild.cloneNode(true);
  row.querySelector(".item-description").value = item.description || "";
  row.querySelector(".item-quantity").value = item.quantity || 1;
  row.querySelector(".item-price").value = item.price || "";
  row.querySelectorAll("input").forEach((input) => input.addEventListener("input", calculate));
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
  due.setDate(today.getDate() + 15);
  return { fields: Object.fromEntries(fields.map((id) => [id, id === "issue-date" ? today.toISOString().slice(0, 10) : id === "due-date" ? due.toISOString().slice(0, 10) : id === "payment-terms" ? "50% anticipo · 50% contra entrega" : id === "delivery-time" ? "15 a 20 días hábiles" : id === "tax-rate" ? "21" : ""])), items: [{ description: "", quantity: 1, price: "" }] };
}

function loadQuote(quote) {
  activeQuoteId = quote.id;
  list.replaceChildren();
  fields.forEach((id) => { $(`#${id}`).value = quote.data.fields[id] || ""; });
  quote.data.items.forEach(addItem);
  $("#quote-number").textContent = quote.number;
  $("#editor-title").textContent = quote.data.fields["client-name"] || "Nuevo presupuesto";
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
    row.querySelector(".quote-client").textContent = quote.data.fields["client-name"] || "Cliente sin nombre";
    row.querySelector(".quote-project").textContent = quote.data.fields["project-name"] || "Proyecto sin nombre";
    row.querySelector(".quote-date").textContent = new Intl.DateTimeFormat("es-AR", { dateStyle: "medium" }).format(new Date(quote.updatedAt));
    row.querySelector(".quote-value").textContent = formatMoney(quote.total);
    const status = row.querySelector(".quote-status");
    status.value = quote.status;
    status.addEventListener("change", () => {
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
$("#tax-rate").addEventListener("change", calculate);
$("#add-item").addEventListener("click", () => { addItem(); calculate(); });
$("#add-item-mobile").addEventListener("click", () => { addItem(); calculate(); });
$("#save-draft").addEventListener("click", () => { save(); notify("Borrador guardado correctamente."); });
$("#print-quote").addEventListener("click", () => window.print());
$("#download-quote").addEventListener("click", () => window.print());
$("#send-quote").addEventListener("click", () => {
  const email = $("#contact-email").value.trim();
  if (!email) { $("#contact-email").focus(); notify("Ingresá el email del contacto para enviar el presupuesto."); return; }
  save();
  const quotes = getQuotes();
  quotes.find((entry) => entry.id === activeQuoteId).status = "Enviado";
  saveQuotes(quotes);
  notify(`Presupuesto listo para enviar a ${email}.`);
});
$("#new-quote").addEventListener("click", createQuote);
$("#empty-new-quote").addEventListener("click", createQuote);
$("#back-to-list").addEventListener("click", showDashboard);
$(".brand").addEventListener("click", (event) => { event.preventDefault(); showDashboard(); });

migrateLegacyQuote();
showDashboard();
