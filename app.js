const $ = (id) => document.getElementById(id);

const LS_KEY = "odeme_takip_v2";

function money(n) {
  const v = Number(n || 0);
  return v.toLocaleString("tr-TR", { maximumFractionDigits: 2 });
}

function yyyymm(d = new Date()) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  return `${y}-${m}`;
}

function monthLabel(ym) {
  // "2026-01" -> "Ocak 2026"
  const [y, m] = ym.split("-").map(Number);
  const names = ["Ocak","Şubat","Mart","Nisan","Mayıs","Haziran","Temmuz","Ağustos","Eylül","Ekim","Kasım","Aralık"];
  return `${names[m - 1]} ${y}`;
}

function loadState() {
  const raw = localStorage.getItem(LS_KEY);
  if (!raw) {
    const cur = yyyymm();
    return {
      selectedMonth: cur,
      months: {
        [cur]: { income: 0, extraIncome: 0, expenses: [] }
      }
    };
  }
  try { return JSON.parse(raw); } catch {
    const cur = yyyymm();
    return { selectedMonth: cur, months: { [cur]: { income:0, extraIncome:0, expenses:[] } } };
  }
}

function saveState() {
  localStorage.setItem(LS_KEY, JSON.stringify(state));
}

function uid() {
  return Math.random().toString(16).slice(2) + Date.now().toString(16);
}

let state = loadState();

// --- Month helpers ---
function ensureMonth(ym) {
  if (!state.months[ym]) state.months[ym] = { income: 0, extraIncome: 0, expenses: [] };
}

function setSelectedMonth(ym) {
  ensureMonth(ym);
  state.selectedMonth = ym;
  saveState();
  recalcAndRender();
}

function shiftMonth(delta) {
  const [y, m] = state.selectedMonth.split("-").map(Number);
  const d = new Date(y, m - 1 + delta, 1);
  setSelectedMonth(yyyymm(d));
}

function getCur() {
  ensureMonth(state.selectedMonth);
  return state.months[state.selectedMonth];
}

// --- Edit modal state ---
let editingId = null;

function openEdit(expense) {
  editingId = expense.id;
  $("editTitle").value = expense.title || "";
  $("editCategory").value = expense.category || "";
  $("editDue").value = expense.due || "";
  $("editAmount").value = Number(expense.amount || 0);
  $("editDlg").showModal();
}

function applyEdit() {
  const cur = getCur();
  const idx = cur.expenses.findIndex(x => x.id === editingId);
  if (idx < 0) return;

  const title = $("editTitle").value.trim();
  const category = $("editCategory").value.trim();
  const due = $("editDue").value;
  const amount = Number($("editAmount").value || 0);

  if (!title) { alert("Açıklama boş kalmasın 🙂"); return; }
  if (!amount || amount <= 0) { alert("Tutar 0 olmasın 😄"); return; }

  cur.expenses[idx] = {
    ...cur.expenses[idx],
    title,
    category,
    due,
    amount
  };

  saveState();
  $("editDlg").close();
  editingId = null;
  recalcAndRender();
}

function renderMonthsBar() {
  const bar = $("monthsBar");
  bar.innerHTML = "";

  // months keys + selected month mutlaka dahil
  const keys = Object.keys(state.months);
  if (!keys.includes(state.selectedMonth)) keys.push(state.selectedMonth);

  // sort desc
  keys.sort((a,b)=> b.localeCompare(a));

  for (const ym of keys) {
    const chip = document.createElement("button");
    chip.className = "monthChip" + (ym === state.selectedMonth ? " active" : "");
    chip.textContent = monthLabel(ym);
    chip.addEventListener("click", () => setSelectedMonth(ym));
    bar.appendChild(chip);
  }
}

