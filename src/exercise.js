/* =========================
   GENERATE EXERCISE LOGIC
========================= */

// Global State
let questions = [];
let userAnswers = {};
let isReviewMode = false;
let currentTitle = "No Title";

export function getExerciseState() {
    return { questions, userAnswers, isReviewMode };
}

export function setExerciseState(newQuestions, newAnswers, reviewMode) {
    questions = newQuestions || [];
    userAnswers = newAnswers || {};
    isReviewMode = reviewMode || false;
}

/* =========================
   CLEAN TEXT (PDF SAFE)
========================= */
export function cleanText(text) {
    return text
        .replace(/\r/g, "")
        .replace(/⸻|—|–/g, "-")
        .replace(/[ \t]+/g, " ")
        .replace(/\n{2,}/g, "\n")
        .trim();
}

export function extractFitbAnswer(qText, aText) {
    let blankMatch = qText.match(/_+(\s*\(.*?\))?/);
    if (!blankMatch) return aText.trim();

    let blankStr = blankMatch[0];
    let parts = qText.split(blankStr);
    let prefix = parts[0].trim();
    let suffix = parts[1] ? parts[1].trim() : "";

    let result = aText.trim();
    if (prefix && result.startsWith(prefix)) {
        result = result.substring(prefix.length).trim();
    }
    if (suffix && result.endsWith(suffix)) {
        result = result.substring(0, result.length - suffix.length).trim();
    }
    return result;
}

/* =========================
   GENERATE EXERCISE
========================= */
export function generateExercise() {
    isReviewMode = false;
    userAnswers = {};
    if (typeof window.resetTimer === "function") window.resetTimer();

    const rawInput = document.getElementById("inputData").value;
    const rawLines = rawInput.split("\n").map(l => l.trim());
    const firstNonEmpty = rawLines.find(l => l) || "";

    // Kiểm tra nếu dòng đầu tiên trông giống tiêu đề Section hoặc Câu hỏi
    const isSectionOrQuestion = firstNonEmpty.match(/(exercise|test|phần|đề|câu|bài)[\s_]*\d+/i) ||
        firstNonEmpty.match(/^(?:(?:câu|bài)[\s_]*)?(\d+)(?:[\.\):])/i);

    currentTitle = isSectionOrQuestion ? "No Title" : (firstNonEmpty || "No Title");

    const raw = cleanText(rawInput);
    const lines = raw.split("\n").map(l => l.trim()).filter(l => l);

    questions = [];
    let answerSection = false;
    let currentQuestion = null;
    let currentAnswerNumber = null;

    let currentSection = null;
    let currentSectionInAnswers = null;

    lines.forEach(line => {
        const inlineAnswerMatch = line.match(/^(đáp án|answer):\s*([A-D])/i);
        if (inlineAnswerMatch && currentQuestion) {
            currentQuestion.answer = inlineAnswerMatch[2].toUpperCase();
            currentQuestion.isCapturingExplanation = false;
            return;
        }

        const inlineExpMatch = line.match(/^(giải thích|explanation):/i);
        if (inlineExpMatch && currentQuestion) {
            let rest = line.substring(inlineExpMatch[0].length).trim();
            currentQuestion.explanation = (currentQuestion.explanation ? currentQuestion.explanation + "<br>" : "") + rest;
            currentQuestion.isCapturingExplanation = true;
            return;
        }

        const answerKeyMatch = line.match(/^(ANSWER KEY|ĐÁP ÁN|LỜI GIẢI|HƯỚNG DẪN GIẢI)(\s*:)?$/i) ||
            (line.match(/^(ANSWER KEY|ĐÁP ÁN|LỜI GIẢI|HƯỚNG DẪN GIẢI)/i) && !line.match(/^(đáp án|answer):\s*[A-D]/i)) ||
            (line.match(/ANSWER KEY|ĐÁP ÁN|LỜI GIẢI/i) && !line.match(/chọn|khoanh|hãy/i) && line.length < 50);

        if (answerKeyMatch) {
            answerSection = true;
            const specificSectionMatch = line.match(/(exercise|bài|test|phần|đề|câu)[\s_]*\d+/i);
            if (specificSectionMatch) {
                const snippet = specificSectionMatch[0].toLowerCase();
                currentSectionInAnswers = snippet;
            } else {
                currentSectionInAnswers = null;
            }
            return;
        }

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

        const sectionMatch = line.match(/^(exercise|test|phần|đề|câu|bài)[\s_]*\d+/i);
        if (sectionMatch) {
            currentSection = line.trim();
            answerSection = false;
            currentQuestion = null;
            return;
        }

        if (currentQuestion && /^[A-D][\.\)]\s*/.test(line)) {
            currentQuestion.options.push(line);
            currentQuestion.isCapturingExplanation = false;
            return;
        }

        if (line.startsWith("→") && currentQuestion) {
            currentQuestion.explanation = (currentQuestion.explanation ? currentQuestion.explanation + "<br>" : "") + line.substring(1).trim();
            return;
        }

        if (currentQuestion) {
            if (currentQuestion.isCapturingExplanation) {
                currentQuestion.explanation += (currentQuestion.explanation ? "<br>" : "") + line;
            } else if (currentQuestion.options.length === 0) {
                currentQuestion.text = (currentQuestion.text ? currentQuestion.text + " " : "") + line;
            }
        }
    });

    const errors = [];
    if (questions.length === 0) {
        errors.push("Không tìm thấy câu hỏi nào (Định dạng: '1. Câu hỏi').");
    }

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

    const timerToggle = document.getElementById("timerToggle");
    const timerSection = document.getElementById("timerSection");
    if (timerToggle && timerSection) {
        if (timerToggle.checked) {
            timerSection.classList.remove("hidden");
        } else {
            timerSection.classList.add("hidden");
            if (typeof window.resetTimer === "function") window.resetTimer();
        }
    }

    updateButtonStates();

    // Tự động cuộn xuống bài tập sau khi tạo
    const container = document.getElementById("exerciseContainer");
    if (container) {
        container.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
}

