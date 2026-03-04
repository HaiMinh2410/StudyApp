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
        .replace(/⸻|—|–/g, "-")
        .replace(/[ \t]+/g, " ")
        .replace(/\n{2,}/g, "\n")
        .trim();
}

function extractFitbAnswer(qText, aText) {
    // Find underscores and optional hint in parenthesis: __________ (work)
    let blankMatch = qText.match(/_+(\s*\(.*?\))?/);
    if (!blankMatch) return aText.trim();

    let blankStr = blankMatch[0];
    let parts = qText.split(blankStr);
    let prefix = parts[0].trim();
    let suffix = parts[1] ? parts[1].trim() : "";

    let result = aText.trim();

    // Remove prefix if exists
    if (prefix && result.startsWith(prefix)) {
        result = result.substring(prefix.length).trim();
    }

    // Remove suffix if exists
    // We handle the end carefully to avoid over-trimming
    if (suffix && result.endsWith(suffix)) {
        result = result.substring(0, result.length - suffix.length).trim();
    }

    // If we still have a period at the end that wasn't in the suffix, we might want to keep it or trim it
    // But usually for FITB, we want the exact word.
    return result;
}

/* =========================
   GENERATE EXERCISE
========================= */
export function generateExercise() {

    isReviewMode = false;
    userAnswers = {};
    if (typeof resetTimer === "function") resetTimer();

    const rawInput = document.getElementById("inputData").value;
    const raw = cleanText(rawInput);
    const lines = raw.split("\n").map(l => l.trim()).filter(l => l);

    questions = [];
    let answerSection = false;
    let currentQuestion = null;
    let currentAnswerNumber = null;

    let currentSection = null;
    let currentSectionInAnswers = null;

    lines.forEach(line => {

        /* ===== INLINE ANSWER (e.g., Đáp án: B) ===== */
        const inlineAnswerMatch = line.match(/^(đáp án|answer):\s*([A-D])/i);
        if (inlineAnswerMatch && currentQuestion) {
            currentQuestion.answer = inlineAnswerMatch[2].toUpperCase();
            currentQuestion.isCapturingExplanation = false;
            return;
        }

        /* ===== INLINE EXPLANATION START (e.g., Giải thích:) ===== */
        const inlineExpMatch = line.match(/^(giải thích|explanation):/i);
        if (inlineExpMatch && currentQuestion) {
            let rest = line.substring(inlineExpMatch[0].length).trim();
            currentQuestion.explanation = (currentQuestion.explanation ? currentQuestion.explanation + "<br>" : "") + rest;
            currentQuestion.isCapturingExplanation = true;
            return;
        }

        /* ===== Detect start of answer block (Traditional) ===== */
        // Match "ANSWER KEY" or "ĐÁP ÁN" headers, but NOT "Đáp án: B"
        const answerKeyMatch = line.match(/^(ANSWER KEY|ĐÁP ÁN|LỜI GIẢI|HƯỚNG DẪN GIẢI)(\s*:)?$/i) ||
            (line.match(/ANSWER KEY|ĐÁP ÁN|LỜI GIẢI/i) && !line.match(/^(đáp án|answer):/i));

        if (answerKeyMatch) {
            answerSection = true;
            // Check if this answer key belongs to a specific section (e.g. "Answer Key - Exercise 1")
            const specificSectionMatch = line.match(/(exercise|bài|test|phần|đề|câu)[\s_]*\d+/i);
            if (specificSectionMatch) {
                const snippet = specificSectionMatch[0].toLowerCase();
                currentSectionInAnswers = snippet;
            } else {
                currentSectionInAnswers = null;
            }
            return;
        }

        /* ===== ANSWER MODE (Traditional Answer Key at the end) ===== */
        if (answerSection) {
            let answerStart = line.match(/^(\d+)[\.\)]\s*([A-D])/i);
            if (answerStart) {
                currentAnswerNumber = parseInt(answerStart[1]);
                let q = questions.find(x => {
                    const numMatch = x.number === currentAnswerNumber;
                    if (!numMatch) return false;
                    if (!currentSectionInAnswers) return true;
                    return x.section && x.section.toLowerCase().includes(currentSectionInAnswers);
                });
                if (!q) q = questions.find(x => x.number === currentAnswerNumber && !x.answer);
                if (q) {
                    q.answer = answerStart[2].toUpperCase();
                    q.explanation = line.substring(answerStart[0].length).trim();
                }
                return;
            }
            if (currentAnswerNumber) {
                let q = questions.find(x => x.number === currentAnswerNumber && (!currentSectionInAnswers || (x.section && x.section.toLowerCase().includes(currentSectionInAnswers))));
                if (!q) q = questions.find(x => x.number === currentAnswerNumber);
                if (q) {
                    q.explanation += "<br>" + line;
                }
            }
            return;
        }

        /* ===== QUESTION (Detect Q and FITB Answers) ===== */
        // Support: 1., 1), Câu 1., Bài 1:
        let qMatch = line.match(/^(?:(?:câu|bài)[\s_]*)?(\d+)(?:[\.\):])\s*(.*)/i);
        if (qMatch) {
            let num = parseInt(qMatch[1]);
            let content = qMatch[2];

            let existing = questions.find(x => x.number === num && x.section === currentSection);
            if (existing && !answerSection) {
                if (existing.options.length === 0 && !existing.answer) {
                    existing.type = 'fitb';
                    existing.answer = extractFitbAnswer(existing.text, content);
                    existing.fullAnswer = content;
                }
                return;
            }

            currentQuestion = {
                id: questions.length,
                number: num,
                section: currentSection,
                text: content,
                options: [],
                answer: null,
                explanation: "",
                type: 'mcq',
                isCapturingExplanation: false
            };
            questions.push(currentQuestion);
            return;
        }

        /* ===== Detect Section Header (Exercise, Test, etc.) ===== */
        // Match "Exercise 1", "Test 01", etc. 
        // We do this AFTER qMatch to avoid matching "Câu 1" as a section if it's meant as a question
        const sectionMatch = line.match(/^(exercise|test|phần|đề|câu|bài)[\s_]*\d+/i);
        if (sectionMatch) {
            currentSection = line.trim();
            answerSection = false;
            currentQuestion = null;
            return;
        }

        /* ===== OPTION ===== */
        if (currentQuestion && /^[A-D][\.\)]\s*/.test(line)) {
            currentQuestion.options.push(line);
            currentQuestion.isCapturingExplanation = false;
            return;
        }

        /* ===== INLINE EXPLANATION (Starting with →) ===== */
        if (line.startsWith("→") && currentQuestion) {
            currentQuestion.explanation = (currentQuestion.explanation ? currentQuestion.explanation + "<br>" : "") + line.substring(1).trim();
            return;
        }

        /* ===== APPEND TO QUESTION BODY OR EXPLANATION ===== */
        if (currentQuestion) {
            if (currentQuestion.isCapturingExplanation) {
                currentQuestion.explanation += (currentQuestion.explanation ? "<br>" : "") + line;
            } else if (currentQuestion.options.length === 0) {
                currentQuestion.text = (currentQuestion.text ? currentQuestion.text + " " : "") + line;
            }
        }

    });

    /* =========================
       VALIDATION
    ========================= */
    const errors = [];
    if (questions.length === 0) {
        errors.push("Không tìm thấy câu hỏi nào (Định dạng: '1. Câu hỏi').");
    }

    const hasMcq = questions.some(q => q.type === 'mcq');

    // Remove the global answerSection check as it's unreliable for multi-section inputs.
    // We now rely on per-question validation below which is more accurate.

    questions.forEach(q => {
        if (q.type === 'mcq') {
            if (q.options.length < 2) {
                errors.push(`Câu ${q.number}: Phải có ít nhất 2 phương án lựa chọn (A, B, ...).`);
            }
            if (!q.answer) {
                errors.push(`Câu ${q.number}: Thiếu đáp án đúng trong mục ANSWER KEY.`);
            }
        } else if (q.type === 'fitb') {
            if (!q.answer) {
                errors.push(`Câu ${q.number}: Không xác định được đáp án từ dòng dữ liệu thứ hai.`);
            }
        }
    });

    if (errors.length > 0) {
        showInputError(errors);
        return;
    }

    hideInputError();
    renderExercise();

    // Timer Logic: Show/Hide based on toggle
    const timerToggle = document.getElementById("timerToggle");
    const timerSection = document.getElementById("timerSection");
    if (timerToggle && timerSection) {
        if (timerToggle.checked) {
            timerSection.classList.remove("hidden");
        } else {
            timerSection.classList.add("hidden");
            if (typeof resetTimer === "function") resetTimer();
        }
    }

    updateButtonStates();
}
window.generateExercise = generateExercise;

