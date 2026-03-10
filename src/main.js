import './style.css';
import './album.js';
import './exercise.js';
import './prompt_manager.js';
import { renderPromptList } from './prompt_manager.js';
import { renderSideAlbumList } from './album.js';

document.addEventListener('DOMContentLoaded', () => {
    if (window.lucide) {
        window.lucide.createIcons();
    }

    // Reset selection mode when closing history sidebar
    document.getElementById("my-drawer")?.addEventListener("change", (e) => {
        if (!e.target.checked && isHistorySelectionMode) {
            isHistorySelectionMode = false;
            selectedHistoryIndices = [];
            updateHistorySelectionUI();
            renderHistory();
        }
    });
});

import { getExerciseState, setExerciseState } from './exercise.js';

/* =========================
   SIDEBAR (Toggle DaisyUI Drawer)
========================= */
export function openSidebar() {
    const drawerToggle = document.getElementById("my-drawer");
    if (drawerToggle) drawerToggle.checked = true;
}

export function closeSidebar() {
    const drawerToggle = document.getElementById("my-drawer");
    if (drawerToggle) {
        drawerToggle.checked = false;
        // Also fire change event to trigger the reset listener or reset directly
        if (isHistorySelectionMode) {
            isHistorySelectionMode = false;
            selectedHistoryIndices = [];
            updateHistorySelectionUI();
            renderHistory();
        }
    }
}

window.openSidebar = openSidebar;
window.closeSidebar = closeSidebar;


/* =========================
   HISTORY
Index for selection mode
========================= */
let isHistorySelectionMode = false;
let selectedHistoryIndices = [];

