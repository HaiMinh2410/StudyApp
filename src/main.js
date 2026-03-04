import './style.css';

let questions = [];
let userAnswers = {};
let isReviewMode = false;

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
   CLEAN TEXT (PDF SAFE)
========================= */
function cleanText(text) {
    return text
        .replace(/\r/g, "")
        .replace(/⸻|—|–/g, "")
        .replace(/[ \t]+/g, " ")
        .replace(/\n{2,}/g, "\n")
        .trim();
}

/* =========================
   GENERATE EXERCISE
========================= */
export function generateExercise() {

    isReviewMode = false;
    userAnswers = {};

    const rawInput = document.getElementById("inputData").value;
    const raw = cleanText(rawInput);
    const lines = raw.split("\n").map(l => l.trim()).filter(l => l);

    questions = [];
    let answerSection = false;
    let currentQuestion = null;
    let currentAnswerNumber = null;

    lines.forEach(line => {

        /* ===== Detect start of answer block ===== */
        if (/ANSWER KEY/i.test(line)) {
            answerSection = true;
            return;
        }

        /* ===== ANSWER MODE ===== */
        if (answerSection) {

            let answerStart = line.match(/^(\d+)[\.\)]\s*([A-D])/i);

            if (answerStart) {
                currentAnswerNumber = parseInt(answerStart[1]);

                let q = questions.find(x => x.number === currentAnswerNumber);
                if (q) {
                    q.answer = answerStart[2].toUpperCase();
                    q.explanation = line.substring(answerStart[0].length).trim();
                }
                return;
            }

            /* Append explanation until next answer number */
            if (currentAnswerNumber) {
                let q = questions.find(x => x.number === currentAnswerNumber);
                if (q) {
                    q.explanation += "<br>" + line;
                }
            }

            return;
        }

        /* ===== QUESTION ===== */
        let qMatch = line.match(/^(\d+)[\.\)]\s+(.*)/);
        if (qMatch) {
            currentQuestion = {
                number: parseInt(qMatch[1]),
                text: qMatch[2],
                options: [],
                answer: null,
                explanation: ""
            };
            questions.push(currentQuestion);
            return;
        }

        /* ===== OPTION ===== */
        if (currentQuestion && /^[A-D][\.\)]\s*/.test(line)) {
            currentQuestion.options.push(line);
        }

    });

    renderExercise();

    updateButtonStates();
}
window.generateExercise = generateExercise;

export function clearInput() {
    const input = document.getElementById("inputData");
    if (input) {
        input.value = "";
        updateInputButtons();
    }
}
window.clearInput = clearInput;

function updateInputButtons() {
    const input = document.getElementById("inputData");
    const clearBtn = document.getElementById("clearInputBtn");
    const generateBtn = document.getElementById("generateExerciseBtn");

    if (input && clearBtn && generateBtn) {
        const hasContent = input.value.trim().length > 0;
        clearBtn.disabled = !hasContent;
        generateBtn.disabled = !hasContent;
    }
}
// Listen for input changes
document.getElementById("inputData")?.addEventListener("input", updateInputButtons);
// Initial check
updateInputButtons();

function updateButtonStates() {
    const hasQ = questions.length > 0;
    const submitBtns = document.querySelectorAll("#submitBottomBtn, #desktopSubmitBtn");
    const resetBtns = document.querySelectorAll("#resetBottomBtn, #resetTopBtn, #desktopResetBtn");

    submitBtns.forEach(btn => btn.disabled = !hasQ || isReviewMode);
    resetBtns.forEach(btn => btn.disabled = !hasQ);
}

/* =========================
   RENDER
========================= */
export function renderExercise(savedData = null) {

    const container = document.getElementById("exerciseContainer");
    if (!container) return;
    container.innerHTML = "";

    questions.forEach(q => {

        const div = document.createElement("div");
        // Using DaisyUI Card
        div.className = "card bg-base-100 shadow-md border border-base-200 overflow-hidden duration-300 transition-all";
        div.id = "q" + q.number;

        let optionsHtml = q.options.map(opt => {
            const letter = opt.charAt(0);
            return `
            <label class="form-control flex flex-row items-center gap-3 p-3 hover:bg-base-200 cursor-pointer rounded-lg transition-colors border border-transparent">
                <input type="radio" name="q${q.number}" value="${letter}" class="radio radio-primary radio-sm">
                <span class="label-text flex-1 select-none">${opt}</span>
            </label>`;
        }).join("");

        div.innerHTML = `
            <div class="card-body p-5">
                <h3 class="flex items-start gap-2 mb-2">
                    <span class="badge badge-primary shrink-0">Q${q.number}</span>
                    <span class="font-semibold leading-relaxed">${q.text}</span>
                </h3>
                <div class="space-y-2 mt-4">
                    ${optionsHtml}
                </div>
                <!-- Explanation section (hidden by default) -->
                <div id="exp${q.number}" class="mt-6 p-4 rounded-xl hidden border-l-4"></div>
            </div>`;

        container.appendChild(div);
    });

    if (savedData) {
        isReviewMode = true;
        userAnswers = savedData.answers;

        questions.forEach(q => {
            const user = userAnswers[q.number];
            if (user) {
                const radioSelector = `input[name="q${q.number}"][value="${user}"]`;
                const radio = document.querySelector(radioSelector);
                if (radio) radio.checked = true;
            }
        });

        submitAnswers(true);
    }

    updateButtonStates();
}

