let balance = 0;
let debt = 0;
let incomeDebt = 0;
let salaryDebt = 0;
let transactions = [];
let notes = [];
let selectedCalendarDate = null;
let editingTransactionId = null;
let salaryTransactionId = null;

const balanceEl = document.getElementById("balance");
const debtAmountEl = document.getElementById("debtAmount");
const salaryInput = document.getElementById("salaryInput");
const addSalaryBtn = document.getElementById("addSalaryBtn");
const editSalaryBtn = document.getElementById("editSalaryBtn");

const typeEl = document.getElementById("type");
const descriptionEl = document.getElementById("description");
const amountEl = document.getElementById("amount");
const dateEl = document.getElementById("date");
const addTransactionBtn = document.getElementById("addTransactionBtn");

const transactionList = document.getElementById("transactionList");

const calendarGrid = document.getElementById("calendarGrid");
const calendarTitle = document.getElementById("calendarTitle");
const prevMonthBtn = document.getElementById("prevMonthBtn");
const nextMonthBtn = document.getElementById("nextMonthBtn");
const selectedDateTitle = document.getElementById("selectedDateTitle");
const selectedDayTransactions = document.getElementById("selectedDayTransactions");

const noteInput = document.getElementById("noteInput");
const addNoteBtn = document.getElementById("addNoteBtn");
const selectedDayNotes = document.getElementById("selectedDayNotes");

const noteCostEl = document.getElementById("noteCost");
const noteTimeEl = document.getElementById("noteTime");
const notifyBeforeEl = document.getElementById("notifyBefore");

const categorySelectEl = document.getElementById("category");

const totalIncomeEl = document.getElementById("totalIncome");
const totalExpensesEl = document.getElementById("totalExpenses");

const menuBtn = document.getElementById("menuBtn");
const closeMenuBtn = document.getElementById("closeMenuBtn");
const sidebar = document.getElementById("sidebar");
const overlay = document.getElementById("overlay");
const navBtns = document.querySelectorAll(".nav-btn");
const pages = document.querySelectorAll(".page");

const exportPdfBtn = document.getElementById("exportPdfBtn");

let currentDate = new Date();

async function requestNotificationPermission() {
  if (!window.Capacitor || !Capacitor.Plugins.LocalNotifications) {
    console.log("Local Notifications not available");
    return;
  }

  const { LocalNotifications } = Capacitor.Plugins;
  await LocalNotifications.requestPermissions();
}

addSalaryBtn.addEventListener("click", () => {
  const salary = Number(salaryInput.value);

  if (!salary) {
    alert("Enter salary / initial balance");
    return;
  }

  if (salaryTransactionId !== null) {
    alert("Salary already added. Use Edit to change it.");
    return;
  }

  const incomeResult = applyIncome(salary, true);

  const transaction = {
    id: Date.now(),
    type: "income",
    description: "Salary / Initial Balance",
    amount: salary,
    category: "Salary",
    date: new Date().toISOString().split("T")[0],
    isSalary: true,
    debtPaid: incomeResult.debtPaid,
    debtPaidMethod: incomeResult.debtPaidMethod
  };

  salaryTransactionId = transaction.id;
  transactions.push(transaction);

  salaryInput.value = "";

  refreshUI();
  saveData();
});

editSalaryBtn.addEventListener("click", () => {
  const salaryTransaction = transactions.find(
    transaction => transaction.id === salaryTransactionId
  );

  if (!salaryTransaction) {
    alert("No salary found to edit");
    return;
  }

  salaryInput.value = salaryTransaction.amount;

  undoTransactionEffect(salaryTransaction);

  transactions = transactions.filter(
    transaction => transaction.id !== salaryTransactionId
  );

  salaryTransactionId = null;

  refreshUI();
  saveData();
});