export function clearInput() {
    const input = document.getElementById("inputData");
    if (input) {
        input.value = "";
        hideInputError();
        updateInputButtons();
    }
}

function showInputError(errors) {
    const alertBody = document.getElementById("inputErrorAlert");
    const errorList = document.getElementById("errorList");
    if (alertBody && errorList) {
        errorList.innerHTML = errors.map(err => `<li>${err}</li>`).join("");
        alertBody.classList.remove("hidden");
        alertBody.classList.add("flex");
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

export function updateInputButtons() {
    const input = document.getElementById("inputData");
    const clearBtn = document.getElementById("clearInputBtn");
    const generateBtn = document.getElementById("generateExerciseBtn");

    if (input && clearBtn && generateBtn) {
        const hasContent = input.value.trim().length > 0;
        clearBtn.disabled = !hasContent;
        generateBtn.disabled = !hasContent;
        if (!hasContent) hideInputError();
    }
}

export function updateButtonStates() {
    const hasQ = questions.length > 0;
    const submitBtns = document.querySelectorAll("#submitBottomBtn, #desktopSubmitBtn");
    const resetBtns = document.querySelectorAll("#resetBottomBtn, #resetTopBtn, #desktopResetBtn");

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
        div.id = "q" + q.id;

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
                    <span class="label-text flex-1">${opt}</span>
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
                <div id="exp${q.id}" class="mt-6 p-4 rounded-xl hidden border-l-4 text-base-content"></div>
            </div>`;

        container.appendChild(div);
    });

    if (savedData) {
        isReviewMode = true;
        userAnswers = savedData.answers;

        questions.forEach(q => {
            const user = userAnswers[q.id];
            if (user) {
                if (q.type === 'fitb') {
                    const input = document.querySelector(`input[name="q${q.id}"]`);
                    if (input) input.value = user;
                } else {
                    const radio = document.querySelector(`input[name="q${q.id}"][value="${user}"]`);
                    if (radio) radio.checked = true;
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

        if (!review) userAnswers[q.id] = selectedValue;

        const div = document.getElementById("q" + q.id);
        const user = userAnswers[q.id];
        const exp = document.getElementById("exp" + q.id);
        if (!div || !exp) return;

        div.classList.remove("border-success", "bg-success/5", "border-error", "bg-error/5");
        exp.classList.remove("hidden", "bg-success/10", "border-success", "bg-error/10", "border-error");

        const isCorrect = q.type === 'fitb'
            ? user.toLowerCase() === q.answer.toLowerCase()
            : user === q.answer;

        if (isCorrect) {
            div.classList.add("border-success", "bg-success/5");
            exp.classList.add("bg-success/20", "border-success");
            correct++;
        } else {
            div.classList.add("border-error", "bg-error/5");
            exp.classList.add("bg-error/20", "border-error");
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

        if (q.type === 'fitb') {
            const input = div.querySelector('input[type="text"]');
            if (input) {
                input.disabled = true;
                input.classList.remove("input-primary");
                input.classList.add(isCorrect ? "input-success" : "input-error");
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
        if (typeof window.saveHistory === "function") {
            window.saveHistory(correct, questions.length, userAnswers, currentTitle);
        }
        isReviewMode = true;
        updateButtonStates();
    }
}

/* =========================
   RESET
========================= */
export function resetExercise() {
    if (questions.length === 0) return;
    userAnswers = {};
    isReviewMode = false;
    if (typeof window.resetTimer === "function") window.resetTimer();
    renderExercise();
    updateButtonStates();
    document.getElementById("exerciseContainer")?.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

// Initial Setup & Listeners
document.getElementById("inputData")?.addEventListener("input", updateInputButtons);
const exContainer = document.getElementById("exerciseContainer");
if (exContainer) {
    exContainer.addEventListener("input", updateButtonStates);
    exContainer.addEventListener("change", updateButtonStates);
}

// Window Assignments
window.generateExercise = generateExercise;
window.clearInput = clearInput;
window.submitAnswers = submitAnswers;
window.processSubmission = processSubmission;
window.resetExercise = resetExercise;
window.updateInputButtons = updateInputButtons;
window.updateButtonStates = updateButtonStates;
window.renderExercise = renderExercise;