/* =========================
   SUBMIT
========================= */
export function submitAnswers(review = false) {

    if (!review && isReviewMode) return;
    if (questions.length === 0) return;

    if (!review) {
        const answeredCount = questions.filter(q => {
            const selected = document.querySelector(`input[name="q${q.number}"]:checked`);
            return !!selected;
        }).length;

        if (answeredCount === 0) {
            alert("Bạn chưa làm bài!");
            return;
        }

        const modal = document.getElementById('submitModal');
        const modalTitle = document.getElementById('modalTitle');
        const modalMessage = document.getElementById('modalMessage');

        if (answeredCount < questions.length) {
            modalTitle.innerText = "Chưa hoàn thành bài làm";
            modalMessage.innerText = `Bạn mới làm được ${answeredCount}/${questions.length} câu. Bạn có chắc muốn nộp bài không?`;
        } else {
            modalTitle.innerText = "Xác nhận nộp bài";
            modalMessage.innerText = "Bạn có chắc chắn muốn nộp bài không?";
        }

        modal.showModal();
        return;
    }

    processSubmission(true);
}

function processSubmission(review = false) {
    let correct = 0;
    if (!review) userAnswers = {};

    questions.forEach(q => {
        const selected = document.querySelector(`input[name="q${q.number}"]:checked`);

        if (!review) {
            userAnswers[q.number] = selected ? selected.value : "";
        }

        const div = document.getElementById("q" + q.number);
        const user = userAnswers[q.number];
        const exp = document.getElementById("exp" + q.number);

        if (!div || !exp) return;

        // Reset classes
        div.classList.remove("border-success", "bg-success/5", "border-error", "bg-error/5");
        exp.classList.remove("hidden", "bg-success/10", "border-success", "bg-error/10", "border-error");

        if (user === q.answer) {
            div.classList.add("border-success", "bg-success/5");
            exp.classList.add("bg-success/10", "border-success", "text-success-content");
            correct++;
        } else {
            div.classList.add("border-error", "bg-error/5");
            exp.classList.add("bg-error/10", "border-error", "text-error-content");
        }

        exp.classList.remove("hidden");
        exp.classList.add("block");

        exp.innerHTML = `
            <div class="flex flex-col gap-2">
                <div class="text-sm">
                    <span class="font-bold opacity-70">Correct:</span> 
                    <span class="font-bold text-lg">${q.answer}</span>
                </div>
                <div class="text-sm mb-2">
                    <span class="font-bold opacity-70">Your selection:</span> 
                    <span class="font-semibold">${user || "(Not answered)"}</span>
                </div>
                <div class="divider h-0 my-0 opacity-20"></div>
                <p class="italic text-sm leading-relaxed">${q.explanation || "No explanation available."}</p>
            </div>`;

        // Highlight labels
        const labels = div.querySelectorAll('label');
        labels.forEach(lbl => {
            const input = lbl.querySelector('input');
            const val = input.value;
            if (val === q.answer) {
                lbl.classList.add("bg-success/20", "border-success/50", "ring-1", "ring-success");
            } else if (val === user && user !== q.answer) {
                lbl.classList.add("bg-error/20", "border-error/50", "ring-1", "ring-error");
            }
        });

        // Disable radios after submission
        const radios = div.querySelectorAll('input[type="radio"]');
        radios.forEach(r => r.disabled = true);
    });

    if (!review) {
        saveHistory(correct, questions.length, userAnswers);
        isReviewMode = true;
        updateButtonStates();
    }
}
window.processSubmission = processSubmission;
window.submitAnswers = submitAnswers;

/* =========================
   RESET
========================= */
export function resetExercise() {

    if (questions.length === 0) return;

    userAnswers = {};
    isReviewMode = false;

    renderExercise(); // Re-render to clear all states cleaner
    updateButtonStates();
}
window.resetExercise = resetExercise;

/* =========================
   HISTORY
========================= */
function saveHistory(correct, total, answers) {

    const percent = Math.round((correct / total) * 100);

    const record = {
        date: new Date().toLocaleString(),
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

        const scoreColor = parseInt(item.percent) >= 80 ? 'text-success' :
            parseInt(item.percent) >= 50 ? 'text-warning' : 'text-error';

        div.innerHTML = `
            <div class="flex justify-between items-center" onclick="loadHistory(${index})">
                <div class="flex-1">
                    <div class="font-bold text-lg ${scoreColor}">${item.score} <span class="text-xs font-normal opacity-70">(${item.percent})</span></div>
                    <div class="text-[10px] opacity-60 mt-1">${item.date}</div>
                </div>
                <div class="opacity-0 group-hover:opacity-100 transition-opacity">
                    <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" /></svg>
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

    questions = record.questions;
    userAnswers = record.answers;

    renderExercise(record);
    closeSidebar();

    // Scroll to top
    const main = document.getElementById('mainContent');
    if (main) main.scrollTo({ top: 0, behavior: 'smooth' });
}
window.loadHistory = loadHistory;

// Init history on load
renderHistory();