addTransactionBtn.addEventListener("click", () => {
  const type = typeEl.value;
  const description = descriptionEl.value.trim();
  const amount = Number(amountEl.value);
  const date = dateEl.value;
  const category = categorySelectEl.value;

  if (!description || !amount || !category || !date) {
    alert("Fill all fields");
    return;
  }

  let debtCreated = 0;
  let debtPaid = 0;
  let debtCoverMethod = null;
  let debtPaidMethod = null;

  if (type === "expense") {
    const expenseResult = applyExpense(amount);

    if (!expenseResult.accepted) {
      return;
    }

    debtCreated = expenseResult.debtCreated;
    debtCoverMethod = expenseResult.debtCoverMethod;
  } else {
    const incomeResult = applyIncome(amount, false);
    debtPaid = incomeResult.debtPaid;
    debtPaidMethod = incomeResult.debtPaidMethod;
  }

  const transaction = {
    id: editingTransactionId || Date.now(),
    type,
    description,
    amount,
    category,
    date,
    debtCreated,
    debtPaid,
    debtCoverMethod,
    debtPaidMethod
  };

  transactions.push(transaction);

  descriptionEl.value = "";
  amountEl.value = "";
  dateEl.value = "";
  categorySelectEl.value = "";
  editingTransactionId = null;

  refreshUI();
  saveData();
});

addNoteBtn.addEventListener("click", async () => {
  const text = noteInput.value.trim();
  const cost = Number(noteCostEl.value);
  const time = noteTimeEl.value;
  const notifyBefore = Number(notifyBeforeEl.value);

  if (!selectedCalendarDate) {
    alert("Select a date first");
    return;
  }

  if (!text || !time) {
    alert("Fill reminder title and time");
    return;
  }

  const note = {
    id: Date.now(),
    text,
    cost,
    time,
    notifyBefore,
    date: selectedCalendarDate
  };

  notes.push(note);

  saveData();
  renderNotesForDay(selectedCalendarDate);
  renderCalendar();

  noteInput.value = "";
  noteCostEl.value = "";
  noteTimeEl.value = "10:00";
  notifyBeforeEl.value = "0";

  try {
    await scheduleReminderNotification(note);
  } catch (error) {
    console.log("Notification failed:", error);
  }
});

function refreshUI() {
  updateBalance();
  renderTransactions();
  renderCalendar();
  updateSummary();
  updateReportStats();
  updateSalaryUI();

  if (selectedCalendarDate) {
    showTransactionsForDay(selectedCalendarDate);
  }
}

function updateBalance() {
  debt = incomeDebt + salaryDebt;

  balanceEl.innerText = `${balance}€`;
  debtAmountEl.innerText = `${debt}€`;

  if (debt > 0) {
    debtAmountEl.classList.add("has-debt");
  } else {
    debtAmountEl.classList.remove("has-debt");
  }
}

function applyIncome(amount, isSalary = false) {
  let debtPaid = 0;
  let debtPaidMethod = null;

  if (isSalary && salaryDebt > 0) {
    if (amount >= salaryDebt) {
      debtPaid = salaryDebt;
      amount -= salaryDebt;
      salaryDebt = 0;
      balance += amount;
    } else {
      debtPaid = amount;
      salaryDebt -= amount;
    }

    debtPaidMethod = "salary";
  } else if (!isSalary && incomeDebt > 0) {
    if (amount >= incomeDebt) {
      debtPaid = incomeDebt;
      amount -= incomeDebt;
      incomeDebt = 0;
      balance += amount;
    } else {
      debtPaid = amount;
      incomeDebt -= amount;
    }

    debtPaidMethod = "income";
  } else {
    balance += amount;
  }

  debt = incomeDebt + salaryDebt;

  return {
    debtPaid,
    debtPaidMethod
  };
}

function applyExpense(amount) {
  if (amount > balance) {
    const newDebt = amount - balance;

    const choice = prompt(
      `This expense will create a debt of ${newDebt}€.\n\n` +
      `How do you want to cover it?\n\n` +
      `1. Cover from next Income\n` +
      `2. Cover from next Salary\n\n` +
      `Type 1 or 2`
    );

    if (choice !== "1" && choice !== "2") {
      return {
        accepted: false,
        debtCreated: 0,
        debtCoverMethod: null
      };
    }

    if (choice === "1") {
      incomeDebt += newDebt;
    }

    if (choice === "2") {
      salaryDebt += newDebt;
    }

    balance = 0;
    debt = incomeDebt + salaryDebt;

    return {
      accepted: true,
      debtCreated: newDebt,
      debtCoverMethod: choice
    };
  }

  balance -= amount;

  return {
    accepted: true,
    debtCreated: 0,
    debtCoverMethod: null
  };
}