export function clearInput() {
    const input = document.getElementById("inputData");
    if (input) {
        input.value = "";
        hideInputError();
        updateInputButtons();
    }
}
window.clearInput = clearInput;

function showInputError(errors) {
    const alertBody = document.getElementById("inputErrorAlert");
    const errorList = document.getElementById("errorList");
    if (alertBody && errorList) {
        errorList.innerHTML = errors.map(err => `<li>${err}</li>`).join("");
        alertBody.classList.remove("hidden");
        alertBody.classList.add("flex");
        // Scroll to error if needed
        alertBody.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }
}

function hideInputError() {
    const alertBody = document.getElementById("inputErrorAlert");
    if (alertBody) {
        alertBody.classList.remove("flex");
        alertBody.classList.add("hidden");
    }
}

function updateInputButtons() {
    const input = document.getElementById("inputData");
    const clearBtn = document.getElementById("clearInputBtn");
    const generateBtn = document.getElementById("generateExerciseBtn");

    if (input && clearBtn && generateBtn) {
        const hasContent = input.value.trim().length > 0;
        clearBtn.disabled = !hasContent;
        generateBtn.disabled = !hasContent;

        // Hide error when input changes (until they click generate again)
        if (hasContent) {
            // Optional: hide on change, or stay until generate? 
            // Usually stay until they try to fix it.
        } else {
            hideInputError();
        }
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

    // Kiểm tra xem có câu nào được chọn/điền chưa
    const hasAnswer = isReviewMode || Array.from(document.querySelectorAll('#exerciseContainer input')).some(i => {
        if (i.type === 'radio') return i.checked;
        return i.value.trim().length > 0;
    });

    submitBtns.forEach(btn => btn.disabled = !hasQ || isReviewMode || !hasAnswer);
    resetBtns.forEach(btn => btn.disabled = !hasQ || !hasAnswer);
}

/* =========================
   RENDER
========================= */
export function renderExercise(savedData = null) {

    const container = document.getElementById("exerciseContainer");
    if (!container) return;
    container.innerHTML = "";

    let lastSection = null;
    questions.forEach((q, idx) => {

        // Render Section Header if it changes
        if (q.section !== lastSection && q.section) {
            const sectionHeader = document.createElement("div");
            sectionHeader.className = "col-span-full mt-6 mb-2";
            sectionHeader.innerHTML = `
                <div class="flex items-center gap-4">
                    <h2 class="text-2xl font-black text-primary uppercase tracking-wider">${q.section}</h2>
                    <div class="h-px bg-primary/20 flex-1"></div>
                </div>
            `;
            container.appendChild(sectionHeader);
            lastSection = q.section;
        }

        const div = document.createElement("div");
        div.className = "card bg-base-100 shadow-md border border-base-200 overflow-hidden duration-300 transition-all";
        div.id = "q" + q.id; // Use ID instead of number

        let bodyHtml = "";

        if (q.type === 'fitb') {
            bodyHtml = `
            <div class="form-control w-full mt-4">
                <input type="text" placeholder="Nhập đáp án..." 
                    class="input input-bordered input-primary w-full max-w-md font-medium shadow-inner"
                    name="q${q.id}" autocomplete="off">
            </div>`;
        } else {
            bodyHtml = `<div class="space-y-2 mt-4">` + q.options.map(opt => {
                const letter = opt.charAt(0);
                return `
                <label class="form-control flex flex-row items-center gap-3 p-3 hover:bg-base-200 cursor-pointer rounded-lg transition-all border border-transparent">
                    <input type="radio" name="q${q.id}" value="${letter}" class="radio radio-primary radio-sm">
                    <span class="label-text flex-1 select-none">${opt}</span>
                </label>`;
            }).join("") + `</div>`;
        }

        div.innerHTML = `
            <div class="card-body p-5 md:p-6">
                <h3 class="flex items-start gap-2 mb-2">
                    <span class="badge badge-primary shrink-0 mt-1">${'Q' + q.number}</span>
                    <span class="font-bold text-lg leading-relaxed text-base-content">${q.text}</span>
                </h3>
                ${bodyHtml}
                <!-- Explanation section (hidden by default) -->
                <div id="exp${q.id}" class="mt-6 p-4 rounded-xl hidden border-l-4 text-base-content"></div>
            </div>`;

        container.appendChild(div);
    });

    if (savedData) {
        isReviewMode = true;
        userAnswers = savedData.answers;

        questions.forEach(q => {
            const user = userAnswers[q.id]; // Use id
            if (user) {
                const radioSelector = `input[name="q${q.id}"][value="${user}"]`;
                const radio = document.querySelector(radioSelector);
                if (radio) radio.checked = true;

                // For FITB
                if (q.type === 'fitb') {
                    const input = document.querySelector(`input[name="q${q.id}"]`);
                    if (input) input.value = user;
                }
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
            if (q.type === 'fitb') {
                const input = document.querySelector(`input[name="q${q.id}"]`);
                return input && input.value.trim().length > 0;
            } else {
                const selected = document.querySelector(`input[name="q${q.id}"]:checked`);
                return !!selected;
            }
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
        let selectedValue = "";
        if (q.type === 'fitb') {
            const input = document.querySelector(`input[name="q${q.id}"]`);
            selectedValue = input ? input.value.trim() : "";
        } else {
            const selected = document.querySelector(`input[name="q${q.id}"]:checked`);
            selectedValue = selected ? selected.value : "";
        }

        if (!review) {
            userAnswers[q.id] = selectedValue;
        }

        const div = document.getElementById("q" + q.id);
        const user = userAnswers[q.id];
        const exp = document.getElementById("exp" + q.id);

        if (!div || !exp) return;

        // Reset classes
        div.classList.remove("border-success", "bg-success/5", "border-error", "bg-error/5");
        exp.classList.remove("hidden", "bg-success/10", "border-success", "bg-error/10", "border-error");

        const isCorrect = q.type === 'fitb'
            ? user.toLowerCase() === q.answer.toLowerCase()
            : user === q.answer;

        if (isCorrect) {
            div.classList.add("border-success", "bg-success/5");
            exp.classList.add("bg-success/20", "border-success"); // Higher contrast background
            correct++;
        } else {
            div.classList.add("border-error", "bg-error/5");
            exp.classList.add("bg-error/20", "border-error"); // Higher contrast background
        }

        exp.classList.remove("hidden");
        exp.classList.add("block");


        exp.innerHTML = `
            <div class="flex flex-col gap-2">
                <div class="text-sm">
                    <span class="font-semibold opacity-70">Correct:</span> 
                    <span class="font-semibold">${q.answer}</span>
                </div>
                <div class="divider h-px my-1 opacity-10"></div>
                <div class="flex items-start gap-2">
                     <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4 mt-0.5 opacity-50" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <p class="text-sm leading-relaxed text-base-content italic">${q.explanation || "No explanation available."}</p>
                </div>
            </div>`;

        // Highlight labels/inputs
        if (q.type === 'fitb') {
            const input = div.querySelector('input[type="text"]');
            if (input) {
                input.disabled = true;
                if (isCorrect) {
                    input.classList.remove("input-primary");
                    input.classList.add("input-success");
                } else {
                    input.classList.remove("input-primary");
                    input.classList.add("input-error");
                }
            }
        } else {
            const labels = div.querySelectorAll('label');
            labels.forEach(lbl => {
                const input = lbl.querySelector('input');
                const val = input.value;
                if (val === q.answer) {
                    lbl.classList.add("bg-success/20", "border-success/50", "ring-1", "ring-success");
                } else if (val === user && user !== q.answer) {
                    lbl.classList.add("bg-error/20", "border-error/50", "ring-1", "ring-error");
                }
                input.disabled = true;
            });
        }
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
    if (typeof resetTimer === "function") resetTimer();

    renderExercise(); // Re-render to clear all states cleaner
    updateButtonStates();

    // Tự động cuộn đến câu hỏi đầu tiên
    const container = document.getElementById("exerciseContainer");
    if (container) {
        container.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
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

    // Scroll to first question
    const container = document.getElementById("exerciseContainer");
    if (container) {
        container.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
}
window.loadHistory = loadHistory;

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

/* =========================
   MY WORD LIST (ALBUMS) LOGIC
========================= */
let selectedTextToSave = "";
let currentViewAlbumId = null;
let pendingWordData = null;
let pendingAlbumId = null;
let isSelectionMode = false;
let selectedWordIndices = new Set();

// Khởi tạo Word List
function initWordList() {
    const albums = getAlbums();
    if (albums.length === 0) {
        // Tạo album mặc định nếu chưa có
        saveAlbums([{ id: Date.now(), name: "Từ vựng quan trọng", words: [] }]);
    }
}

function getAlbums() {
    const albums = JSON.parse(localStorage.getItem("wordAlbums") || "[]");
    // Sắp xếp theo ID giảm dần (từ mới nhất đến cũ nhất)
    return albums.sort((a, b) => b.id - a.id);
}

function saveAlbums(albums) {
    localStorage.setItem("wordAlbums", JSON.stringify(albums));
}

// Xử lý khi bôi đen văn bản
function handleTextSelection() {
    const selection = window.getSelection();
    const text = selection.toString().trim();
    const popup = document.getElementById("selectionPopup");

    // Chỉ hiện popup nếu chọn từ ngắn (dưới 100 ký tự)
    if (text && text.length > 0 && text.length < 100) {
        selectedTextToSave = text;
        const range = selection.getRangeAt(0);
        const rect = range.getBoundingClientRect();

        // Tính toán vị trí Popup (ở giữa phía trên vùng chọn)
        popup.style.left = `${rect.left + (rect.width / 2)}px`;
        popup.style.top = `${rect.top + window.scrollY - 12}px`;
        popup.style.transform = "translateX(-50%) translateY(-100%)";
        popup.classList.remove("hidden");
    } else {
        if (popup) popup.classList.add("hidden");
    }
}

// Logic cho các Modal
export function openAddToAlbumModal() {
    const modal = document.getElementById("addToAlbumModal");
    const input = document.getElementById("selectedWordInput");
    const select = document.getElementById("albumSelect");

    if (input) input.value = selectedTextToSave;

    // Reset các trường khác về trạng thái chờ
    const typeInput = document.getElementById("wordTypeInput");
    const phoneticInput = document.getElementById("wordPhoneticInput");
    const meaningInput = document.getElementById("wordMeaningInput");

    if (typeInput) typeInput.value = "";
    if (phoneticInput) phoneticInput.value = "";
    if (meaningInput) meaningInput.value = "";

    // Đổ danh sách album vào select
    const albums = getAlbums();
    if (select) {
        select.innerHTML = albums.map(a => `<option value="${a.id}">${a.name}</option>`).join("");
    }

    if (modal) modal.showModal();
    document.getElementById("selectionPopup")?.classList.add("hidden");

    // Tự động tra cứu
    if (selectedTextToSave) {
        fetchWordDetails(selectedTextToSave);
    }
}

async function fetchWordDetails(word) {
    const typeInput = document.getElementById("wordTypeInput");
    const phoneticInput = document.getElementById("wordPhoneticInput");
    const meaningInput = document.getElementById("wordMeaningInput");

    // Hiển thị trạng thái đang tải (placeholder)
    if (typeInput) typeInput.placeholder = "🔍...Đang tìm...";
    if (phoneticInput) phoneticInput.placeholder = "🔍...Đang tìm...";
    if (meaningInput) meaningInput.placeholder = "🔍...Đang tìm...";

    try {
        // 1. Lấy phiên âm và loại từ từ Free Dictionary API
        const dictPromise = fetch(`https://api.dictionaryapi.dev/api/v2/entries/en/${word}`)
            .then(res => res.ok ? res.json() : null);

        // 2. Dịch nghĩa sang tiếng Việt qua MyMemory API
        const transPromise = fetch(`https://api.mymemory.translated.net/get?q=${encodeURIComponent(word)}&langpair=en|vi`)
            .then(res => res.ok ? res.json() : null);

        const [dictData, transData] = await Promise.all([dictPromise, transPromise]);

        if (dictData && dictData[0]) {
            const entry = dictData[0];
            if (phoneticInput) {
                phoneticInput.value = entry.phonetic || (entry.phonetics && entry.phonetics.find(p => p.text)?.text) || "";
            }
            if (typeInput && entry.meanings && entry.meanings[0]) {
                const rawType = entry.meanings[0].partOfSpeech || "";
                const typeMap = {
                    'noun': 'n',
                    'verb': 'v',
                    'adjective': 'adj',
                    'adverb': 'adv',
                    'preposition': 'pre'
                };
                typeInput.value = typeMap[rawType.toLowerCase()] || rawType;
            }
        }

        if (transData && transData.responseData) {
            if (meaningInput) {
                let translated = transData.responseData.translatedText;
                // Loại bỏ các trường hợp dịch bị lỗi hoặc trả về chính từ gốc
                if (translated && translated.toLowerCase() !== word.toLowerCase()) {
                    meaningInput.value = translated;
                }
            }
        }
    } catch (e) {
        console.error("Lookup error:", e);
    } finally {
        if (typeInput) typeInput.placeholder = "Ví dụ: n";
        if (phoneticInput) phoneticInput.placeholder = "/.../";
        if (meaningInput) meaningInput.placeholder = "Nghĩa của từ...";
    }
}

export function createNewAlbum() {
    const nameInput = document.getElementById("newAlbumName");
    const name = nameInput?.value.trim();
    if (!name) return;

    const albums = getAlbums();
    const newAlbum = { id: Date.now(), name: name, words: [] };
    albums.unshift(newAlbum); // Thêm vào đầu danh sách
    saveAlbums(albums);

    // Refresh select list trong modal
    const select = document.getElementById("albumSelect");
    if (select) {
        const option = document.createElement("option");
        option.value = newAlbum.id;
        option.text = newAlbum.name;
        option.selected = true;
        select.add(option);
    }
    if (nameInput) nameInput.value = "";
}

export function saveWordToAlbum() {
    const albumSelect = document.getElementById("albumSelect");
    const wordInput = document.getElementById("selectedWordInput");
    const typeInput = document.getElementById("wordTypeInput");
    const phoneticInput = document.getElementById("wordPhoneticInput");
    const meaningInput = document.getElementById("wordMeaningInput");

    if (!albumSelect || !wordInput) return;

    const albumId = albumSelect.value;
    const wordData = {
        word: wordInput.value.trim(),
        type: typeInput ? typeInput.value.trim() : "",
        phonetic: phoneticInput ? phoneticInput.value.trim() : "",
        meaning: meaningInput ? meaningInput.value.trim() : ""
    };

    if (!albumId || !wordData.word) return;

    const albums = getAlbums();
    const album = albums.find(a => a.id == albumId);
    if (album) {
        // Kiểm tra xem từ đã tồn tại chưa
        const exists = album.words.some(w => (typeof w === 'string' ? w : w.word).toLowerCase() === wordData.word.toLowerCase());

        if (exists) {
            pendingWordData = wordData;
            pendingAlbumId = albumId;
            const msg = `Từ "${wordData.word}" đã tồn tại trong album "${album.name}". Bạn có muốn thêm lại không?`;
            const msgEl = document.getElementById("duplicateModalMessage");
            if (msgEl) msgEl.innerText = msg;
            document.getElementById("confirmDuplicateModal")?.showModal();
            return;
        }

        executeSaveWord(wordData, albumId);
    }
}

function executeSaveWord(wordData, albumId) {
    const albums = getAlbums();
    const album = albums.find(a => a.id == albumId);
    if (album) {
        album.words.unshift(wordData); // Thêm vào đầu danh sách
        saveAlbums(albums);
    }

    // Clear inputs sau khi lưu
    const typeInput = document.getElementById("wordTypeInput");
    const phoneticInput = document.getElementById("wordPhoneticInput");
    const meaningInput = document.getElementById("wordMeaningInput");

    if (typeInput) typeInput.value = "";
    if (phoneticInput) phoneticInput.value = "";
    if (meaningInput) meaningInput.value = "";

    document.getElementById("addToAlbumModal")?.close();
}

export function confirmSaveDuplicate() {
    if (pendingWordData && pendingAlbumId) {
        executeSaveWord(pendingWordData, pendingAlbumId);
        pendingWordData = null;
        pendingAlbumId = null;
    }
    document.getElementById("confirmDuplicateModal")?.close();
}


export function openWordListModal() {
    currentViewAlbumId = null; // Reset view
    renderSideAlbumList();

    // Logic cho Mobile: Mặc định ẩn nghĩa và ẩn sidebar
    const isMobile = window.innerWidth < 1024;
    const hideToggle = document.getElementById("hideMeaningToggle");
    const sidebar = document.getElementById("wordListSidebar");
    const backdrop = document.getElementById("sidebarBackdrop");

    if (isMobile) {
        if (hideToggle) hideToggle.checked = true;
        if (sidebar) {
            sidebar.classList.remove("translate-x-0", "opacity-100");
            sidebar.classList.add("-translate-x-full", "opacity-0");
        }
        if (backdrop) {
            backdrop.classList.add("hidden");
            backdrop.classList.remove("opacity-100");
        }
    } else {
        // Desktop: Hiện sidebar
        if (sidebar) {
            sidebar.classList.remove("-translate-x-full", "opacity-0");
            sidebar.classList.add("translate-x-0", "opacity-100");
        }
    }

    const modal = document.getElementById("wordListModal");
    if (modal) modal.showModal();

    // Tự động chọn album đầu tiên sau khi render (dựa trên sắp xếp hiện tại)
    const albums = getSortedAlbums();
    if (albums.length > 0) {
        viewAlbum(albums[0].id);
    }
}

function getSortedAlbums() {
    const albums = getAlbums();
    const sortType = document.getElementById("sortAlbum")?.value || "newest";

    switch (sortType) {
        case "oldest":
            return albums.sort((a, b) => a.id - b.id);
        case "most":
            return albums.sort((a, b) => b.words.length - a.words.length);
        case "newest":
        default:
            return albums.sort((a, b) => b.id - a.id);
    }
}

export function showCreateAlbumInput() {
    const div = document.getElementById("newAlbumQuickInput");
    if (div) div.classList.toggle("hidden");
    const input = document.getElementById("sideNewAlbumName");
    if (input && !div.classList.contains("hidden")) input.focus();
}

export function createAlbumFromSidebar() {
    const input = document.getElementById("sideNewAlbumName");
    const name = input?.value.trim();
    if (!name) return;

    const albums = getAlbums();
    const newAlbum = { id: Date.now(), name: name, words: [] };
    albums.unshift(newAlbum); // Thêm vào đầu danh sách
    saveAlbums(albums);

    if (input) input.value = "";
    document.getElementById("newAlbumQuickInput")?.classList.add("hidden");
    renderSideAlbumList();
    viewAlbum(newAlbum.id); // View ngay album vừa tạo
}

function renderSideAlbumList() {
    const albums = getSortedAlbums();
    const container = document.getElementById("sideAlbumList");
    if (!container) return;

    container.innerHTML = albums.map(a => `
        <div class="group relative flex items-center mb-1">
            <button onclick="window.viewAlbum(${a.id})" 
                class="btn btn-ghost flex-1 justify-start text-left normal-case border-none hover:bg-primary/20 hover:text-primary transition-all rounded-xl py-6 h-auto ${currentViewAlbumId == a.id ? 'bg-primary/20 text-primary font-bold ring-1 ring-primary/20' : ''}">
                <div class="flex flex-col gap-0.5 w-full pr-8">
                    <span class="truncate font-bold">${a.name}</span>
                    <span class="text-[10px] opacity-50 uppercase font-black">${a.words.length} words</span>
                </div>
            </button>
            <button onclick="window.deleteAlbumById(${a.id})" 
                class="btn btn-ghost btn-circle btn-xs absolute right-3 opacity-0 group-hover:opacity-100 text-error hover:bg-error/10 transition-all" 
                title="Xóa Album">
                <svg xmlns="http://www.w3.org/2000/svg" class="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
            </button>
        </div>
    `).join("");
}

export function deleteAlbumById(id) {
    if (!confirm("Xóa album này và tất cả từ vựng bên trong?")) return;
    const albums = getAlbums();
    const filtered = albums.filter(a => a.id != id);
    saveAlbums(filtered);

    if (currentViewAlbumId == id) {
        currentViewAlbumId = null;
        const title = document.getElementById("currentAlbumTitle");
        const list = document.getElementById("wordListInAlbum");
        const wordSortControl = document.getElementById("wordSortControl");
        const studyMode = document.getElementById("studyModeControl");

        if (title) title.innerText = "Chọn một Album";
        if (list) list.innerHTML = `<div class="text-center py-20 opacity-20 italic">Chọn album ở cột bên trái để xem từ vựng</div>`;
        if (wordSortControl) wordSortControl.classList.add("hidden");
        if (studyMode) studyMode.classList.add("hidden");
    }
    renderSideAlbumList();
}

export function viewAlbum(id) {
    currentViewAlbumId = id;
    renderSideAlbumList();

    const albums = getAlbums();
    const album = albums.find(a => a.id == id);
    const title = document.getElementById("currentAlbumTitle");
    const wordSortControl = document.getElementById("wordSortControl");
    const studyMode = document.getElementById("studyModeControl");

    if (title && album) title.innerText = album.name;

    // Reset selection mode when switching albums
    isSelectionMode = false;
    selectedWordIndices.clear();
    updateBulkActionsBar();

    renderWordListOnly();

    // Trên mobile, sau khi chọn album thì tự động đóng sidebar
    if (window.innerWidth < 1024) {
        const sidebar = document.getElementById("wordListSidebar");
        if (sidebar && sidebar.classList.contains("translate-x-0")) {
            window.toggleWordListSidebar();
        }
    }
}

export function toggleSelectionMode() {
    isSelectionMode = !isSelectionMode;
    selectedWordIndices.clear();

    const btn = document.getElementById("toggleSelectionBtn");
    if (btn) {
        btn.classList.toggle("btn-primary", isSelectionMode);
        btn.classList.toggle("btn-ghost", !isSelectionMode);
    }

    updateBulkActionsBar();
    renderWordListOnly();
}

export function updateBulkActionsBar() {
    const bar = document.getElementById("bulkActionsBar");
    const countText = document.getElementById("selectedCountText");
    const moveBtn = document.getElementById("bulkMoveBtn");
    const deleteBtn = document.getElementById("bulkDeleteBtn");

    const hasSelection = selectedWordIndices.size > 0;

    if (bar) bar.classList.toggle("hidden", !isSelectionMode);
    if (countText) countText.innerText = `${selectedWordIndices.size} selected`;

    if (moveBtn) moveBtn.disabled = !hasSelection;
    if (deleteBtn) deleteBtn.disabled = !hasSelection;
}

export function handleWordSelect(idx) {
    if (selectedWordIndices.has(idx)) {
        selectedWordIndices.delete(idx);
    } else {
        selectedWordIndices.add(idx);
    }
    updateBulkActionsBar();
}

export function selectAllWords(bool) {
    if (bool) {
        const albums = getAlbums();
        const album = albums.find(a => a.id == currentViewAlbumId);
        if (album) {
            album.words.forEach((_, i) => selectedWordIndices.add(i));
        }
    } else {
        selectedWordIndices.clear();
    }
    updateBulkActionsBar();
    renderWordListOnly();
}

export function confirmClearAllWords() {
    const modal = document.getElementById("confirmGeneralModal");
    const title = document.getElementById("confirmGeneralTitle");
    const msg = document.getElementById("confirmGeneralMessage");
    const btn = document.getElementById("confirmGeneralBtn");

    if (title) title.innerText = "Xóa toàn bộ album";
    if (msg) msg.innerText = "Bạn có chắc chắn muốn xóa tất cả từ vựng trong album này không? Hành động này không thể hoàn tác.";
    if (btn) {
        btn.onclick = () => {
            clearAllWordsInAlbum();
            modal.close();
        };
    }

    modal?.showModal();
}

function clearAllWordsInAlbum() {
    if (!currentViewAlbumId) return;
    const albums = getAlbums();
    const album = albums.find(a => a.id == currentViewAlbumId);
    if (album) {
        album.words = [];
        saveAlbums(albums);
        renderWordListOnly();
        renderSideAlbumList();
    }
}

export function confirmDeleteSelected() {
    if (selectedWordIndices.size === 0) return;

    const modal = document.getElementById("confirmGeneralModal");
    const title = document.getElementById("confirmGeneralTitle");
    const msg = document.getElementById("confirmGeneralMessage");
    const btn = document.getElementById("confirmGeneralBtn");

    if (title) title.innerText = "Xóa các từ đã chọn";
    if (msg) msg.innerText = `Bạn có chắc muốn xóa ${selectedWordIndices.size} từ vựng đã chọn không?`;
    if (btn) {
        btn.onclick = () => {
            deleteSelectedWords();
            modal.close();
        };
    }

    modal?.showModal();
}

function deleteSelectedWords() {
    if (!currentViewAlbumId) return;
    const albums = getAlbums();
    const album = albums.find(a => a.id == currentViewAlbumId);
    if (album) {
        const sortedIndices = Array.from(selectedWordIndices).sort((a, b) => b - a);
        sortedIndices.forEach(idx => album.words.splice(idx, 1));

        saveAlbums(albums);
        selectedWordIndices.clear();
        updateBulkActionsBar();
        renderWordListOnly();
        renderSideAlbumList();
    }
}

export function openMoveWordsModal() {
    if (selectedWordIndices.size === 0) return;
    const modal = document.getElementById("moveWordsModal");
    const select = document.getElementById("targetAlbumSelect");

    const albums = getAlbums();
    if (select) {
        select.innerHTML = albums
            .filter(a => a.id != currentViewAlbumId)
            .map(a => `<option value="${a.id}">${a.name}</option>`)
            .join("");

        if (select.innerHTML === "") {
            alert("Vui lòng tạo ít nhất một album khác để di chuyển.");
            return;
        }
    }

    modal?.showModal();
}

export function confirmMoveWords() {
    const targetId = document.getElementById("targetAlbumSelect")?.value;
    if (!targetId || !currentViewAlbumId) return;

    const albums = getAlbums();
    const sourceAlbum = albums.find(a => a.id == currentViewAlbumId);
    const targetAlbum = albums.find(a => a.id == targetId);

    if (sourceAlbum && targetAlbum) {
        const sortedIndices = Array.from(selectedWordIndices).sort((a, b) => b - a);
        const movingWords = [];

        sortedIndices.forEach(idx => {
            movingWords.push(sourceAlbum.words.splice(idx, 1)[0]);
        });

        targetAlbum.words.unshift(...movingWords);

        saveAlbums(albums);
        selectedWordIndices.clear();
        updateBulkActionsBar();
        renderWordListOnly();
        renderSideAlbumList();
        document.getElementById("moveWordsModal")?.close();
    }
}

export function renderWordListOnly() {
    if (!currentViewAlbumId) return;

    const albums = getAlbums();
    const album = albums.find(a => a.id == currentViewAlbumId);
    const list = document.getElementById("wordListInAlbum");
    const isHidden = document.getElementById("hideMeaningToggle")?.checked;

    if (list && album) {
        const hasWords = album.words.length > 0;

        // Cập nhật hiển thị các nút chức năng
        const clearAllBtn = document.getElementById("clearAllWordsBtn");
        const albumActions = document.getElementById("albumActions");
        const wordSortControl = document.getElementById("wordSortControl");
        const studyMode = document.getElementById("studyModeControl");

        if (clearAllBtn) clearAllBtn.classList.toggle("hidden", !hasWords);
        if (albumActions) albumActions.classList.toggle("hidden", !hasWords);
        if (wordSortControl) wordSortControl.classList.toggle("hidden", !hasWords);
        if (studyMode) studyMode.classList.toggle("hidden", !hasWords);

        if (!hasWords) {
            list.innerHTML = `
                <div class="flex flex-col items-center justify-center py-20 opacity-30 grayscale gap-4">
                     <svg xmlns="http://www.w3.org/2000/svg" class="h-16 w-16" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                    </svg>
                    <p class="italic">Chưa có từ vựng nào trong album này.</p>
                </div>`;
        } else {
            // Sắp xếp danh sách từ vựng theo lựa chọn
            let displayWords = [...album.words];
            if (wordSortType === 'oldest') {
                displayWords.reverse(); // Đảo ngược vì unshift luôn đưa cái mới nhất lên đầu
            }

            list.innerHTML = displayWords.map((w, idx) => {
                const wordObj = typeof w === 'string' ? { word: w, type: "", phonetic: "", meaning: "" } : w;
                const { word, type, phonetic, meaning } = wordObj;

                return `
                <div class="flex items-center gap-4 p-4 bg-base-200/40 rounded-2xl hover:bg-base-200 transition-all border border-base-300/30 group animate-in slide-in-from-right-2 duration-300 ${selectedWordIndices.has(idx) ? 'ring-2 ring-primary bg-primary/5' : ''}" style="animation-delay: ${idx * 50}ms">
                    ${isSelectionMode ? `
                        <div class="shrink-0 flex items-center">
                            <input type="checkbox" class="checkbox checkbox-primary checkbox-sm rounded-lg" ${selectedWordIndices.has(idx) ? 'checked' : ''} onchange="window.handleWordSelect(${idx})" />
                        </div>
                    ` : ''}
                    <div class="flex items-center justify-between w-full">
                        <div class="flex flex-col gap-1 w-full shrink pr-10">
                            <div class="flex items-center gap-1">
                                <div class="flex items-baseline gap-2 flex-wrap">
                                    <span class="font-bold text-xl tracking-tight text-primary">${word}</span>
                                    ${type ? `<span class="text-sm italic opacity-60">(${type})</span>` : ''}
                                    ${phonetic ? `<span class="text-sm text-base-content/70 ${isHidden ? 'hidden' : ''}">${phonetic}</span>` : ''}
                                </div>
                                ${meaning ? `
                                <div class="text-base font-medium ${isHidden ? 'cursor-pointer' : ''}" 
                                    onclick="${isHidden ? 'const t=this.querySelector(\'.meaning-text\'); if(t.classList.contains(\'hidden\')){t.classList.remove(\'hidden\'); this.querySelector(\'.click-hint\')?.classList.add(\'hidden\'); this.previousElementSibling.querySelector(\'.phonetic-text\')?.classList.remove(\'hidden\');}' : ''}">
                                    <div class="meaning-text ${isHidden ? 'hidden' : ''} animate-in fade-in duration-300">
                                        <span class="opacity-40 font-black mr-2">:</span> ${meaning}
                                    </div>
                                </div>` : ''}
                            </div>
                        </div>
                        <div class="flex items-center gap-1 shrink-0">
                            <!-- Desktop Buttons -->
                            <div class="hidden lg:flex items-center gap-1">
                                <button onclick="window.speakWord('${word.replace(/'/g, "\\'")}')" class="btn btn-ghost btn-circle btn-sm opacity-0 group-hover:opacity-100 transition-all font-medium" title="Nghe phát âm">
                                    <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15.536 8.464a5 5 0 010 7.072m2.828-9.9a9 9 0 010 12.728M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" /></svg>
                                </button>
                                <button onclick="window.openEditWordModal('${word.replace(/'/g, "\\'")}', '${type.replace(/'/g, "\\'")}', '${phonetic.replace(/'/g, "\\'")}', '${meaning.replace(/'/g, "\\'")}')" class="btn btn-ghost btn-circle btn-sm opacity-0 group-hover:opacity-100 transition-all text-secondary" title="Sửa từ vựng">
                                    <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
                                </button>
                                <button onclick="window.removeWordFromAlbum(${currentViewAlbumId}, '${word.replace(/'/g, "\\'")}')" class="btn btn-ghost btn-circle btn-sm text-error opacity-0 group-hover:opacity-100 transition-all" title="Xóa từ vựng">
                                    <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                                </button>
                            </div>

                            <!-- Mobile Dropdown -->
                            <div class="flex lg:hidden items-center gap-1">
                                <button onclick="window.speakWord('${word.replace(/'/g, "\\'")}')" class="btn btn-ghost btn-circle btn-sm" title="Nghe phát âm">
                                    <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15.536 8.464a5 5 0 010 7.072m2.828-9.9a9 9 0 010 12.728M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" /></svg>
                                </button>
                                <div class="dropdown dropdown-end">
                                    <div tabindex="0" role="button" class="btn btn-ghost btn-circle btn-sm">
                                        <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z" /></svg>
                                    </div>
                                    <ul tabindex="0" class="dropdown-content z-[1] menu p-2 shadow bg-base-100 rounded-box w-32 border border-base-300">
                                        <li><a onclick="window.openEditWordModal('${word.replace(/'/g, "\\'")}', '${type.replace(/'/g, "\\'")}', '${phonetic.replace(/'/g, "\\'")}', '${meaning.replace(/'/g, "\\'")}')" class="flex items-center gap-2"><svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg> Sửa</a></li>
                                        <li><a onclick="window.removeWordFromAlbum(${currentViewAlbumId}, '${word.replace(/'/g, "\\'")}')" class="flex items-center gap-2 text-error"><svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg> Xóa</a></li>
                                    </ul>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>`;

            }).join("");
        }
    }
}

export function speakWord(text) {
    const msg = new SpeechSynthesisUtterance();
    msg.text = text;
    msg.lang = 'en-US';
    window.speechSynthesis.speak(msg);
}

export function openEditWordModal(word, type, phonetic, meaning) {
    const modal = document.getElementById("editWordModal");
    const wordInput = document.getElementById("editWordInput");
    const typeInput = document.getElementById("editWordTypeInput");
    const phoneticInput = document.getElementById("editWordPhoneticInput");
    const meaningInput = document.getElementById("editWordMeaningInput");
    const originalWordInput = document.getElementById("editOriginalWord");

    if (wordInput) wordInput.value = word;
    if (typeInput) typeInput.value = type;
    if (phoneticInput) phoneticInput.value = phonetic;
    if (meaningInput) meaningInput.value = meaning;
    if (originalWordInput) originalWordInput.value = word;

    if (modal) modal.showModal();
}

export function saveEditedWord() {
    const wordInput = document.getElementById("editWordInput");
    const typeInput = document.getElementById("editWordTypeInput");
    const phoneticInput = document.getElementById("editWordPhoneticInput");
    const meaningInput = document.getElementById("editWordMeaningInput");
    const originalWord = document.getElementById("editOriginalWord")?.value;

    if (!wordInput || !originalWord || !currentViewAlbumId) return;

    const albums = getAlbums();
    const album = albums.find(a => a.id == currentViewAlbumId);
    if (album) {
        const wordIdx = album.words.findIndex(w => (typeof w === 'string' ? w : w.word) === originalWord);
        if (wordIdx !== -1) {
            album.words[wordIdx] = {
                word: wordInput.value.trim(),
                type: typeInput ? typeInput.value.trim() : "",
                phonetic: phoneticInput ? phoneticInput.value.trim() : "",
                meaning: meaningInput ? meaningInput.value.trim() : ""
            };
            saveAlbums(albums);
            renderWordListOnly();
        }
    }

    document.getElementById("editWordModal")?.close();
}


let wordSortType = 'newest';

export function setWordSortType(type) {
    wordSortType = type;
    renderWordListOnly();
}

export function removeWordFromAlbum(albumId, word) {
    const albums = getAlbums();
    const album = albums.find(a => a.id == albumId);
    if (album) {
        album.words = album.words.filter(w => (typeof w === 'string' ? w : w.word) !== word);
        saveAlbums(albums);
        renderWordListOnly();
    }
}

export function deleteCurrentAlbum() {
    if (!confirm("Bạn có chắc chắn muốn xóa toàn bộ album này?")) return;
    const albums = getAlbums();
    const filtered = albums.filter(a => a.id != currentViewAlbumId);
    saveAlbums(filtered);
    currentViewAlbumId = null;
    const title = document.getElementById("currentAlbumTitle");
    const list = document.getElementById("wordListInAlbum");
    const wordSortControl = document.getElementById("wordSortControl");
    const studyMode = document.getElementById("studyModeControl");

    if (title) title.innerText = "Chọn một Album";
    if (list) list.innerHTML = `<div class="text-center py-20 opacity-20 italic">Chọn album ở cột bên trái để xem từ vựng</div>`;
    if (wordSortControl) wordSortControl.classList.add("hidden");
    if (studyMode) studyMode.classList.add("hidden");
    renderSideAlbumList();
}

// Lắng nghe sự kiện bôi đen
document.addEventListener("mouseup", handleTextSelection);
document.addEventListener("mousedown", (e) => {
    const popup = document.getElementById("selectionPopup");
    // Nếu click ra ngoài popup và không phải đang bôi đen mới thì ẩn popup
    if (popup && !popup.contains(e.target) && !window.getSelection().toString().trim()) {
        popup.classList.add("hidden");
    }
});

// Gắn các hàm vào window để gọi từ HTML
window.openAddToAlbumModal = openAddToAlbumModal;
window.createNewAlbum = createNewAlbum;
window.saveWordToAlbum = saveWordToAlbum;
window.openWordListModal = openWordListModal;
window.viewAlbum = viewAlbum;
window.removeWordFromAlbum = removeWordFromAlbum;
window.deleteCurrentAlbum = deleteCurrentAlbum;
window.speakWord = speakWord;
window.openEditWordModal = openEditWordModal;
window.saveEditedWord = saveEditedWord;
window.confirmSaveDuplicate = confirmSaveDuplicate;
window.toggleSelectionMode = toggleSelectionMode;
window.handleWordSelect = handleWordSelect;
window.selectAllWords = selectAllWords;
window.confirmClearAllWords = confirmClearAllWords;
window.confirmDeleteSelected = confirmDeleteSelected;
window.openMoveWordsModal = openMoveWordsModal;
window.confirmMoveWords = confirmMoveWords;




// Album Management
window.showCreateAlbumInput = showCreateAlbumInput;
window.createAlbumFromSidebar = createAlbumFromSidebar;
window.deleteAlbumById = deleteAlbumById;
window.renderSideAlbumList = renderSideAlbumList;
window.renderWordListOnly = renderWordListOnly;
window.setWordSortType = setWordSortType;

window.toggleWordListSidebar = function () {
    const sidebar = document.getElementById("wordListSidebar");
    const backdrop = document.getElementById("sidebarBackdrop");
    if (!sidebar) return;

    const isOpen = sidebar.classList.contains("translate-x-0");

    if (!isOpen) {
        // Mở ra
        sidebar.classList.remove("-translate-x-full", "opacity-0");
        sidebar.classList.add("translate-x-0", "opacity-100");
        if (backdrop) {
            backdrop.classList.remove("hidden");
            setTimeout(() => backdrop.classList.add("opacity-100"), 10);
        }
    } else {
        // Thu lại
        sidebar.classList.remove("translate-x-0", "opacity-100");
        sidebar.classList.add("-translate-x-full", "opacity-0");
        if (backdrop) {
            backdrop.classList.remove("opacity-100");
            setTimeout(() => backdrop.classList.add("hidden"), 300);
        }
    }
};

initWordList();

// Lắng nghe thay đổi trong bài tập để cập nhật trạng thái nút Reset
const exContainer = document.getElementById("exerciseContainer");
if (exContainer) {
    exContainer.addEventListener("input", updateButtonStates);
    exContainer.addEventListener("change", updateButtonStates);
}
