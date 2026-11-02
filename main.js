/* Focusly : toutes les données sont conservées localement dans le navigateur. */

// Les catégories alimentent à la fois la barre latérale et le formulaire de création.
const categories = {
  Travail: { color: "#6c63ff", className: "work" },
  Personnel: { color: "#ff7d70", className: "personal" },
  Courses: { color: "#ffbc4d", className: "shopping" },
  Santé: { color: "#45bc85", className: "health" },
};

// Quelques exemples donnent une interface utile dès le premier chargement.
const starterTasks = [
  { id: 1, title: "Finaliser la maquette de la page d'accueil", category: "Travail", time: "09:30", completed: false, date: "today" },
  { id: 2, title: "Répondre aux emails importants", category: "Travail", time: "10:15", completed: true, date: "today" },
  { id: 3, title: "Faire les courses de la semaine", category: "Courses", time: "12:30", completed: false, date: "today" },
  { id: 4, title: "Appeler maman", category: "Personnel", time: "18:00", completed: false, date: "today" },
  { id: 5, title: "Séance de sport", category: "Santé", time: "19:00", completed: true, date: "today" },
  { id: 6, title: "Préparer la réunion d'équipe", category: "Travail", time: "09:00", completed: false, date: "upcoming" },
];

// Le stockage local évite de perdre les modifications après un rechargement.
let tasks = JSON.parse(localStorage.getItem("focusly-tasks")) || starterTasks;
let currentPage = "today";
let statusFilter = "all";
let editingId = null;

const elements = {
  taskList: document.querySelector("#taskList"), projects: document.querySelector("#projects"), modal: document.querySelector("#taskModal"), form: document.querySelector("#taskForm"), category: document.querySelector("#taskCategory"), name: document.querySelector("#taskName"), time: document.querySelector("#taskTime"),
};

