import './style.css';
import './album.js';
import './exercise.js';

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
    if (drawerToggle) drawerToggle.checked = false;
}

window.openSidebar = openSidebar;
window.closeSidebar = closeSidebar;


/* =========================
   HISTORY
========================= */
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
    if (history.length > 10) history.pop();

    localStorage.setItem("practiceHistory", JSON.stringify(history));
    renderHistory();
}

export function clearHistory() {
    if (confirm("Are you sure you want to clear all history?")) {
        localStorage.removeItem("practiceHistory");
        renderHistory();
    }
}
window.clearHistory = clearHistory;

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
        const div = document.createElement("div");
        div.className = "card bg-base-200 hover:bg-base-300 cursor-pointer transition-colors p-4 group";

        // Màu sắc dựa trên điểm số: 
        // 100% màu xanh (success)
        // >= 80% màu vàng (warning)
        // >= 50% màu tím (secondary)
        // < 50% màu đỏ (error)
        const percentNum = parseInt(item.percent);
        const scoreColor = percentNum === 100 ? 'text-success' :
            percentNum >= 80 ? 'text-warning' :
                percentNum >= 50 ? 'text-secondary font-bold' : 'text-error';

        div.innerHTML = `
            <div class="flex flex-col gap-1" onclick="loadHistory(${index})">
                <div class="flex justify-between items-start gap-2">
                    <span class="font-bold text-primary truncate flex-1 opacity-90">${item.title || "No Title"}</span>
                    <span class="font-bold text-lg lg:text-xl ${scoreColor} shrink-0">${item.score}</span>
                </div>
                <div class="flex justify-between items-center mt-1">
                    <div class="text-xs opacity-50 uppercase font-bold">${item.date}</div>
                    <div class="badge badge-ghost badge-sm opacity-50">${item.percent}</div>
                </div>
            </div>`;

        container.appendChild(div);
    });
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
    updateTimerDisplay();
}
window.setTimer = setTimer;

export function adjustTimer(direction) {
    const delta = direction * timerStep * 60;
    remainingSeconds = Math.max(0, remainingSeconds + delta);
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
        btn?.classList.replace("btn-primary", "btn-neutral");
    } else {
        playIcon?.classList.remove("hidden");
        pauseIcon?.classList.add("hidden");
        if (btnText) {
            btnText.innerText = remainingSeconds > 0 ? "Tiếp tục" : "Bắt đầu";
        }
        btn?.classList.replace("btn-neutral", "btn-primary");
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

export function resetTimer() {
    clearInterval(timerInterval);
    timerRunning = false;
    remainingSeconds = 0;
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
function handleScroll() {
    const mainContent = document.getElementById("mainContent");
    const floatTimer = document.getElementById("floatTimer");
    const timerSection = document.getElementById("timerSection");
    const timerToggle = document.getElementById("timerToggle");

    if (!mainContent || !floatTimer || !timerSection || !timerToggle) return;

    const isTimerActive = timerToggle.checked && remainingSeconds > 0;
    const timerRect = timerSection.getBoundingClientRect();

    // Show float timer if main timer is out of view (scrolled past)
    if (isTimerActive && timerRect.bottom < 0) {
        floatTimer.classList.remove("hidden");
    } else {
        floatTimer.classList.add("hidden");
    }
}

document.getElementById("mainContent")?.addEventListener("scroll", handleScroll);


// Initial history on load
renderHistory();
