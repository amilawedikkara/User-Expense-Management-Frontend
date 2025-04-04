document.addEventListener("DOMContentLoaded", () => {
  const form = document.getElementById("expense-form");
  const expenseList = document.getElementById("expense-list");
  const categorySummaryTable = document.getElementById("category-summary");
  const message = document.getElementById("message");
  const API_URL = "http://localhost:5000"; // Update with your actual backend URL

  // Fetch and display expenses & category summary on page load
  fetchExpenses();

  form.addEventListener("submit", async (event) => {
    event.preventDefault();

    const description = document.getElementById("description").value.trim();
    const amount = document.getElementById("amount").value.trim();
    const category = document.getElementById("category").value;

    if (!description || !amount || isNaN(amount)) {
      showMessage("Please enter valid data!", "danger");
      return;
    }

    const expense = { description, amount: parseFloat(amount), category };

    try {
      const response = await fetch(`${API_URL}/expenses`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(expense),
      });

      if (!response.ok) throw new Error("Failed to add expense");

      showMessage("Expense added successfully!", "success");

      // Fetch and update expenses & category summary after adding new expense
      fetchExpenses();

      form.reset();
    } catch (error) {
      showMessage(error.message, "danger");
    }
  });

  // Fetch expenses and category-wise totals
  async function fetchExpenses() {
    try {
      const response = await fetch(`${API_URL}/expenses`);
      const expenses = await response.json();

      expenseList.innerHTML = ""; // Clear current list
      expenses.forEach((expense) => addExpenseToTable(expense));

      // Fetch category-wise summary after updating expenses
      fetchCategorySummary();
    } catch (error) {
      console.error("Error fetching expenses:", error);
    }
  }

  // Fetch and display category-wise totals
  async function fetchCategorySummary() {
    try {
      const response = await fetch(`${API_URL}/expenses/category-summary`);
      if (!response.ok) throw new Error("Failed to fetch category summary");
      const categories = await response.json();

      const categorySummaryTable = document.getElementById("category-summary");
      categorySummaryTable.innerHTML = ""; // Clear previous data

      categories.forEach((category) => {
        const row = document.createElement("tr");
        row.innerHTML = `<td>${category.category}</td><td>${parseFloat(
          category.total
        ).toFixed(2)}</td>`;
        categorySummaryTable.appendChild(row);
      });
    } catch (error) {
      console.error("Error fetching category summary:", error);
    }
  }

  function addExpenseToTable(expense) {
    const row = document.createElement("tr");
    row.innerHTML = `
          <td>${expense.description}</td>
          <td>${parseFloat(expense.amount).toFixed(2)}</td>
          <td>${expense.category}</td>
      `;
    expenseList.appendChild(row);
  }

  function showMessage(text, type) {
    message.textContent = text;
    message.className = `alert alert-${type}`;
    message.classList.remove("d-none");
    setTimeout(() => message.classList.add("d-none"), 3000);
  }
});