// Nettoie le texte saisi avant de l'ajouter à l'interface pour empêcher l'injection HTML.
const escapeHtml = (value) => value.replace(/[&<>'\"]/g, (character) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#039;", '"': "&quot;" })[character]);

function saveTasks() { localStorage.setItem("focusly-tasks", JSON.stringify(tasks)); }

function formatDate() {
  const today = new Date();
  document.querySelector("#dateLabel").textContent = new Intl.DateTimeFormat("fr-FR", { weekday: "long", day: "numeric", month: "long" }).format(today).toUpperCase();
}

function filteredTasks() {
  let visible = currentPage === "completed" ? tasks.filter((task) => task.completed) : tasks.filter((task) => task.date === currentPage);
  if (statusFilter === "active") visible = visible.filter((task) => !task.completed);
  if (statusFilter === "done") visible = visible.filter((task) => task.completed);
  return visible;
}

// Crée le contenu de la liste principale à partir de l'état actuel de l'application.
function renderTasks() {
  const visible = filteredTasks();
  const labels = { today: "Aujourd'hui", upcoming: "À venir", completed: "Tâches terminées" };
  document.querySelector("#pageTitle").textContent = labels[currentPage];
  document.querySelector("#taskSummary").textContent = visible.length ? `${visible.length} tâche${visible.length > 1 ? "s" : ""} à afficher` : "Aucune tâche ici pour le moment";
  elements.taskList.innerHTML = visible.map((task) => `
    <article class="task ${task.completed ? "completed" : ""}">
      <input class="task-checkbox" type="checkbox" data-action="toggle" data-id="${task.id}" ${task.completed ? "checked" : ""} aria-label="Marquer ${escapeHtml(task.title)} comme terminée" />
      <div class="task-body"><span class="task-title">${escapeHtml(task.title)}</span><div class="task-meta"><span class="tag tag-${categories[task.category].className}">${task.category}</span><span>◷ ${task.time}</span></div></div>
      <div class="task-actions"><button data-action="edit" data-id="${task.id}" aria-label="Modifier la tâche">✎</button><button data-action="delete" data-id="${task.id}" aria-label="Supprimer la tâche">⌫</button></div>
    </article>`).join("") || `<div class="empty-state"><p>✦</p><strong>Tout est calme ici.</strong><span>Ajoutez une nouvelle tâche pour commencer.</span></div>`;
}

function renderProjects() {
  elements.projects.innerHTML = Object.entries(categories).map(([name, details]) => {
    const count = tasks.filter((task) => task.category === name && !task.completed).length;
    return `<button class="project-link" data-category="${name}"><span class="project-dot" style="background:${details.color}"></span>${name}<b>${count}</b></button>`;
  }).join("");
  elements.category.innerHTML = Object.keys(categories).map((name) => `<option value="${name}">${name}</option>`).join("");
}

function renderStats() {
  const todayTasks = tasks.filter((task) => task.date === "today");
  const done = todayTasks.filter((task) => task.completed).length;
  const pending = todayTasks.length - done;
  const percentage = todayTasks.length ? Math.round((done / todayTasks.length) * 100) : 0;
  document.querySelector("#doneStat").textContent = done;
  document.querySelector("#pendingStat").textContent = pending;
  document.querySelector("#progressText").textContent = `${percentage}%`;
  document.querySelector("#progressBar").style.width = `${percentage}%`;
  document.querySelector("#progressCaption").textContent = percentage === 100 ? "Bravo, votre journée est terminée !" : `${done} sur ${todayTasks.length} tâches accomplies aujourd'hui`;
  document.querySelector("#todayCount").textContent = pending;
  document.querySelector("#upcomingCount").textContent = tasks.filter((task) => task.date === "upcoming" && !task.completed).length;
  document.querySelector("#completedCount").textContent = tasks.filter((task) => task.completed).length;
}

function render() { renderTasks(); renderProjects(); renderStats(); }

// Ouvre la modale dans le bon mode, création ou modification.
function openModal(task = null) {
  editingId = task?.id || null;
  document.querySelector("#modalTitle").textContent = task ? "Modifier la tâche" : "Nouvelle tâche";
  elements.name.value = task?.title || "";
  elements.time.value = task?.time || "09:00";
  elements.category.value = task?.category || "Travail";
  elements.modal.showModal();
  elements.name.focus();
}

function closeModal() { elements.modal.close(); elements.form.reset(); editingId = null; }

// Écouteur unique : les boutons générés dynamiquement restent ainsi fonctionnels.
elements.taskList.addEventListener("click", (event) => {
  const button = event.target.closest("[data-action]");
  if (!button) return;
  const id = Number(button.dataset.id);
  if (button.dataset.action === "toggle") { tasks = tasks.map((task) => task.id === id ? { ...task, completed: !task.completed } : task); }
  if (button.dataset.action === "edit") openModal(tasks.find((task) => task.id === id));
  if (button.dataset.action === "delete") { tasks = tasks.filter((task) => task.id !== id); }
  saveTasks(); render();
});

// Les boutons de navigation changent la page visible et réinitialisent le filtre d'état.
document.querySelectorAll(".nav-link").forEach((button) => button.addEventListener("click", () => {
  currentPage = button.dataset.filter; statusFilter = "all";
  document.querySelectorAll(".nav-link").forEach((link) => link.classList.toggle("active", link === button));
  document.querySelectorAll(".toolbar-button").forEach((filter) => filter.classList.toggle("active", filter.id === "allFilter"));
  render(); closeSidebar();
}));

document.querySelectorAll(".toolbar-button").forEach((button) => button.addEventListener("click", () => {
  statusFilter = button.id === "activeFilter" ? "active" : button.id === "doneFilter" ? "done" : "all";
  document.querySelectorAll(".toolbar-button").forEach((filter) => filter.classList.toggle("active", filter === button)); renderTasks();
}));

elements.form.addEventListener("submit", (event) => {
  event.preventDefault();
  const payload = { title: elements.name.value.trim(), category: elements.category.value, time: elements.time.value || "09:00" };
  if (!payload.title) return;
  if (editingId) tasks = tasks.map((task) => task.id === editingId ? { ...task, ...payload } : task);
  else tasks.unshift({ id: Date.now(), ...payload, completed: false, date: currentPage === "upcoming" ? "upcoming" : "today" });
  saveTasks(); render(); closeModal();
});

// Gestion de la modale et des menus sur les écrans tactiles ou compacts.
document.querySelectorAll("#openTaskModal, #quickAddButton").forEach((button) => button.addEventListener("click", () => openModal()));
document.querySelector("#closeModal").addEventListener("click", closeModal);
document.querySelector("#cancelModal").addEventListener("click", closeModal);
document.querySelector("#menuButton").addEventListener("click", () => { document.querySelector("#sidebar").classList.add("open"); document.querySelector("#sidebarOverlay").classList.add("visible"); });
function closeSidebar() { document.querySelector("#sidebar").classList.remove("open"); document.querySelector("#sidebarOverlay").classList.remove("visible"); }
document.querySelectorAll("#closeMenuButton, #sidebarOverlay").forEach((button) => button.addEventListener("click", closeSidebar));

// Le thème choisi est mémorisé pour les prochaines visites.
function toggleTheme() { const dark = document.body.classList.toggle("dark-mode"); localStorage.setItem("focusly-theme", dark ? "dark" : "light"); document.querySelector("#themeButton").innerHTML = `<span>${dark ? "☀" : "☾"}</span> ${dark ? "Thème clair" : "Thème sombre"}`; }
if (localStorage.getItem("focusly-theme") === "dark") toggleTheme();
document.querySelectorAll("#themeButton, #mobileThemeButton").forEach((button) => button.addEventListener("click", toggleTheme));

formatDate();
render();