function undoTransactionEffect(transaction) {
  if (transaction.type === "income") {
    const paid = transaction.debtPaid || 0;
    const remainingIncome = transaction.amount - paid;

    if (transaction.debtPaidMethod === "salary") {
      salaryDebt += paid;
    } else if (transaction.debtPaidMethod === "income") {
      incomeDebt += paid;
    }

    balance -= remainingIncome;
  } else {
    const created = transaction.debtCreated || 0;
    const restoredBalance = transaction.amount - created;

    if (transaction.debtCoverMethod === "1") {
      incomeDebt -= created;
    } else if (transaction.debtCoverMethod === "2") {
      salaryDebt -= created;
    }

    balance += restoredBalance;
  }

  if (incomeDebt < 0) incomeDebt = 0;
  if (salaryDebt < 0) salaryDebt = 0;
  if (balance < 0) balance = 0;

  debt = incomeDebt + salaryDebt;
}

function updateSummary() {
  let totalIncome = 0;
  let totalExpenses = 0;

  transactions.forEach(transaction => {
    if (transaction.type === "income") {
      totalIncome += transaction.amount;
    } else {
      totalExpenses += transaction.amount;
    }
  });

  totalIncomeEl.innerText = `${totalIncome}€`;
  totalExpensesEl.innerText = `${totalExpenses}€`;
}

function updateReportStats() {
  const reportPreviousBalanceEl = document.getElementById("reportPreviousBalance");
  const reportSalaryEl = document.getElementById("reportIncome");
  const reportExpensesEl = document.getElementById("reportExpenses");
  const reportFinalBalanceEl = document.getElementById("reportFinalBalance");
  const reportDebtEl = document.getElementById("reportDebt");
  const reportExtraIncomeEl = document.getElementById("reportExtraIncome");

  let totalSalary = 0;
  let totalIncome = 0;
  let totalExpenses = 0;

  transactions.forEach(transaction => {
    if (transaction.type === "income" && transaction.isSalary) {
      totalSalary += transaction.amount;
    } else if (transaction.type === "income") {
      totalIncome += transaction.amount;
    } else {
      totalExpenses += transaction.amount;
    }
  });

  let previousBalance = balance - totalSalary - totalIncome + totalExpenses;

  if (debt > 0) {
    previousBalance -= debt;
  }

  if (previousBalance < 0) {
    previousBalance = 0;
  }

  reportPreviousBalanceEl.innerText = `${previousBalance}€`;
  reportSalaryEl.innerText = `${totalSalary}€`;
  reportExpensesEl.innerText = `${totalExpenses}€`;
  reportFinalBalanceEl.innerText = `${balance}€`;
  reportDebtEl.innerText = `${debt}€`;
  reportExtraIncomeEl.innerText = `${totalIncome}€`;
}

function updateSalaryUI() {
  if (salaryTransactionId !== null) {
    addSalaryBtn.disabled = true;
    salaryInput.disabled = true;
    editSalaryBtn.style.display = "block";
  } else {
    addSalaryBtn.disabled = false;
    salaryInput.disabled = false;
    editSalaryBtn.style.display = "block";
  }
}

function getDebtCoverText(method) {
  if (method === "1") return "Cover with next Income";
  if (method === "2") return "Cover with next Salary";
  return "";
}

function getDebtPaidText(method) {
  if (method === "income") return "from Income";
  if (method === "salary") return "from Salary";
  return "";
}

