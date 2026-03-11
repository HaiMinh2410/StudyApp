/* =========================
   GENERATE EXERCISE LOGIC
========================= */

// Global State
let questions = [];
let userAnswers = {};
let isReviewMode = false;
let currentTitle = "No Title";
let currentWrongIdx = -1;

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
export function normalizeAnswer(text) {
    if (!text) return "";
    return text.toLowerCase()
        .replace(/[‘’'ʼ`]/g, "'")           // Chuẩn hóa các loại dấu nháy
        .replace(/\s*([\/\\|])\s*/g, "$1")  // Xóa khoảng trắng quanh dấu gạch chéo, gạch đứng
        .replace(/n't\b/g, " not")          // Mở rộng các dạng viết tắt phổ biến
        .replace(/'s\b/g, " is")
        .replace(/'ve\b/g, " have")
        .replace(/'re\b/g, " are")
        .replace(/'ll\b/g, " will")
        .replace(/'d\b/g, " would")
        .replace(/\s+/g, " ")               // Chuẩn hóa khoảng trắng dư thừa
        .trim();
}

/* =========================
   GENERATE EXERCISE
========================= */
export function generateExercise() {
    isReviewMode = false;
    userAnswers = {};
    if (typeof window.resetTimer === "function") window.resetTimer();

    const rawInput = document.getElementById("inputData").value;
    const rawLines = rawInput.split("\n").map(l => l.trim()).filter(l => l);

    // 1. Quét tìm tiêu đề có từ khóa (Header, Title, Tiêu đề, Chủ đề, v.v.)
    let explicitTitle = "";
    for (const line of rawLines) {
        const titleMatch = line.match(/^(header|tiêu\s+đề|title|chủ\s+đề|subject|topic):\s*(.*)/i);
        if (titleMatch && titleMatch[2].trim()) {
            explicitTitle = titleMatch[2].trim();
            break;
        }
        // Dừng tìm kiếm nếu đã bắt đầu vào câu hỏi hoặc section để tránh nhầm
        if (line.match(/^(exercise|bài|test|phần|đề|câu|section|part)[\s_]*\d+/i) || line.match(/^(?:(?:câu|bài)[\s_]*)?(\d+)(?:[\.\):])/i)) break;
    }

    if (explicitTitle) {
        currentTitle = explicitTitle;
    } else {
        // Fallback: Lấy dòng đầu tiên nếu không phải là câu hỏi/section
        const firstNonEmpty = rawLines[0] || "";
        const isSectionOrQuestion = firstNonEmpty.match(/^(exercise|bài(?:\s+(?:luyện\s+tập|tập))?|test|phần|đề|câu|section|part)[\s_]*\d+/i) ||
            firstNonEmpty.match(/^(?:(?:câu|bài)[\s_]*)?(\d+)(?:[\.\):])/i);
        currentTitle = isSectionOrQuestion ? "No Title" : (firstNonEmpty || "No Title");
    }

    const raw = cleanText(rawInput);
    const lines = raw.split("\n").map(l => l.trim()).filter(l => l);

    questions = [];
    let answerSection = false;
    let currentQuestion = null;
    let currentAnswerNumber = null;
    let isAutoIncrementMode = true;

    let currentSection = null;
    let currentSectionInAnswers = null;
    let questionCounterInSection = 1;
    let answerCounterInSection = 1;

    lines.forEach((line, index) => {
        // --- 0. Skip Title/Header/Intro lines ---
        const isHeaderOrIntro = line.match(/^(header|tiêu\s+đề|title|chủ\s+đề|subject|topic|head|instruction|hướng\s+dẫn|note|lưu\s+ý|yêu\s+cầu):\s*(.*)/i) ||
            (/^(choose|hãy|chọn|điền|hoàn\s+thành|complete|questions?\s*\(?\d+)/i.test(line) && line.length < 120 && !line.includes("___"));

        if (isHeaderOrIntro && questions.length === 0 && !answerSection) {
            return;
        }

        // --- 1. Inline Answer / Explanation ---
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

        // --- 2. Answer Key Header ---
        const answerKeyMatch = line.match(/^(ANSWER KEY|ĐÁP ÁN|LỜI GIẢI|HƯỚNG DẪN GIẢI|DETAILED EXPLANATIONS|PHÂN TÍCH BẪY|EXPLANATIONS?|ANSWER & KEY|HƯỚNG DẪN CHI TIẾT)(\s*:)?$/i) ||
            (line.match(/^(ANSWER KEY|ĐÁP ÁN|LỜI GIẢI|HƯỚNG DẪN GIẢI|DETAILED EXPLANATIONS|PHÂN TÍCH BẪY)/i) && !line.match(/^(đáp án|answer):\s*[A-D]/i)) ||
            ((line.match(/ANSWER KEY|ĐÁP ÁN|LỜI GIẢI|ANSWER & EXPLANATION/i) || (line.match(/ANSWER/i) && line.match(/KEY/i))) && !line.match(/chọn|khoanh|hãy/i) && line.length < 120);

        if (answerKeyMatch) {
            answerSection = true;
            isAutoIncrementMode = true;
            currentAnswerNumber = null; // Reset để không bám vào câu cuối của section trước
            const subSectionMatch = line.match(/(exercise|bài(?:\s+(?:luyện\s+tập|tập))?|test|phần|đề|câu|section|part)[\s_]*\d+/i);
            currentSectionInAnswers = subSectionMatch ? subSectionMatch[0].toLowerCase() : null;
            answerCounterInSection = 1;
            return;
        }

        // --- 3. Section Header (QUAN TRỌNG: Check thoát hoặc chuyển section đáp án) ---
        const sectionMatch = line.match(/^(exercise|bài(?:\s+(?:luyện\s+tập|tập))?|test|phần|đề|câu|section|part)[\s_]*\d+/i);
        if (sectionMatch && line.length < 100) {
            if (answerSection) {
                // Heuristic: Nếu tiêu đề này đã xuất hiện trong danh sách câu hỏi, nó là sub-header của đáp án
                const lowerLine = line.trim().toLowerCase();
                const exists = questions.some(q => {
                    const sec = q.section ? q.section.toLowerCase() : "";
                    return sec.includes(lowerLine) || lowerLine.includes(sec);
                });
                if (exists) {
                    currentSectionInAnswers = sectionMatch[0].toLowerCase();
                    answerCounterInSection = 1;
                    isAutoIncrementMode = true;
                    currentAnswerNumber = null; // Reset khi vào section đáp án mới
                    return;
                }
            }
            currentSection = line.trim();
            questionCounterInSection = 1;
            currentQuestion = null;
            answerSection = false; // Force exit answer mode
            currentAnswerNumber = null;
            return;
        }

        // --- 4. Parse Answer Section ---
        if (answerSection) {
            const internalSectionMatch = line.match(/^(exercise|bài(?:\s+(?:luyện\s+tập|tập))?|test|phần|đề|câu|section|part)[\s_]*\d+/i);
            if (internalSectionMatch && line.length < 120) {
                currentSectionInAnswers = internalSectionMatch[0].toLowerCase();
                answerCounterInSection = 1;
                isAutoIncrementMode = true;
                currentAnswerNumber = null; // Reset
                return;
            }

            // Patterns: 
            // 1. "1. A - text" or "1. A" or "1. is working" -> qNumMatch
            // 2. "A - text" (sequence based) -> ansLetterOnlyMatch
            let qNumMatch = line.match(/^(\d+)[\.\)]\s*(.*)/);
            let ansLetterOnlyMatch = line.match(/^([A-D])\s*[-–—:]\s*(.*)/i);

            // Nhận diện giải thích thông minh và chính xác hơn
            const explanationKeywords = [
                "giải thích", "explanation", "dấu hiệu", "vì", "do", "tại", "bởi vì", "because", "since", "as",
                "cấu trúc", "thì", "tense", "ngữ cảnh", "context", "hành động", "thời điểm", "trải nghiệm",
                "thói quen", "vừa mới", "kết quả", "trạng thái", "lưu ý", "quy tắc", "mốc thời gian", "cụ thể", "bẫy", "trap"
            ];

            // Sử dụng word boundary \b cho các từ ngắn để tránh khớp nhầm (vd: "has" chứa "as")
            const expRegex = new RegExp('\\b(' + explanationKeywords.join('|') + ')\\b', 'i');

            const isExpPrefix = line.match(/^(giải thích|explanation|dấu hiệu|note|lưu ý|→|=>|->|vì|bởi|do|tại|since|because|bẫy|trap)/i);
            const hasExpSymbol = line.includes("→") || line.includes("=>") || line.includes("->") || line.includes("=") || (line.includes(":") && line.length > 30);
            const containsGrammarTerm = expRegex.test(line) || / (dùng|chia|thì|cấu trúc|loại|dạng) /i.test(line) || line.includes("“");

            // Một dòng là giải thích nếu có prefix, có ký hiệu, hoặc chứa từ khóa ngữ pháp và đủ dài
            const isExplanation = isExpPrefix || hasExpSymbol || (containsGrammarTerm && line.length > 25) || line.length > 100 || line.startsWith("(");

            if (qNumMatch || ansLetterOnlyMatch) {
                isAutoIncrementMode = false;
                let qNum, remainder, letter = null;

                if (qNumMatch) {
                    qNum = parseInt(qNumMatch[1]);
                    remainder = qNumMatch[2].trim();
                } else {
                    qNum = answerCounterInSection++;
                    letter = ansLetterOnlyMatch[1].toUpperCase();
                    remainder = ansLetterOnlyMatch[2].trim();
                }

                currentAnswerNumber = qNum;
                let q = findQuestionByNumber(qNum, currentSectionInAnswers);

                if (q) {
                    if (letter) {
                        q.answer = letter;
                        if (remainder) q.explanation = (q.explanation ? q.explanation + "<br>" : "") + remainder;
                    } else if (q.type === 'mcq') {
                        let mcqMatch = remainder.match(/^([A-D])(?:[\s-–—:\.](.*))?$/i);
                        if (mcqMatch) {
                            q.answer = mcqMatch[1].toUpperCase();
                            if (mcqMatch[2]) q.explanation = (q.explanation ? q.explanation + "<br>" : "") + mcqMatch[2].trim();
                        } else {
                            if (/^[A-D]$/i.test(remainder.charAt(0)) && (remainder.length === 1 || !/^\w/.test(remainder.charAt(1)))) {
                                q.answer = remainder.charAt(0).toUpperCase();
                                if (remainder.length > 2) q.explanation = (q.explanation ? q.explanation + "<br>" : "") + remainder.substring(1).trim();
                            } else {
                                q.answer = remainder;
                            }
                        }
                    } else {
                        q.answer = remainder;
                    }
                }
                return;
            } else if (line.trim().length > 0) {
                // Kiểm tra xem dòng này có nhắc đến số câu cụ thể không (vd: "Giải thích câu 5")
                let embeddedNumMatch = line.match(/(?:câu|question|q|số)\s*(\d+)/i);
                if (embeddedNumMatch) {
                    currentAnswerNumber = parseInt(embeddedNumMatch[1]);
                }

                let q = findQuestionByNumber(currentAnswerNumber, currentSectionInAnswers);

                if (q && !q.answer && !isExplanation) {
                    // Nếu câu hiện tại chưa có đáp án và dòng này không phải giải thích -> Đây là đáp án
                    q.answer = line.trim();
                } else if (isAutoIncrementMode && !isExplanation) {
                    // Nếu đang ở chế độ Auto Increment (danh sách đáp án không số)
                    let nextQ = questions.find(x => !x.answer && (currentSectionInAnswers ? (x.section || "").toLowerCase().includes(currentSectionInAnswers) : true));
                    if (nextQ) {
                        nextQ.answer = line.trim();
                        currentAnswerNumber = nextQ.number;
                    }
                } else if (currentAnswerNumber) {
                    // Mặc định: Dồn vào giải thích của câu đang xử lý
                    let targetQ = findQuestionByNumber(currentAnswerNumber, currentSectionInAnswers);
                    if (targetQ) targetQ.explanation += (targetQ.explanation ? "<br>" : "") + line;
                }
            }
            return;
        }

        function findQuestionByNumber(num, section) {
            let q = questions.find(x => {
                if (x.number !== num) return false;
                if (!section) return true;
                const sec = (x.section || "").toLowerCase();
                const ansSec = section.toLowerCase();
                if (sec.includes(ansSec) || ansSec.includes(sec)) return true;
                const n1 = sec.match(/\d+/);
                const n2 = ansSec.match(/\d+/);
                return n1 && n2 && n1[0] === n2[0];
            });
            if (!q) q = questions.find(x => x.number === num && !x.answer);
            if (!q) q = questions.find(x => x.number === num);
            return q;
        }


        // --- 5. Numbered Question ---
        let qNumMatch = line.match(/^(?:(?:câu|bài)[\s_]*)?(\d+)(?:[\.\):])\s*(.*)/i);
        if (qNumMatch) {
            let num = parseInt(qNumMatch[1]);
            let content = qNumMatch[2];
            // Tránh nhận diện nhầm các dòng chỉ dẫn là câu hỏi
            if (content.length < 3 && !line.includes("___")) return;

            let existingIdx = questions.findIndex(x => x.number === num && x.section === currentSection);
            if (existingIdx !== -1 && !answerSection) {
                // Nếu câu hỏi cũ không có text thật sự (chỉ là title/instruction bị bắt nhầm) hoặc không có options, ta cho phép ghi đè
                if (questions[existingIdx].options.length === 0 && !questions[existingIdx].text.includes("___")) {
                    questions.splice(existingIdx, 1);
                } else {
                    return;
                }
            }

            questionCounterInSection = num + 1;
            currentQuestion = {
                id: questions.length, number: num, section: currentSection,
                text: content, options: [], answer: null, explanation: "",
                type: 'mcq', isCapturingExplanation: false
            };
            if (content.includes("___") || (content.includes("(") && content.includes(")"))) currentQuestion.type = 'fitb';
            questions.push(currentQuestion);
            return;
        }

        // --- 6. Multiple Choice Option ---
        if (/^[A-D][\.\)-]\s*/.test(line)) {
            if (currentQuestion) {
                currentQuestion.options.push(line);
                currentQuestion.type = 'mcq';
            }
            return;
        }

        // --- 7. Explanation Arrow ---
        if (line.startsWith("→") && currentQuestion) {
            currentQuestion.explanation = (currentQuestion.explanation ? currentQuestion.explanation + "<br>" : "") + line.substring(1).trim();
            return;
        }

        // --- 8. Unnumbered Question or Continued Text ---
        if (!answerSection) {
            // Nhận diện khoảng trống (blank) linh hoạt hơn: gạch dưới hoặc dấu chấm
            const hasBlank = /__+|\.{3,}/.test(line) || (line.includes(" (") && line.includes(")"));
            const isOption = /^[A-D][\.\)-]\s*/.test(line); // Thường đã được Block 6 xử lý

            // Kiểm tra dòng tiếp theo để nhận diện câu hỏi trắc nghiệm không số
            const nextLine = lines[index + 1] || "";
            const isNextOption = /^[A-D][\.\)-]\s*/.test(nextLine);

            // Một câu hỏi mới nếu dòng có blank hoặc là đoạn dẫn cho một danh sách lựa chọn
            const shouldStartNew = !currentQuestion ||
                (currentQuestion.options.length > 0 && !isOption) ||
                (currentQuestion.type === 'fitb' && hasBlank);

            // Chỉ bắt đầu câu hỏi mới nếu dòng này trông thực sự giống câu hỏi (có blank hoặc theo sau là option)
            // và KHÔNG phải là một tiêu đề hướng dẫn (ví dụ: "Questions (1-20)")
            const isLabel = /^(questions?|câu\s+hỏi|bài\s+tập|đề\s+bài|phần|part|section|exercise|bài|test|instruction|hướng\s+dẫn)/i.test(line) && line.length < 100 && !line.includes("___");
            const looksLikeQuestion = (hasBlank || isNextOption) && !isLabel;

            if (shouldStartNew && !isOption && looksLikeQuestion) {
                currentQuestion = {
                    id: questions.length, number: questionCounterInSection++, section: currentSection,
                    text: line, options: [], answer: null, explanation: "",
                    type: hasBlank ? 'fitb' : 'mcq', isCapturingExplanation: false
                };
                questions.push(currentQuestion);
            } else if (currentQuestion) {
                if (isOption) {
                    currentQuestion.options.push(line);
                    currentQuestion.type = 'mcq';
                } else {
                    // Nếu không phải bắt đầu câu hỏi mới và cũng không phải option, 
                    // ta coi đây là văn bản tiếp nối của câu hỏi hiện tại
                    currentQuestion.text = (currentQuestion.text ? currentQuestion.text + " " : "") + line;
                    if (hasBlank) currentQuestion.type = 'fitb';
                }
            }
        }
    });

    // --- Post-processing: Match Free-text Answers ---
    // Duyệt lại các dòng một lần nữa để tìm đáp án cho FITB nếu mục Answer Key chưa khớp hết
    lines.forEach(line => {
        if (!line.includes("ANSWER KEY") && !line.match(/ĐÁP ÁN|LỜI GIẢI/i)) return; // Chỉ tìm sau khi có header đáp án
    });
    // (Logic này đã được tích hợp vào bước xử lý line phía trên, 
    // nhưng ta cần thêm một fallback cho các đáp án không số trong FITB)

    // Cập nhật lại logic tìm đáp án trong loop chính để xử lý case "không số, không chữ"
    // (Tôi sẽ sửa trực tiếp trong ReplacementChunk phía trên để tối ưu)


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

    // Xử lý hiển thị button Next/Prev Wrong
    const navigationWrongBtns = document.querySelectorAll("#nextWrongBottomBtn, #nextWrongDesktopBtn, #prevWrongBottomBtn, #prevWrongDesktopBtn");
    let hasWrong = false;
    if (isReviewMode) {
        hasWrong = questions.some(q => {
            const user = userAnswers[q.id];
            return q.type === 'fitb'
                ? !q.answer.split('/').some(a => normalizeAnswer(a) === normalizeAnswer(user))
                : user !== q.answer;
        });
    }

    navigationWrongBtns.forEach(btn => {
        if (isReviewMode && hasWrong) {
            btn.classList.remove("hidden");
        } else {
            btn.classList.add("hidden");
        }
    });
}

export function nextWrongQuestion() {
    if (!isReviewMode) return;

    const wrongQuestions = questions.filter(q => {
        const user = userAnswers[q.id];
        const isCorrect = q.type === 'fitb'
            ? q.answer.split('/').some(a => normalizeAnswer(a) === normalizeAnswer(user))
            : user === q.answer;
        return !isCorrect;
    });

    if (wrongQuestions.length === 0) return;

    currentWrongIdx = (currentWrongIdx + 1) % wrongQuestions.length;
    const targetQ = wrongQuestions[currentWrongIdx];
    const element = document.getElementById("q" + targetQ.id);

    if (element) {
        element.scrollIntoView({ behavior: 'smooth', block: 'center' });
        element.classList.add('ring-4', 'ring-error/30');
        setTimeout(() => element.classList.remove('ring-4', 'ring-error/30'), 2000);
    }
}

export function previousWrongQuestion() {
    if (!isReviewMode) return;

    const wrongQuestions = questions.filter(q => {
        const user = userAnswers[q.id];
        const isCorrect = q.type === 'fitb'
            ? q.answer.split('/').some(a => normalizeAnswer(a) === normalizeAnswer(user))
            : user === q.answer;
        return !isCorrect;
    });

    if (wrongQuestions.length === 0) return;

    if (currentWrongIdx <= 0) {
        currentWrongIdx = wrongQuestions.length - 1;
    } else {
        currentWrongIdx--;
    }
    
    const targetQ = wrongQuestions[currentWrongIdx];
    const element = document.getElementById("q" + targetQ.id);

    if (element) {
        element.scrollIntoView({ behavior: 'smooth', block: 'center' });
        element.classList.add('ring-4', 'ring-error/30');
        setTimeout(() => element.classList.remove('ring-4', 'ring-error/30'), 2000);
    }
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
            sectionHeader.className = "col-span-full mt-4 md:mt-6 mb-2";
            sectionHeader.innerHTML = `
                <div class="flex items-center gap-4">
                    <h2 class="text-lg md:text-2xl font-black text-primary uppercase tracking-wider">${q.section}</h2>
                    <div class="h-px bg-primary/20 flex-1"></div>
                </div>
            `;
            container.appendChild(sectionHeader);
            lastSection = q.section;
        }

        const div = document.createElement("div");
        div.className = "card bg-base-100 border border-base-300 overflow-hidden duration-300 transition-all";
        div.id = "q" + q.id;

        let bodyHtml = "";
        if (q.type === 'fitb') {
            bodyHtml = `
            <div class="form-control w-full mt-4">
                <input type="text" placeholder="Answer ..." 
                    class="input input-bordered input-primary w-full max-w-md font-medium shadow-inner"
                    name="q${q.id}" autocomplete="off">
            </div>`;
        } else {
            bodyHtml = `<div class="space-y-2 mt-0 md:mt-4">` + q.options.map(opt => {
                const letter = opt.charAt(0);
                return `
                <label class="form-control flex flex-row items-center gap-3 p-3 hover:bg-base-200 cursor-pointer rounded-lg transition-all border border-transparent">
                    <input type="radio" name="q${q.id}" value="${letter}" class="radio radio-primary radio-sm">
                    <span class="label-text flex-1">${opt}</span>
                </label>`;
            }).join("") + `</div>`;
        }

        div.innerHTML = `
            <div class="card-body p-4 md:p-6">
                <h3 class="flex items-start gap-2 mb-2">
                    <span class="text-primary px-0 font-bold text-lg shrink-0">${q.number + `.`}</span>
                    <span class="font-semibold sm:font-bold text-lg leading-relaxed text-base-content">${q.text}</span>
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
    if (typeof window.pauseTimer === "function") window.pauseTimer();
    let correct = 0;
    if (!review) userAnswers = {};

    let firstWrongId = null;
    currentWrongIdx = -1; // Reset index câu sai khi nộp bài mới

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

        const normUser = normalizeAnswer(user);
        const isCorrect = q.type === 'fitb'
            ? (normalizeAnswer(q.answer) === normUser || q.answer.split('/').some(a => normalizeAnswer(a) === normUser))
            : user === q.answer;

        if (isCorrect) {
            div.classList.add("border-success", "bg-success/5");
            exp.classList.add("bg-success/20", "border-success");
            correct++;
        } else {
            div.classList.add("border-error", "bg-error/5");
            exp.classList.add("bg-error/20", "border-error");
            if (firstWrongId === null) firstWrongId = "q" + q.id;
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
                     <i data-lucide="info" class="h-4 w-4 mt-0.5 opacity-50"></i>
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

        // Show Result Modal
        showResultModal(correct, questions.length, firstWrongId);
    }
    if (window.lucide) window.lucide.createIcons();
}

function showResultModal(correct, total, firstWrongId) {
    const modal = document.getElementById('resultModal');
    const title = document.getElementById('resultTitle');
    const message = document.getElementById('resultMessage');
    const iconContainer = document.getElementById('resultIcon');

    if (!modal || !title || !message) return;

    const percent = Math.round((correct / total) * 100);
    const isSuccess = percent >= 80;

    title.innerText = isSuccess ? "Chúc mừng!" : "Cần cố gắng!";
    title.className = `font-black text-3xl mb-2 ${isSuccess ? 'text-success' : 'text-warning'}`;
    message.innerHTML = `Bạn đã hoàn thành bài tập với kết quả:<br><span class="text-2xl font-bold">${correct}/${total} câu (${percent}%)</span>`;

    if (iconContainer) {
        iconContainer.innerHTML = isSuccess
            ? `<div class="w-20 h-20 bg-success/10 text-success rounded-full flex items-center justify-center mx-auto mb-4 animate-bounce">
                <i data-lucide="check" class="h-12 w-12" style="stroke-width: 3"></i>
               </div>`
            : `<div class="w-20 h-20 bg-warning/10 text-warning rounded-full flex items-center justify-center mx-auto mb-4">
                <i data-lucide="alert-triangle" class="h-12 w-12" style="stroke-width: 2"></i>
               </div>`;
    }

    if (window.lucide) window.lucide.createIcons();

    // Attach firstWrongId to window for confirmResult
    window.__lastFirstWrongId = firstWrongId;
    modal.showModal();
}

export function confirmResult() {
    const modal = document.getElementById('resultModal');
    if (modal) modal.close();

    if (window.__lastFirstWrongId) {
        const element = document.getElementById(window.__lastFirstWrongId);
        if (element) {
            element.scrollIntoView({ behavior: 'smooth', block: 'center' });
            element.classList.add('ring-4', 'ring-error/30');
            setTimeout(() => element.classList.remove('ring-4', 'ring-error/30'), 3000);
        }
    }
}

/* =========================
   RESET
========================= */
export function resetExercise() {
    if (questions.length === 0) return;
    userAnswers = {};
    isReviewMode = false;
    currentWrongIdx = -1;
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
window.confirmResult = confirmResult;
window.resetExercise = resetExercise;
window.updateInputButtons = updateInputButtons;
window.updateButtonStates = updateButtonStates;
window.renderExercise = renderExercise;
window.nextWrongQuestion = nextWrongQuestion;
window.previousWrongQuestion = previousWrongQuestion;