function recalcAndRender() {
  renderMonthsBar();

  const cur = getCur();

  $("income").value = cur.income ?? 0;
  $("extraIncome").value = cur.extraIncome ?? 0;

  const totalIncome = Number(cur.income || 0) + Number(cur.extraIncome || 0);

  const paidTotal = cur.expenses
    .filter(x => x.paid)
    .reduce((a, x) => a + Number(x.amount || 0), 0);

  const unpaidTotal = cur.expenses
    .filter(x => !x.paid)
    .reduce((a, x) => a + Number(x.amount || 0), 0);

  const balance = totalIncome - paidTotal;

  $("totalIncome").textContent = money(totalIncome);
  $("paidTotal").textContent = money(paidTotal);
  $("unpaidTotal").textContent = money(unpaidTotal);
  $("balance").textContent = money(balance);

  // sort: unpaid first then due
  const sorted = [...cur.expenses].sort((a, b) => {
    if (a.paid !== b.paid) return a.paid ? 1 : -1;
    return (a.due || "").localeCompare(b.due || "");
  });

  // Desktop table
  const tbody = $("expenseBody");
  tbody.innerHTML = "";

  for (const e of sorted) {
    const tr = document.createElement("tr");

    const tdPaid = document.createElement("td");
    const chk = document.createElement("input");
    chk.type = "checkbox";
    chk.className = "chk";
    chk.checked = !!e.paid;
    chk.addEventListener("change", () => {
      const idx = cur.expenses.findIndex(x => x.id === e.id);
      if (idx >= 0) {
        cur.expenses[idx].paid = chk.checked;
        saveState();
        recalcAndRender();
      }
    });
    tdPaid.appendChild(chk);

    const tdTitle = document.createElement("td");
    tdTitle.textContent = e.title || "-";

    const tdCat = document.createElement("td");
    tdCat.textContent = e.category || "-";

    const tdDue = document.createElement("td");
    tdDue.textContent = e.due || "-";

    const tdAmt = document.createElement("td");
    tdAmt.className = "num";
    tdAmt.textContent = money(e.amount);

    const tdBtns = document.createElement("td");
    tdBtns.className = "num";

    const editBtn = document.createElement("button");
    editBtn.className = "smallBtn";
    editBtn.textContent = "Düzenle";
    editBtn.addEventListener("click", () => openEdit(e));

    const delBtn = document.createElement("button");
    delBtn.className = "smallBtn danger";
    delBtn.textContent = "Sil";
    delBtn.addEventListener("click", () => {
      cur.expenses = cur.expenses.filter(x => x.id !== e.id);
      saveState();
      recalcAndRender();
    });

    tdBtns.appendChild(editBtn);
    tdBtns.appendChild(delBtn);

    tr.appendChild(tdPaid);
    tr.appendChild(tdTitle);
    tr.appendChild(tdCat);
    tr.appendChild(tdDue);
    tr.appendChild(tdAmt);
    tr.appendChild(tdBtns);
    tbody.appendChild(tr);
  }

  // Mobile cards
  const cards = $("expenseCards");
  cards.innerHTML = "";

  for (const e of sorted) {
    const box = document.createElement("div");
    box.className = "cardItem";

    const top = document.createElement("div");
    top.className = "cardTop";

    const left = document.createElement("div");
    const title = document.createElement("div");
    title.className = "cardTitle";
    title.textContent = e.title || "-";
    const meta = document.createElement("div");
    meta.className = "cardMeta";
    meta.textContent = `${e.category || "-"} • Vade: ${e.due || "-"}`;
    left.appendChild(title);
    left.appendChild(meta);

    const right = document.createElement("div");
    right.style.fontWeight = "900";
    right.textContent = money(e.amount);

    top.appendChild(left);
    top.appendChild(right);

    const actions = document.createElement("div");
    actions.className = "cardActions";

    const paidWrap = document.createElement("label");
    paidWrap.style.display = "flex";
    paidWrap.style.alignItems = "center";
    paidWrap.style.gap = "10px";
    paidWrap.style.color = "var(--text)";
    paidWrap.style.fontWeight = "800";

    const chk = document.createElement("input");
    chk.type = "checkbox";
    chk.className = "chk";
    chk.checked = !!e.paid;
    chk.addEventListener("change", () => {
      const idx = cur.expenses.findIndex(x => x.id === e.id);
      if (idx >= 0) {
        cur.expenses[idx].paid = chk.checked;
        saveState();
        recalcAndRender();
      }
    });

    const paidText = document.createElement("span");
    paidText.textContent = "Ödendi";
    paidWrap.appendChild(chk);
    paidWrap.appendChild(paidText);

    const btns = document.createElement("div");
    btns.style.display = "flex";
    btns.style.gap = "8px";

    const editBtn = document.createElement("button");
    editBtn.className = "smallBtn";
    editBtn.textContent = "Düzenle";
    editBtn.addEventListener("click", () => openEdit(e));

    const delBtn = document.createElement("button");
    delBtn.className = "smallBtn danger";
    delBtn.textContent = "Sil";
    delBtn.addEventListener("click", () => {
      cur.expenses = cur.expenses.filter(x => x.id !== e.id);
      saveState();
      recalcAndRender();
    });

    btns.appendChild(editBtn);
    btns.appendChild(delBtn);

    actions.appendChild(paidWrap);
    actions.appendChild(btns);

    box.appendChild(top);
    box.appendChild(actions);
    cards.appendChild(box);
  }
}

// --- Events ---
$("income").addEventListener("input", (ev) => {
  const cur = getCur();
  cur.income = Number(ev.target.value || 0);
  saveState();
  recalcAndRender();
});

$("extraIncome").addEventListener("input", (ev) => {
  const cur = getCur();
  cur.extraIncome = Number(ev.target.value || 0);
  saveState();
  recalcAndRender();
});

$("addExpense").addEventListener("click", () => {
  const cur = getCur();

  const title = $("newTitle").value.trim();
  const category = $("newCategory").value.trim();
  const due = $("newDue").value;
  const amount = Number($("newAmount").value || 0);

  if (!title) { alert("Açıklama yaz 🙂"); return; }
  if (!amount || amount <= 0) { alert("Tutar 0 olmasın 😄"); return; }

  cur.expenses.push({ id: uid(), title, category, due, amount, paid: false });

  $("newTitle").value = "";
  $("newCategory").value = "";
  $("newDue").value = "";
  $("newAmount").value = "";

  saveState();
  recalcAndRender();
});

$("clearPaid").addEventListener("click", () => {
  const ok = confirm("Bu ayın ödenen giderlerini listeden kaldırayım mı?");
  if (!ok) return;
  const cur = getCur();
  cur.expenses = cur.expenses.filter(x => !x.paid);
  saveState();
  recalcAndRender();
});

$("prevMonth").addEventListener("click", () => shiftMonth(-1));
$("nextMonth").addEventListener("click", () => shiftMonth(1));

$("saveEdit").addEventListener("click", (ev) => {
  ev.preventDefault();
  applyEdit();
});

$("cancelEdit").addEventListener("click", () => {
  editingId = null;
});

// Init
ensureMonth(state.selectedMonth);
recalcAndRender();
