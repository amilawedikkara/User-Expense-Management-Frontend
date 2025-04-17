document.addEventListener("DOMContentLoaded", () => {
  const API_URL = "http://localhost:5000";
  const mainContent = document.getElementById("mainContent");
  const authButtons = document.getElementById("authButtons");
  const expenseList = document.getElementById("expenseList");
  const totalDisplay = document.getElementById("totalDisplay");
  let currentUser = null;
  let categoryChart = null;

  // ------------------ AUTH HANDLERS ------------------
  async function handleLogin(e) {
    e.preventDefault();
    const email = document.getElementById("loginEmail").value;
    const password = document.getElementById("loginPassword").value;

    try {
      const response = await fetch(`${API_URL}/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });

      const data = await response.json();
      if (response.ok) {
        localStorage.setItem("token", data.token);
        setTimeout(checkAuthState, 0);
        showMessage("Login successful!", "success");
        document.getElementById("loginForm").reset();
        const modal = bootstrap.Modal.getInstance(
          document.getElementById("loginModal")
        );
        if (modal) modal.hide(); // <-- Add null check here
        const mainContent = document.getElementById("chartCanvas");
        if (mainContent) mainContent.focus();
      } else {
        showMessage(data.error || "Login failed", "danger");
      }
    } catch (error) {
      showMessage("Network error - please try again later", "danger");
    }
  }

  async function handleSignup(e) {
    e.preventDefault();
    const email = document.getElementById("signupEmail").value;
    const password = document.getElementById("signupPassword").value;

    try {
      const response = await fetch(`${API_URL}/auth/signup`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });

      const data = await response.json();
      if (response.ok) {
        localStorage.setItem("token", data.token);
        checkAuthState();
        showMessage("Signup successful!", "success");
        document.getElementById("signupForm").reset();
        bootstrap.Modal.getInstance(
          document.getElementById("signupModal")
        ).hide();
      } else {
        showMessage(data.error || "Signup failed", "danger");
      }
    } catch (error) {
      showMessage("Network error - please try again later", "danger");
    }
  }

  // ------------------ AUTH STATE MGMT ------------------
  function checkAuthState() {
    const token = localStorage.getItem("token");
    if (!token) {
      updateUIForUnauthenticated();
      return;
    }

    try {
      const [header, payloadPart, signature] = token.split(".");
      if (!header || !payloadPart || !signature) {
        throw new Error("Invalid token format");
      }
      const payload = JSON.parse(atob(payloadPart));
      if (payload.exp * 1000 < Date.now()) {
        throw new Error("Token expired");
      }
      currentUser = payload;
      updateUIForAuthenticated();
      loadData();
    } catch (error) {
      console.error("Auth error:", error);
      showMessage(`Session expired: ${error.message}`, "warning");
      localStorage.removeItem("token");
      updateUIForUnauthenticated();
    }
  }

  function updateUIForAuthenticated() {
    mainContent.classList.remove("d-none");
    authButtons.innerHTML = `
      <span class="me-3">Welcome, ${currentUser.email}</span>
      <button class="btn btn-danger" onclick="logout()">Logout</button>
    `;
  }

  function updateUIForUnauthenticated() {
    mainContent.classList.add("d-none");
    authButtons.innerHTML = `
      <button class="btn btn-outline-primary me-2" 
              data-bs-toggle="modal" 
              data-bs-target="#loginModal">Login</button>
      <button class="btn btn-primary" 
              data-bs-toggle="modal" 
              data-bs-target="#signupModal">Sign Up</button>
    `;
  }

  // ------------------ FETCH FUNCTIONS ------------------
  async function fetchExpenses() {
    const token = localStorage.getItem("token");
    try {
      const res = await fetch(`${API_URL}/expenses`, {
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
      });
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Failed to fetch expenses");
      }

      // Display logic (simple example)
      const expenseList = document.getElementById("expenseList");
      expenseList.innerHTML = data
        .map(
          (expense) => `
       <tr>
          <td>${expense.description}</td>
          <td>€${Number(expense.amount).toFixed(2)}</td>
          <td>${expense.category}</td>
          <td>
            <button class="btn btn-sm btn-warning me-2 edit-btn" data-id="${
              expense.id
            }">Edit</button>
            <button class="btn btn-sm btn-danger delete-btn" data-id="${
              expense.id
            }">Delete</button>
          </td>
        </tr>
        `
        )
        .join("");
      // Attach event listeners to buttons
      document.querySelectorAll(".delete-btn").forEach((btn) => {
        btn.addEventListener("click", () =>
          handleDeleteExpense(btn.dataset.id)
        );
      });

      document.querySelectorAll(".edit-btn").forEach((btn) => {
        btn.addEventListener("click", () =>
          handleEditExpense(btn.dataset.id, data)
        );
      });
    } catch (error) {
      showMessage("Network error - please check connection", "danger");
      console.error("Fetch error:", error);
      throw error; // Keep this to propagate error for loadData's Promise.all
    }
  }
  async function handleDeleteExpense(expenseId) {
    const token = localStorage.getItem("token");
    try {
      const res = await fetch(`${API_URL}/expenses/${expenseId}`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Delete failed");

      showMessage("Expense deleted", "success");
      fetchExpenses(); // Refresh the list
    } catch (error) {
      showMessage("Delete failed", "danger");
      console.error("Delete error:", error);
    }
  }

  function handleEditExpense(id, data) {
    const expense = data.find((e) => e.id == id);
    if (!expense) return;

    document.getElementById("edit-expense-id").value = id;
    document.getElementById("edit-description").value = expense.description;
    document.getElementById("edit-amount").value = expense.amount;
    document.getElementById("edit-category").value = expense.category;

    // Show modal (using Bootstrap)
    const modal = new bootstrap.Modal(
      document.getElementById("editExpenseModal")
    );
    modal.show();
  }

  document
    .getElementById("editExpenseForm")
    .addEventListener("submit", async (e) => {
      e.preventDefault();
      const id = document.getElementById("edit-expense-id").value;
      const description = document.getElementById("edit-description").value;
      const amount = parseFloat(document.getElementById("edit-amount").value);
      const category = document.getElementById("edit-category").value;

      const token = localStorage.getItem("token");

      try {
        const res = await fetch(`${API_URL}/expenses/${id}`, {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ description, amount, category }),
        });

        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Edit failed");

        showMessage("Expense updated", "success");
        bootstrap.Modal.getInstance(
          document.getElementById("editExpenseModal")
        ).hide();
        fetchExpenses(); // Refresh
      } catch (error) {
        showMessage("Edit failed", "danger");
        console.error("Edit error:", error);
      }
    });
  async function fetchCategorySummary() {
    const token = localStorage.getItem("token");
    try {
      const res = await fetch(`${API_URL}/expenses/category-summary`, {
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Failed to fetch category summary");
      }

      console.log("Category summary:", data);

      const chartCanvas = document.getElementById("chartCanvas");
      if (!chartCanvas) {
        console.error("Chart canvas element not found");
        return;
      }

      const ctx = chartCanvas.getContext("2d");

      // Destroy old chart if it exists
      if (window.categoryChart) {
        window.categoryChart.destroy();
      }

      //  Create new chart
      window.categoryChart = new Chart(ctx, {
        type: "pie",
        data: {
          labels: data.labels,
          datasets: [
            {
              data: data.values,
              backgroundColor: ["#ff6384", "#36a2eb", "#cc65fe", "#ffce56"],
            },
          ],
        },
      });
    } catch (error) {
      showMessage("Network error - please check connection", "danger");
      console.error("Fetch error:", error);
      throw error;
    }
  }

  async function fetchTotalExpenses() {
    const token = localStorage.getItem("token");
    try {
      const res = await fetch(`${API_URL}/expenses/total`, {
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
      });
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Failed to fetch total");
      }

      totalDisplay.textContent = `Total: $${data.total}`;
    } catch (error) {
      showMessage("Network error - please check connection", "danger");
      console.error("Fetch error:", error);
      throw error; // Keep to maintain error propagation
    }
  }

  async function handleAddExpense(e) {
    e.preventDefault();

    const token = localStorage.getItem("token");
    const descriptionInput = document.getElementById("expenseDescription");
    const amountInput = document.getElementById("expenseAmount");
    const categoryInput = document.getElementById("expenseCategory");
    // Add this check:
    if (!descriptionInput || !amountInput || !categoryInput) {
      showMessage("Form elements missing!", "danger");
      return;
    }
    const description = descriptionInput.value;
    const amount = parseFloat(amountInput.value);
    const category = categoryInput.value;

    // input validation
    if (isNaN(amount) || amount <= 0) {
      showMessage("Please enter a valid amount", "danger");
      return;
    }
    if (!description || !category) {
      showMessage("Please fill in all fields", "danger");
      return;
    }
    try {
      const res = await fetch(`${API_URL}/expenses`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ description, amount, category }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to add expense");
      }

      showMessage("Expense added!", "success");
      document.getElementById("expenseForm").reset();
      loadData();
    } catch (err) {
      console.error(err);
      showMessage("Could not add expense", "danger");
    }
  }

  // ------------------ INIT ------------------
  function loadData() {
    if (!currentUser) {
      clearUI();
      return;
    }
    Promise.all([
      fetchExpenses(),
      fetchCategorySummary(),
      fetchTotalExpenses(),
    ]).catch(() => showMessage("Failed to load data", "danger"));
  }

  function initializeApplication() {
    checkAuthState();
  }

  function clearUI() {
    expenseList.innerHTML = "";
    totalDisplay.textContent = "";
  }

  // ------------------ EVENTS ------------------
  const loginForm = document.getElementById("loginForm"); //Safer Event Listeners
  if (loginForm) loginForm.addEventListener("submit", handleLogin);

  const signupForm = document.getElementById("signupForm");
  if (signupForm) signupForm.addEventListener("submit", handleSignup);

  const expenseForm = document.getElementById("expenseForm");
  if (expenseForm) expenseForm.addEventListener("submit", handleAddExpense);
  // ------------------ START ------------------
  initializeApplication();
});

// ------------------ GLOBAL ------------------
window.logout = () => {
  localStorage.removeItem("token");
  document.dispatchEvent(new Event("DOMContentLoaded"));
  showMessage("Logged out successfully", "success");
};

function showMessage(text, type) {
  const messageEl = document.getElementById("message");
  messageEl.textContent = text;
  messageEl.className = `alert alert-${type} d-block`;
  setTimeout(() => messageEl.classList.add("d-none"), 3000);
}
function showLoading(show = true) {
  const loader = document.getElementById("loader");
  if (loader) loader.classList.toggle("d-none", !show);
}
