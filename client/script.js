// 🔥 BACKEND URL (FIXED)
const API_BASE_URL = "https://full-stack-render-app-o6yd.onrender.com/api/";
const PAGE_SIZE = 9;

let currentState = {
  user: null,
  token: localStorage.getItem("token"),
  cases: [],
  currentPage: 1,
  totalPages: 1,
  filters: { category: "", status: "", severity: "" },
  stats: null,
  charts: {}
};

const elements = {
  navLinks: document.querySelectorAll(".nav-link"),
  mobileMenuBtn: document.getElementById("mobileMenuBtn"),
  mobileMenu: document.getElementById("mobileMenu"),
  themeToggle: document.getElementById("themeToggle"),
  loginBtn: document.getElementById("loginBtn"),
  mobileLoginBtn: document.getElementById("mobileLoginBtn"),
  totalCases: document.getElementById("totalCases"),
  totalUsers: document.getElementById("totalUsers"),
  totalEvidence: document.getElementById("totalEvidence"),
  totalCountries: document.getElementById("totalCountries"),
  exploreBtn: document.getElementById("exploreBtn"),
  contributeBtn: document.getElementById("contributeBtn"),
  categoryFilter: document.getElementById("categoryFilter"),
  statusFilter: document.getElementById("statusFilter"),
  severityFilter: document.getElementById("severityFilter"),
  resetFilters: document.getElementById("resetFilters"),
  casesContainer: document.getElementById("casesContainer"),
  currentPage: document.getElementById("currentPage"),
  totalPages: document.getElementById("totalPages"),
  prevPage: document.getElementById("prevPage"),
  nextPage: document.getElementById("nextPage"),
  submitForm: document.getElementById("submitForm"),
  caseTitle: document.getElementById("caseTitle"),
  caseCategory: document.getElementById("caseCategory"),
  severity: document.getElementById("severity"),
  caseDescription: document.getElementById("caseDescription"),
  aiSystem: document.getElementById("aiSystem"),
  company: document.getElementById("company"),
  evidenceLinks: document.getElementById("evidenceLinks"),
  contentWarning: document.getElementById("contentWarning"),
  clearForm: document.getElementById("clearForm"),
  submitCase: document.getElementById("submitCase"),
  categoryChart: document.getElementById("categoryChart"),
  timelineChart: document.getElementById("timelineChart"),
  communityCount: document.getElementById("communityCount"),
  joinBtn: document.getElementById("joinBtn"),
  loginModal: document.getElementById("loginModal"),
  registerModal: document.getElementById("registerModal"),
  caseModal: document.getElementById("caseModal"),
  closeLogin: document.getElementById("closeLogin"),
  closeRegister: document.getElementById("closeRegister"),
  closeCaseModal: document.getElementById("closeCaseModal"),
  loginEmail: document.getElementById("loginEmail"),
  loginPassword: document.getElementById("loginPassword"),
  regUsername: document.getElementById("regUsername"),
  regEmail: document.getElementById("regEmail"),
  regPassword: document.getElementById("regPassword"),
  regConfirm: document.getElementById("regConfirm"),
  doLogin: document.getElementById("doLogin"),
  doRegister: document.getElementById("doRegister"),
  switchToRegister: document.getElementById("switchToRegister"),
  switchToLogin: document.getElementById("switchToLogin"),
  successToast: document.getElementById("successToast"),
  toastMessage: document.getElementById("toastMessage"),
  loadingOverlay: document.getElementById("loadingOverlay")
};

// ===================== API CORE =====================

async function fetchAPI(endpoint, options = {}) {
  const url = `${API_BASE_URL}/api${endpoint}`;

  const headers = {
    "Content-Type": "application/json",
    ...(options.headers || {})
  };

  if (currentState.token) {
    headers.Authorization = `Bearer ${currentState.token}`;
  }

  const res = await fetch(url, { ...options, headers });

  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: "Network error" }));
    throw new Error(err.error || `HTTP ${res.status}`);
  }

  return res.json();
}

// ===================== INIT =====================

async function init() {
  try {
    await fetchAPI("/status");
    console.log("✅ Backend connected");
  } catch (err) {
    console.error("❌ Backend connection failed", err);
  }
}

document.addEventListener("DOMContentLoaded", init);
