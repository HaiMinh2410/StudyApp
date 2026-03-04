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

        /* ===== Detect Section Header (Exercise, Bài, Test, etc.) ===== */
        // Match "Exercise 1", "exercise_1", "Bài tập 2", "Test 01", etc. but avoid matching "Answer Key"
        const sectionMatch = line.match(/^(exercise|bài|test|phần|đề|câu)[\s_]*\d+/i);
        if (sectionMatch && !/ANSWER KEY|ĐÁP ÁN|LỜI GIẢI/i.test(line)) {
            currentSection = line.trim();
            answerSection = false; // Questions follow a new section header
            return;
        }

        /* ===== Detect start of answer block ===== */
        const answerKeyMatch = line.match(/ANSWER KEY|ĐÁP ÁN|LỜI GIẢI/i);
        if (answerKeyMatch) {
            answerSection = true;
            // Check if this answer key belongs to a specific section (e.g. "Answer Key - Exercise 1")
            const specificSectionMatch = line.match(/(exercise|bài|test|phần|đề|câu)[\s_]*\d+/i);
            if (specificSectionMatch) {
                // Try to find the full section name that matches this snippet
                const snippet = specificSectionMatch[0].toLowerCase();
                // We'll use this snippet to filter questions during answer assignment
                currentSectionInAnswers = snippet;
            } else {
                currentSectionInAnswers = null; // Applies to currentSection or all
            }
            return;
        }

        /* ===== ANSWER MODE ===== */
        if (answerSection) {

            let answerStart = line.match(/^(\d+)[\.\)]\s*([A-D])/i);

            if (answerStart) {
                currentAnswerNumber = parseInt(answerStart[1]);

                // Find the question matching this number AND the current section in answers
                let q = questions.find(x => {
                    const numMatch = x.number === currentAnswerNumber;
                    if (!numMatch) return false;
                    if (!currentSectionInAnswers) return true; // If no specific section mentioned in key, match any (fallback to first found)
                    return x.section && x.section.toLowerCase().includes(currentSectionInAnswers);
                });

                // Fallback for interleaved answer keys if section detection wasn't perfect
                if (!q) q = questions.find(x => x.number === currentAnswerNumber && !x.answer);

                if (q) {
                    q.answer = answerStart[2].toUpperCase();
                    q.explanation = line.substring(answerStart[0].length).trim();
                }
                return;
            }

            /* Append explanation until next answer number */
            if (currentAnswerNumber) {
                let q = questions.find(x => x.number === currentAnswerNumber && (!currentSectionInAnswers || (x.section && x.section.toLowerCase().includes(currentSectionInAnswers))));
                if (!q) q = questions.find(x => x.number === currentAnswerNumber); // absolute fallback
                if (q) {
                    q.explanation += "<br>" + line;
                }
            }

            return;
        }

        /* ===== QUESTION (Detect Q and FITB Answers) ===== */
        let qMatch = line.match(/^(\d+)[\.\)]\s+(.*)/);
        if (qMatch) {
            let num = parseInt(qMatch[1]);
            let content = qMatch[2];

            // If we've seen this number in this specific section already, it might be a FITB answer
            // However, we only treat it as a FITB answer if we are NOT in an answer section
            let existing = questions.find(x => x.number === num && x.section === currentSection);

            if (existing && !answerSection) {
                if (existing.options.length === 0 && !existing.answer) {
                    existing.type = 'fitb';
                    existing.answer = extractFitbAnswer(existing.text, content);
                    existing.fullAnswer = content;
                }
                return;
            }

            // Normal question detection
            // BUT: If we are in an answer section, don't start a new question if it looks like an answer
            // However, qMatch is for "1. Content", while answerStart is for "1. A Content".
            // So they usually don't overlap unless the question body starts with an option letter.
            if (answerSection) {
                // Check if it's actually an answer (covered by answerStart logic above)
                // If we didn't match answerStart but matched qMatch, it might be a malformed answer or a sub-point.
                // In answerSection mode, we usually don't want to create new questions.
                return;
            }

            currentQuestion = {
                id: questions.length, // Unique internal ID
                number: num,
                section: currentSection,
                text: content,
                options: [],
                answer: null,
                explanation: "",
                type: 'mcq'
            };
            questions.push(currentQuestion);
            return;
        }

        /* ===== OPTION ===== */
        if (currentQuestion && /^[A-D][\.\)]\s*/.test(line)) {
            currentQuestion.options.push(line);
            return;
        }

        /* ===== INLINE EXPLANATION (Starting with →) ===== */
        if (line.startsWith("→") && currentQuestion) {
            currentQuestion.explanation = (currentQuestion.explanation ? currentQuestion.explanation + "<br>" : "") + line.substring(1).trim();
            return;
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
                    <span class="font-bold opacity-70">Correct:</span> 
                    <span class="font-bold text-lg">${q.answer}</span>
                </div>
                <div class="divider h-px my-1 opacity-10"></div>
                <div class="flex items-start gap-2">
                     <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4 mt-0.5 opacity-50" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <p class="text-sm leading-relaxed text-base-content font-medium italic">${q.explanation || "No explanation available."}</p>
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