export function saveHistory(correct, total, answers, title) {
    const { questions } = getExerciseState();
    const percent = Math.round((correct / total) * 100);

    const record = {
        title: title || "No Title",
        date: new Date().toLocaleString([], { year: '2-digit', month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit' }),
        score: `${correct}/${total}`,
        percent: percent + "%",
        questions: [...questions], // shallow copy
        answers: { ...answers } // shallow copy
    };

    let history = JSON.parse(localStorage.getItem("practiceHistory") || "[]");
    history.unshift(record);
    if (history.length > 20) history.pop();

    localStorage.setItem("practiceHistory", JSON.stringify(history));
    renderHistory();
}

export function clearHistory() {
    if (confirm("Are you sure you want to clear all history?")) {
        localStorage.removeItem("practiceHistory");
        isHistorySelectionMode = false;
        selectedHistoryIndices = [];
        updateHistorySelectionUI();
        renderHistory();
    }
}
window.clearHistory = clearHistory;

export function toggleHistorySelectionMode() {
    isHistorySelectionMode = !isHistorySelectionMode;
    selectedHistoryIndices = [];
    updateHistorySelectionUI();
    renderHistory();
}
window.toggleHistorySelectionMode = toggleHistorySelectionMode;

export function toggleHistoryRecordSelection(index) {
    const idx = selectedHistoryIndices.indexOf(index);
    if (idx > -1) {
        selectedHistoryIndices.splice(idx, 1);
    } else {
        selectedHistoryIndices.push(index);
    }
    updateHistorySelectionUI();
    renderHistory();
}
window.toggleHistoryRecordSelection = toggleHistoryRecordSelection;

export function selectAllHistory() {
    const history = JSON.parse(localStorage.getItem("practiceHistory") || "[]");
    selectedHistoryIndices = history.map((_, i) => i);
    updateHistorySelectionUI();
    renderHistory();
}
window.selectAllHistory = selectAllHistory;

export function deselectAllHistory() {
    selectedHistoryIndices = [];
    updateHistorySelectionUI();
    renderHistory();
}
window.deselectAllHistory = deselectAllHistory;

function updateHistorySelectionUI() {
    const selectBtn = document.getElementById("historySelectBtn");
    const bulkBar = document.getElementById("historyBulkActions");
    const countText = document.getElementById("historySelectedCount");
    const deleteBtn = document.getElementById("historyDeleteSelectedBtn");
    const clearBtn = document.getElementById("historyClearBtn");

    if (selectBtn) {
        selectBtn.innerText = isHistorySelectionMode ? "Hủy" : "Chọn";
        selectBtn.classList.toggle("btn-primary", isHistorySelectionMode);
        selectBtn.classList.toggle("bg-base-200/50", !isHistorySelectionMode);
    }

    if (bulkBar) {
        bulkBar.classList.toggle("hidden", !isHistorySelectionMode);
    }

    if (clearBtn) {
        clearBtn.classList.toggle("hidden", isHistorySelectionMode);
    }

    if (countText) {
        countText.innerText = `${selectedHistoryIndices.length} selected`;
    }

    if (deleteBtn) {
        deleteBtn.disabled = selectedHistoryIndices.length === 0;
    }
}

export function deleteSelectedHistory() {
    if (selectedHistoryIndices.length === 0) return;

    if (confirm(`Xóa ${selectedHistoryIndices.length} mục đã chọn?`)) {
        let history = JSON.parse(localStorage.getItem("practiceHistory") || "[]");
        history = history.filter((_, i) => !selectedHistoryIndices.includes(i));
        localStorage.setItem("practiceHistory", JSON.stringify(history));

        selectedHistoryIndices = [];
        isHistorySelectionMode = false; // Turn off selection mode after delete
        updateHistorySelectionUI();
        renderHistory();
    }
}
window.deleteSelectedHistory = deleteSelectedHistory;

export function renderHistory() {
    const container = document.getElementById("historyContainer");
    if (!container) return;
    container.innerHTML = "";

    const history = JSON.parse(localStorage.getItem("practiceHistory") || "[]");

    if (history.length === 0) {
        container.innerHTML = `<div class="p-8 text-center opacity-50 italic">No history yet</div>`;
        return;
    }

    history.forEach((item, index) => {
        const isSelected = selectedHistoryIndices.includes(index);
        const div = document.createElement("div");
        div.className = "card bg-base-200 hover:bg-base-300 cursor-pointer transition-colors p-2 sm:p-4 group";

        const percentNum = parseInt(item.percent);
        const scoreColor = percentNum === 100 ? 'text-success' :
            percentNum >= 80 ? 'text-warning' :
                percentNum >= 50 ? 'text-secondary font-bold' : 'text-error';

        div.innerHTML = `
            <div class="flex items-center gap-3">
                <div class="flex-1 flex flex-col gap-1 min-w-0" onclick="${isHistorySelectionMode ? `toggleHistoryRecordSelection(${index})` : `loadHistory(${index})`}">
                    <div class="flex justify-between items-start gap-2">
                        <span class="font-bold max-sm:text-sm text-primary truncate flex-1 opacity-90">${item.title || "No Title"}</span>
                        <span class="font-bold sm:text-lg lg:text-xl ${scoreColor} shrink-0">${item.score}</span>
                    </div>
                    <div class="flex justify-between items-center mt-1">
                        <div class="text-xs opacity-50 uppercase font-bold">${item.date}</div>
                        <div class="badge badge-ghost badge-sm opacity-50">${item.percent}</div>
                    </div>
                </div>
                ${isHistorySelectionMode ? `
                <div class="shrink-0 flex items-center justify-center" onclick="toggleHistoryRecordSelection(${index})">
                    <div class="size-6 rounded-full border-2 ${isSelected ? 'bg-primary border-primary flex items-center justify-center' : 'border-base-content/20'} transition-all">
                        ${isSelected ? '<i data-lucide="check" class="size-4 text-primary-content"></i>' : ''}
                    </div>
                </div>
                ` : ''}
            </div>`;

        container.appendChild(div);
    });

    if (window.lucide) {
        window.lucide.createIcons();
    }
}
window.renderHistory = renderHistory;

export function loadHistory(index) {
    const history = JSON.parse(localStorage.getItem("practiceHistory") || "[]");
    const record = history[index];
    if (!record) return;

    setExerciseState(record.questions, record.answers, true);

    window.renderExercise(record);
    closeSidebar();

    const container = document.getElementById("exerciseContainer");
    if (container) {
        container.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
}
window.loadHistory = loadHistory;
window.saveHistory = saveHistory;

// Theme Management
function initTheme() {
    const theme = localStorage.getItem("theme") || (window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light");
    document.documentElement.setAttribute("data-theme", theme);
    updateThemeIcons(theme);
}

function toggleTheme() {
    const currentTheme = document.documentElement.getAttribute("data-theme");
    const newTheme = currentTheme === "dark" ? "light" : "dark";
    document.documentElement.setAttribute("data-theme", newTheme);
    localStorage.setItem("theme", newTheme);
    updateThemeIcons(newTheme);
}

function updateThemeIcons(theme) {
    const sunIcon = document.getElementById("sunIcon");
    const moonIcon = document.getElementById("moonIcon");
    if (sunIcon && moonIcon) {
        if (theme === "dark") {
            sunIcon.classList.remove("hidden");
            moonIcon.classList.add("hidden");
        } else {
            sunIcon.classList.add("hidden");
            moonIcon.classList.remove("hidden");
        }
    }
}

document.getElementById("themeToggle")?.addEventListener("click", toggleTheme);
initTheme();

// Init history on load
renderHistory();

// Timer Toggle Event
document.getElementById("timerToggle")?.addEventListener("change", (e) => {
    const timerSection = document.getElementById("timerSection");
    if (timerSection) {
        if (e.target.checked) {
            timerSection.classList.remove("hidden");
        } else {
            timerSection.classList.add("hidden");
            if (typeof resetTimer === "function") resetTimer();
        }
    }
});

/* =========================
   TIMER LOGIC
========================= */
let timerInterval = null;
let remainingSeconds = 0;
let initialSeconds = 0;
let timerRunning = false;
let timerStep = 5; // minutes

export function updateTimerDisplay() {
    const min = Math.floor(remainingSeconds / 60);
    const sec = remainingSeconds % 60;

    // Main Display
    const minSpan = document.getElementById("timerMin");
    const secSpan = document.getElementById("timerSec");
    if (minSpan) minSpan.style.setProperty("--value", min);
    if (secSpan) secSpan.style.setProperty("--value", sec);

    // Float Display
    const floatMin = document.getElementById("floatMin");
    const floatSec = document.getElementById("floatSec");
    if (floatMin) floatMin.innerText = min.toString().padStart(2, '0');
    if (floatSec) floatSec.innerText = sec.toString().padStart(2, '0');

    // Auto-toggle float visibility on initial set
    handleScroll();
}
window.updateTimerDisplay = updateTimerDisplay;

export function setTimer(minutes) {
    if (timerRunning) {
        clearInterval(timerInterval);
        timerRunning = false;
        updateTimerUI(false);
    }
    remainingSeconds = minutes * 60;
    initialSeconds = remainingSeconds;
    updateTimerDisplay();
}
window.setTimer = setTimer;

export function adjustTimer(direction) {
    const delta = direction * timerStep * 60;
    remainingSeconds = Math.max(0, remainingSeconds + delta);
    initialSeconds = remainingSeconds;
    updateTimerDisplay();
}
window.adjustTimer = adjustTimer;

export function updateStep() {
    const select = document.getElementById("stepSelect");
    const display = document.getElementById("stepDisplay");
    if (select && display) {
        timerStep = parseInt(select.value);
        display.innerText = timerStep;
    }
}
window.updateStep = updateStep;

function updateTimerUI(isRunning) {
    const btn = document.getElementById("startTimerBtn");
    const playIcon = document.getElementById("playIcon");
    const pauseIcon = document.getElementById("pauseIcon");
    const btnText = document.getElementById("timerBtnText");

    if (isRunning) {
        playIcon?.classList.add("hidden");
        pauseIcon?.classList.remove("hidden");
        if (btnText) btnText.innerText = "Tạm dừng";
        btn?.classList.remove("sm:btn-primary", "btn-primary");
        btn?.classList.add("sm:btn-neutral", "btn-neutral");
    } else {
        playIcon?.classList.remove("hidden");
        pauseIcon?.classList.add("hidden");
        if (btnText) {
            btnText.innerText = remainingSeconds > 0 ? "Tiếp tục" : "Bắt đầu";
        }
        btn?.classList.remove("sm:btn-neutral", "btn-neutral");
        btn?.classList.add("sm:btn-primary", "btn-primary");
    }
}

export function toggleTimer() {
    if (timerRunning) {
        // Pause
        clearInterval(timerInterval);
        timerRunning = false;
        updateTimerUI(false);
    } else {
        // Start
        if (remainingSeconds <= 0) {
            alert("Vui lòng chọn hoặc tăng thời gian!");
            return;
        }
        timerRunning = true;
        updateTimerUI(true);

        timerInterval = setInterval(() => {
            remainingSeconds--;
            if (remainingSeconds < 0) {
                remainingSeconds = 0;
                clearInterval(timerInterval);
                timerRunning = false;
                updateTimerDisplay();
                updateTimerUI(false);
                alert("Hết thời gian làm bài!");
                submitAnswers(); // Auto submit when time is up
                return;
            }
            updateTimerDisplay();
        }, 1000);
    }
}
window.toggleTimer = toggleTimer;

export function pauseTimer() {
    if (timerRunning) {
        clearInterval(timerInterval);
        timerRunning = false;
        updateTimerUI(false);
    }
}
window.pauseTimer = pauseTimer;

export function resetTimer() {
    clearInterval(timerInterval);
    timerRunning = false;
    remainingSeconds = initialSeconds;
    updateTimerDisplay();
    updateTimerUI(false);

    // Hide float timer
    const floatTimer = document.getElementById("floatTimer");
    if (floatTimer) floatTimer.classList.add("hidden");
}
window.resetTimer = resetTimer;

/* =========================
   SCROLL LOGIC FOR FLOAT TIMER
========================= */
/* =========================
   SCROLL LOGIC FOR FLOAT TIMER
========================= */
let isScrolling = false;
function handleScroll() {
    if (!isScrolling) {
        window.requestAnimationFrame(() => {
            handleScrollInternal();
            isScrolling = false;
        });
        isScrolling = true;
    }
}

function handleScrollInternal() {
    const floatTimer = document.getElementById("floatTimer");
    const timerSection = document.getElementById("timerSection");
    const timerToggle = document.getElementById("timerToggle");
    const header = document.getElementById("appHeader");
    const btmNav = document.getElementById("appBottomNav");

    if (!floatTimer || !timerSection || !timerToggle) return;

    // Add transition once if not present
    if (floatTimer && !floatTimer.style.transition) {
        floatTimer.style.transition = "all 0.3s ease";
    }

    const scrollTop = window.scrollY;
    const isTimerActive = timerToggle.checked && remainingSeconds > 0;
    const timerRect = timerSection.getBoundingClientRect();
    const headerHeight = header ? header.offsetHeight : 64;

    // 1. Float Timer Logic (Visibility)
    if (isTimerActive && timerRect.bottom < 0) {
        floatTimer.classList.remove("hidden");
    } else {
        floatTimer.classList.add("hidden");
    }

    // 2. Hide Header/BottomNav and Sync Float Timer position
    if (scrollTop > lastScrollTop && scrollTop > 50) {
        // Scroll Down
        if (header) header.style.transform = "translateY(-100%)";
        if (btmNav) btmNav.style.transform = "translateY(100%)";
        if (floatTimer) floatTimer.style.top = "8px"; // top-2 (approx 0.5rem)
    } else {
        // Scroll Up
        if (header) header.style.transform = "translateY(0)";
        if (btmNav) btmNav.style.transform = "translateY(0)";
        if (floatTimer) floatTimer.style.top = (headerHeight + 8) + "px"; // just below navbar
    }
    lastScrollTop = scrollTop;
}

let lastScrollTop = 0;
window.addEventListener("scroll", handleScroll);


// Initial history on load
renderHistory();
renderPromptList();

/* =========================
   PROMPT MODAL LOGIC
========================= */
export function copyPrompt() {
    const promptText = document.getElementById("promptText").innerText;
    navigator.clipboard.writeText(promptText).then(() => {
        const btn = document.getElementById("copyPromptBtn");
        const originalText = btn.innerHTML;
        btn.innerHTML = `
            <i data-lucide="check" class="h-4 w-4"></i>
            <span>Copied!</span>
        `;
        if (window.lucide) window.lucide.createIcons();
        btn.classList.replace("btn-primary", "btn-success");
        btn.classList.replace("max-sm:text-primary", "max-sm:text-success");
        btn.classList.replace("hover:max-sm:bg-primary/10", "hover:max-sm:bg-success/10");

        setTimeout(() => {
            btn.innerHTML = originalText;
            if (window.lucide) window.lucide.createIcons();
            btn.classList.replace("btn-success", "btn-primary");
            btn.classList.replace("max-sm:text-success", "max-sm:text-primary");
            btn.classList.replace("hover:max-sm:bg-success/10", "hover:max-sm:bg-primary/10");
        }, 2000);
    });
}
window.copyPrompt = copyPrompt;