function getDebtInfo(transaction) {
  if (transaction.debtCreated) {
    return ` | Debt created: ${transaction.debtCreated}€ (${getDebtCoverText(transaction.debtCoverMethod)})`;
  }

  if (transaction.debtPaid) {
    return ` | Debt paid: ${transaction.debtPaid}€ ${getDebtPaidText(transaction.debtPaidMethod)}`;
  }

  return "";
}

function renderTransactions() {
  transactionList.innerHTML = "";

  transactions.forEach(transaction => {
    const li = document.createElement("li");
    li.classList.add(transaction.type === "income" ? "income-item" : "expense-item");

    const debtInfo = getDebtInfo(transaction);

    li.innerHTML = `
      <span>
        ${transaction.date} |
        ${transaction.type === "income" ? "+" : "-"}
        ${transaction.amount}€
        - ${transaction.category}
        - ${transaction.description}
        ${debtInfo}
      </span>

      <div style="display:flex; gap:5px;">
        <button onclick="editTransaction(${transaction.id})">
          Edit
        </button>

        <button class="delete-btn" onclick="deleteTransaction(${transaction.id})">
          X
        </button>
      </div>
    `;

    transactionList.appendChild(li);
  });
}

function deleteTransaction(id) {
  const transaction = transactions.find(t => t.id === id);

  if (!transaction) {
    return;
  }

  undoTransactionEffect(transaction);

  if (transaction.isSalary) {
    salaryTransactionId = null;
  }

  transactions = transactions.filter(t => t.id !== id);

  refreshUI();
  saveData();
}

function editTransaction(id) {
  const transaction = transactions.find(t => t.id === id);

  if (!transaction) {
    return;
  }

  if (transaction.isSalary) {
    alert("Use Edit Salary to change salary.");
    return;
  }

  editingTransactionId = id;

  typeEl.value = transaction.type;
  categorySelectEl.value = transaction.category;
  descriptionEl.value = transaction.description;
  amountEl.value = transaction.amount;
  dateEl.value = transaction.date;

  deleteTransaction(id);
}

