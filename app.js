const $ = (id) => document.getElementById(id);

const LS_KEY = "odeme_takip_v1";

function money(n) {
  const v = Number(n || 0);
  // TR format, virgül vs.
  return v.toLocaleString("tr-TR", { maximumFractionDigits: 2 });
}

function loadState() {
  const raw = localStorage.getItem(LS_KEY);
  if (!raw) {
    return {
      income: 0,
      extraIncome: 0,
      expenses: [
        // örnek: {id, title, category, due, amount, paid}
      ]
    };
  }
  try { return JSON.parse(raw); } catch { return { income:0, extraIncome:0, expenses:[] }; }
}

function saveState(state) {
  localStorage.setItem(LS_KEY, JSON.stringify(state));
}

function uid() {
  return Math.random().toString(16).slice(2) + Date.now().toString(16);
}

let state = loadState();

function recalcAndRender() {
  // Inputs
  $("income").value = state.income ?? 0;
  $("extraIncome").value = state.extraIncome ?? 0;

  const totalIncome = Number(state.income || 0) + Number(state.extraIncome || 0);

  // Totals
  const paidTotal = state.expenses
    .filter(x => x.paid)
    .reduce((a, x) => a + Number(x.amount || 0), 0);

  const unpaidTotal = state.expenses
    .filter(x => !x.paid)
    .reduce((a, x) => a + Number(x.amount || 0), 0);

  const balance = totalIncome - paidTotal;

  $("totalIncome").textContent = money(totalIncome);
  $("paidTotal").textContent = money(paidTotal);
  $("unpaidTotal").textContent = money(unpaidTotal);
  $("balance").textContent = money(balance);

  // Table
  const tbody = $("expenseBody");
  tbody.innerHTML = "";

  // Sırala: ödenmeyenler önce, sonra vade tarihine göre
  const sorted = [...state.expenses].sort((a, b) => {
    if (a.paid !== b.paid) return a.paid ? 1 : -1;
    const da = a.due || "";
    const db = b.due || "";
    return da.localeCompare(db);
  });

  for (const e of sorted) {
    const tr = document.createElement("tr");

    const tdPaid = document.createElement("td");
    const chk = document.createElement("input");
    chk.type = "checkbox";
    chk.className = "chk";
    chk.checked = !!e.paid;
    chk.addEventListener("change", () => {
      const idx = state.expenses.findIndex(x => x.id === e.id);
      if (idx >= 0) {
        state.expenses[idx].paid = chk.checked;
        saveState(state);
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

    const tdDel = document.createElement("td");
    tdDel.className = "num";
    const del = document.createElement("button");
    del.className = "smallBtn";
    del.textContent = "Sil";
    del.addEventListener("click", () => {
      state.expenses = state.expenses.filter(x => x.id !== e.id);
      saveState(state);
      recalcAndRender();
    });
    tdDel.appendChild(del);

    tr.appendChild(tdPaid);
    tr.appendChild(tdTitle);
    tr.appendChild(tdCat);
    tr.appendChild(tdDue);
    tr.appendChild(tdAmt);
    tr.appendChild(tdDel);
    tbody.appendChild(tr);
  }
}

// Events
$("income").addEventListener("input", (ev) => {
  state.income = Number(ev.target.value || 0);
  saveState(state);
  recalcAndRender();
});

$("extraIncome").addEventListener("input", (ev) => {
  state.extraIncome = Number(ev.target.value || 0);
  saveState(state);
  recalcAndRender();
});

$("addExpense").addEventListener("click", () => {
  const title = $("newTitle").value.trim();
  const category = $("newCategory").value.trim();
  const due = $("newDue").value;
  const amount = Number($("newAmount").value || 0);

  if (!title) { alert("Açıklama yaz 🙂"); return; }
  if (!amount || amount <= 0) { alert("Tutar 0 olmasın, yoksa ‘bu gider Zen gideri’ olur 😄"); return; }

  state.expenses.push({
    id: uid(),
    title,
    category,
    due,
    amount,
    paid: false
  });

  $("newTitle").value = "";
  $("newCategory").value = "";
  $("newDue").value = "";
  $("newAmount").value = "";

  saveState(state);
  recalcAndRender();
});

$("clearPaid").addEventListener("click", () => {
  const ok = confirm("Ödenen giderleri listeden kaldırayım mı?");
  if (!ok) return;
  state.expenses = state.expenses.filter(x => !x.paid);
  saveState(state);
  recalcAndRender();
});

// Init
recalcAndRender();