function renderCalendar() {
  calendarGrid.innerHTML = "";

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0);
  const daysInMonth = lastDay.getDate();

  let startDay = firstDay.getDay();

  if (startDay === 0) {
    startDay = 7;
  }

  calendarTitle.innerText =
    `${firstDay.toLocaleString("default", { month: "long" })} ${year}`;

  for (let i = 1; i < startDay; i++) {
    const emptyDiv = document.createElement("div");
    emptyDiv.classList.add("calendar-day", "empty");
    calendarGrid.appendChild(emptyDiv);
  }

  for (let day = 1; day <= daysInMonth; day++) {
    const dayDiv = document.createElement("div");
    dayDiv.classList.add("calendar-day");

    const formattedDate =
      `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;

    const hasTransaction = transactions.some(t => t.date === formattedDate);
    const hasNote = notes.some(note => note.date === formattedDate);

    if (hasTransaction || hasNote) {
      dayDiv.classList.add("has-transaction");
    }

    const today = new Date();

    const isToday =
      today.getFullYear() === year &&
      today.getMonth() === month &&
      today.getDate() === day;

    if (isToday) {
      dayDiv.classList.add("today");
    }

    dayDiv.innerText = day;

    dayDiv.addEventListener("click", () => {
      showTransactionsForDay(formattedDate);
    });

    calendarGrid.appendChild(dayDiv);
  }
}

function showTransactionsForDay(date) {
  selectedCalendarDate = date;

  selectedDateTitle.innerText = date;
  selectedDayTransactions.innerHTML = "";

  const filteredTransactions = transactions.filter(t => t.date === date);

  if (filteredTransactions.length === 0) {
    selectedDayTransactions.innerHTML = "<li>No transactions</li>";
  } else {
    filteredTransactions.forEach(transaction => {
      const li = document.createElement("li");
      li.classList.add(transaction.type === "income" ? "income-item" : "expense-item");

      const debtInfo = getDebtInfo(transaction);

      li.innerText =
        `${transaction.type === "income" ? "+" : "-"}${transaction.amount}€ - ${transaction.category} - ${transaction.description}${debtInfo}`;

      selectedDayTransactions.appendChild(li);
    });
  }

  renderNotesForDay(date);
}

function renderNotesForDay(date) {
  selectedDayNotes.innerHTML = "";

  const filteredNotes = notes.filter(note => note.date === date);

  if (filteredNotes.length === 0) {
    selectedDayNotes.innerHTML = "<li>No notes</li>";
    return;
  }

  filteredNotes.forEach(note => {
    const li = document.createElement("li");

    li.innerHTML = `
      <span>
        ${note.text}
        ${note.cost ? " - " + note.cost + "€" : ""}
        ${note.time ? " at " + note.time : ""}
      </span>

      <button class="delete-btn" onclick="deleteNote(${note.id})">
        X
      </button>
    `;

    selectedDayNotes.appendChild(li);
  });
}

async function scheduleReminderNotification(note) {
  if (!window.Capacitor || !Capacitor.Plugins.LocalNotifications) {
    console.log("Local Notifications not available in browser");
    return;
  }

  const { LocalNotifications } = Capacitor.Plugins;

  const permission = await LocalNotifications.requestPermissions();

  if (permission.display !== "granted") {
    console.log("Notification permission not granted");
    return;
  }

  const notificationDate = new Date(`${note.date}T${note.time}:00`);

  notificationDate.setDate(notificationDate.getDate() - note.notifyBefore);

  if (notificationDate <= new Date()) {
    console.log("Notification date is in the past");
    return;
  }

  await LocalNotifications.schedule({
    notifications: [
      {
        id: Number(note.id.toString().slice(-9)),
        title: "Pocket Balance Reminder",
        body: `${note.text}${note.cost ? " - Cost: " + note.cost + "€" : ""}`,
        schedule: {
          at: notificationDate
        }
      }
    ]
  });

  console.log("Notification scheduled:", notificationDate);
}

function deleteNote(id) {
  notes = notes.filter(note => note.id !== id);

  saveData();

  if (selectedCalendarDate) {
    renderNotesForDay(selectedCalendarDate);
  }

  renderCalendar();
}

prevMonthBtn.addEventListener("click", () => {
  currentDate.setMonth(currentDate.getMonth() - 1);
  renderCalendar();
});

nextMonthBtn.addEventListener("click", () => {
  currentDate.setMonth(currentDate.getMonth() + 1);
  renderCalendar();
});

function saveData() {
  localStorage.setItem("balance", balance);
  localStorage.setItem("debt", debt);
  localStorage.setItem("incomeDebt", incomeDebt);
  localStorage.setItem("salaryDebt", salaryDebt);
  localStorage.setItem("transactions", JSON.stringify(transactions));
  localStorage.setItem("notes", JSON.stringify(notes));
  localStorage.setItem("salaryTransactionId", salaryTransactionId);
}

function loadData() {
  const savedBalance = localStorage.getItem("balance");
  const savedDebt = localStorage.getItem("debt");
  const savedIncomeDebt = localStorage.getItem("incomeDebt");
  const savedSalaryDebt = localStorage.getItem("salaryDebt");
  const savedTransactions = localStorage.getItem("transactions");
  const savedNotes = localStorage.getItem("notes");
  const savedSalaryTransactionId = localStorage.getItem("salaryTransactionId");

  if (savedBalance !== null) {
    balance = Number(savedBalance);
  }

  if (savedIncomeDebt !== null) {
    incomeDebt = Number(savedIncomeDebt);
  }

  if (savedSalaryDebt !== null) {
    salaryDebt = Number(savedSalaryDebt);
  }

  if (savedDebt !== null && savedIncomeDebt === null && savedSalaryDebt === null) {
    salaryDebt = Number(savedDebt);
  }

  debt = incomeDebt + salaryDebt;

  if (savedTransactions !== null) {
    transactions = JSON.parse(savedTransactions);
  }

  if (savedNotes !== null) {
    notes = JSON.parse(savedNotes);
  }

  if (savedSalaryTransactionId !== null && savedSalaryTransactionId !== "null") {
    salaryTransactionId = Number(savedSalaryTransactionId);
  }

  refreshUI();
}

menuBtn.addEventListener("click", () => {
  sidebar.classList.add("open");
  overlay.classList.add("show");
});

closeMenuBtn.addEventListener("click", closeSidebar);
overlay.addEventListener("click", closeSidebar);

function closeSidebar() {
  sidebar.classList.remove("open");
  overlay.classList.remove("show");
}

navBtns.forEach(btn => {
  btn.addEventListener("click", () => {
    const pageId = btn.dataset.page;

    pages.forEach(page => {
      page.classList.remove("active-page");
    });

    document.getElementById(pageId).classList.add("active-page");

    closeSidebar();
  });
});

exportPdfBtn.addEventListener("click", async () => {
  const { jsPDF } = window.jspdf;
  const doc = new jsPDF();

  let y = 20;
  let totalSalary = 0;
  let totalIncome = 0;
  let totalExpenses = 0;

  transactions.forEach(transaction => {
    if (transaction.type === "income" && transaction.isSalary) {
      totalSalary += transaction.amount;
    } else if (transaction.type === "income") {
      totalIncome += transaction.amount;
    } else {
      totalExpenses += transaction.amount;
    }
  });

  let previousBalance = balance - totalSalary - totalIncome + totalExpenses;

  if (debt > 0) {
    previousBalance -= debt;
  }

  if (previousBalance < 0) {
    previousBalance = 0;
  }

  doc.setFontSize(20);
  doc.text("Pocket Balance Monthly Report", 20, y);
  y += 18;

  doc.setFontSize(12);
  doc.text(`Previous Balance: ${previousBalance} EUR`, 20, y);
  y += 9;
  doc.text(`Total Salary: ${totalSalary} EUR`, 20, y);
  y += 9;
  doc.text(`Total Income: ${totalIncome} EUR`, 20, y);
  y += 9;
  doc.text(`Total Expenses: ${totalExpenses} EUR`, 20, y);
  y += 9;
  doc.text(`Current Debt: ${debt} EUR`, 20, y);
  y += 9;
  doc.text(`Final Balance: ${balance} EUR`, 20, y);
  y += 18;

  doc.setFontSize(16);
  doc.text("Transactions", 20, y);
  y += 12;

  doc.setFontSize(10);

  transactions.forEach(transaction => {
    const debtInfo = getDebtInfo(transaction)
      .replaceAll("€", "EUR")
      .replaceAll("|", "-");

    const typeLabel = transaction.type === "income" ? "INCOME" : "EXPENSE";

    const line =
      `${transaction.date} - ${typeLabel} - ${transaction.amount} EUR - ` +
      `${transaction.category} - ${transaction.description} ${debtInfo}`;

    const now = new Date();

    const fileName =
  "PocketBalanceReport_" +
  now.getFullYear() + "-" +
  String(now.getMonth() + 1).padStart(2, "0") + "-" +
  String(now.getDate()).padStart(2, "0") + "_" +
  String(now.getHours()).padStart(2, "0") + "-" +
  String(now.getMinutes()).padStart(2, "0") + "-" +
  String(now.getSeconds()).padStart(2, "0") +
  ".pdf";


    doc.text(lines, 20, y);
    y += lines.length * 7;

    if (y > 280) {
      doc.addPage();
      y = 20;
    }
  });

  const fileName = "PocketBalanceReport.pdf";

  if (window.Capacitor && Capacitor.Plugins.Filesystem) {
    const { Filesystem } = Capacitor.Plugins;

    const pdfBase64 = doc.output("datauristring").split(",")[1];

    await Filesystem.writeFile({
      path: fileName,
      data: pdfBase64,
      directory: "DOCUMENTS"
    });

    alert("PDF saved to device Documents");
  } else {
    doc.save(fileName);
  }
});

requestNotificationPermission();

loadData();

if ("serviceWorker" in navigator) {
  navigator.serviceWorker
    .register("service-worker.js")
    .then(() => console.log("Service Worker Registered"));
}