/* =========================
   PROMPT MANAGER LOGIC
========================= */

const STORAGE_KEY = "userPrompts";
let originalTitle = "";
let originalContent = "";

const DEFAULT_PROMPTS = [
    {
        id: "1-prompt",
        title: "TOEIC Generator",
        content: `Tạo 2 Exercise, mỗi bài 10 câu hỏi dạng thường gặp trong các đề thi TOEIC, độ khó tổng thể: TOEIC 600–850.
Cung cấp đáp án + giải thích chi tiết từng câu để người học có thể tự chấm và hiểu lý do.

Yêu cầu bắt buộc:

Bài tập gồm 2 phần:

- Exercise 1 – 10 câu hỏi trắc nghiệm, chọn đáp án đúng nhất (A, B, C hoặc D).
Các câu hỏi ở mức độ TOEIC phổ biến, kiểm tra đúng kiến thức ngữ pháp.

- Exercise 2 – 10 câu hỏi trắc nghiệm, chọn đáp án đúng nhất (A, B, C hoặc D).
Các câu hỏi phải là dạng khó hơn hoặc có "trap" thường gặp trong TOEIC, ví dụ:
- dễ nhầm giữa các thì
- các trường hợp ngoại lệ
- cấu trúc dễ chọn sai
- bối cảnh khiến người học dễ bị đánh lừa

Nội dung câu hỏi nên mang bối cảnh:
công việc, doanh nghiệp, dự án, báo cáo, du lịch, phương tiện, khách sạn, nhà hàng, mua sắm, dịch vụ, ngân hàng, tài chính, tuyển dụng, công nghệ,... giống đề TOEIC.

Sau hai phần bài tập, viết phần:

- Answer Key & Detailed Explanations – Exercise 1
- Answer Key & Detailed Explanations – Exercise 2

Trong phần giải thích:

- Giải thích tại sao đáp án đúng
- Nêu dấu hiệu nhận biết (nếu có)
- Chỉ ra tại sao các đáp án còn lại sai (nếu cần)
- Viết ngắn gọn, rõ ràng, dễ hiểu

Format bắt buộc:

Header: .......( ví dụ: Header: Past Perfect)

Exercise 1 – Chọn đáp án đúng nhất (A, B, C hoặc D).

1. ...
A. ...
B. ...
C. ...
D. ...

...

Answer Key & Detailed Explanations – Exercise 1

1. A – explanation

...

Exercise 2 – Chọn đáp án đúng nhất (A, B, C hoặc D). (Trap / Difficult TOEIC Cases)

1. ...
A. ...
B. ...
C. ...
D. ...

...

Answer Key & Detailed Explanations – Exercise 2

1. B – explanation

...

Bước Kiểm Tra Chất Lượng (BẮT BUỘC):

Trước khi xuất bài tập, hãy chạy kiểm tra toàn diện.

Đối với mỗi câu hỏi:

- Kiểm tra tính đúng ngữ pháp của câu.

- Kiểm tra xem dạng động từ có khớp với cấu trúc ngữ pháp dự định hay không.

- Kiểm tra xem đáp án đúng có hoàn toàn phù hợp với câu hay không.

- Kiểm tra xem tất cả các lựa chọn khác có sai ngữ pháp hoặc logic hay không.

- Đảm bảo không có đáp án mơ hồ hoặc nhiều đáp án đúng.

Nếu phát hiện bất kỳ vấn đề nào, hãy tạo lại câu hỏi đó trước khi hoàn thiện bộ bài tập.

Không xuất các câu hỏi không đạt yêu cầu kiểm tra.`
    },
    {
        id: "2-prompt",
        title: "TOEIC Part 5",
        content: `Tạo 1 bài tập TOEIC Part 5 gồm 30 câu trắc nghiệm, độ khó tương đương đề TOEIC thật (mức 600–850), cung cấp đáp án + giải thích chi tiết từng câu để tự chấm.

Yêu cầu chung

Mỗi câu là 1 câu trắc nghiệm chọn đáp án đúng nhất A, B, C hoặc D.

Nội dung mang bối cảnh: công việc, doanh nghiệp, dự án, báo cáo, du lịch, phương tiện, khách sạn, nhà hàng, mua sắm, dịch vụ, ngân hàng, tài chính, tuyển dụng, công nghệ,... giống đề TOEIC.

Các dạng câu hỏi nên bao gồm những dạng phổ biến trong TOEIC Part 5:


Độ khó phân bổ:

Câu 1–10: dễ – trung bình

Câu 11–20: trung bình

Câu 21–30: trung bình – khó

Trong phần giải thích:

-Giải thích tại sao đáp án đúng

-Nêu dấu hiệu nhận biết (nếu có)

-Viết ngắn gọn, rõ ràng, dễ hiểu.

Format bài tập
Header: .... (Chủ đề ngữ pháp chính của bài – ví dụ: Header: Present Perfect)

Exercise – Choose the best answer (A, B, C, or D).

1. ...
A. ...
B. ...
C. ...
D. ...

...

Answer Key & Detailed Explanations

1. had finished – explanation
2. had delivered – explanation
...


Bước Kiểm Tra Chất Lượng (BẮT BUỘC):

Trước khi xuất bài tập, hãy chạy kiểm tra toàn diện.

Đối với mỗi câu hỏi:

- Kiểm tra tính đúng ngữ pháp của câu.

- Kiểm tra xem dạng động từ có khớp với cấu trúc ngữ pháp dự định hay không.

- Kiểm tra xem đáp án đúng có hoàn toàn phù hợp với câu hay không.

- Kiểm tra xem tất cả các lựa chọn khác có sai ngữ pháp hoặc logic hay không.

- Đảm bảo không có đáp án mơ hồ hoặc nhiều đáp án đúng.

Nếu phát hiện bất kỳ vấn đề nào, hãy tạo lại câu hỏi đó trước khi hoàn thiện bộ bài tập.

Không xuất các câu hỏi không đạt yêu cầu kiểm tra.`
    },
    {
        id: "3-prompt",
        title: "Mixed TOEIC (MCQ & FITB)",
        content: `2 Exercise mỗi bài 10 câu dạng thường gặp trong các đề thi TOEIC, mức độ khó giống TOEIC thật, Độ khó: TOEIC 600–850, cung cấp đáp án + giải thích chi tiết từng câu để tự chấm.

Yêu cầu bắt buộc:

Bài tập gồm 2 phần:

- Exercise 1 - 10 câu hỏi trắc nghiệm, dạng chọn đáp án đúng nhất A, B, C hoặc D.

- Exercise 2 - 10 câu hỏi dạng điền vào chỗ trống

Nội dung câu hỏi nên mang bối cảnh: công việc, doanh nghiệp, dự án, báo cáo, du lịch, phương tiện, khách sạn, nhà hàng, mua sắm, dịch vụ, ngân hàng, tài chính, tuyển dụng, công nghệ,... giống đề TOEIC.

Sau hai phần bài tập, viết phần:

- Answer Key & Detailed Explanations – Exercise 1
- Answer Key & Detailed Explanations – Exercise 2

Trong phần giải thích:

- Giải thích tại sao đáp án đúng
- Nêu dấu hiệu nhận biết (nếu có)
- Viết ngắn gọn, rõ ràng, dễ hiểu.

Format:

Header: .......( ví dụ:Header: Present Perfect)

Exercise 1 – Chọn đáp án đúng nhất (A, B, C hoặc D).

1. ...
A. ...
B. ...
C. ...
D. ...

...

Answer Key & Detailed Explanations – Exercise 1

1. A – explanation

...

Exercise 2 – Complete the sentences with the correct form of the word in parentheses.

(Yêu cầu: mỗi câu phải có một từ gợi ý đặt trong dấu ngoặc () ở vị trí cần điền sau khoảng trắng _____. Người làm bài phải chia từ đó đúng dạng ngữ pháp.)

1. Our flight to Tokyo ______ (leave) at 7:45 a.m. tomorrow. 
2. We ______ (implement) a new project management system next month.
...

Answer Key & Detailed Explanations – Exercise 2

1. had finished – explanation
2. had delivered – explanation
...

Bước Kiểm Tra Chất Lượng (BẮT BUỘC):

Trước khi xuất bài tập, hãy chạy kiểm tra toàn diện.

Đối với mỗi câu hỏi:

- Kiểm tra tính đúng ngữ pháp của câu.
- Kiểm tra xem dạng động từ có khớp với cấu trúc ngữ pháp dự định hay không.
- Kiểm tra xem đáp án đúng có hoàn toàn phù hợp với câu hay không.
- Kiểm tra xem tất cả các lựa chọn khác có sai ngữ pháp hoặc logic hay không.
- Đảm bảo không có đáp án mơ hồ hoặc nhiều đáp án đúng.

Nếu phát hiện bất kỳ vấn đề nào, hãy tạo lại câu hỏi đó trước khi hoàn thiện bộ bài tập.

Không xuất các câu hỏi không đạt yêu cầu kiểm tra.`
    }
];

export function getPrompts() {
    const storedStr = localStorage.getItem(STORAGE_KEY);
    if (!storedStr) return DEFAULT_PROMPTS;
    
    let prompts = JSON.parse(storedStr);
    let hasUpdate = false;

    // Kiểm tra xem có script nào mới được thêm vào DEFAULT_PROMPTS mà chưa có trong localStorage không
    DEFAULT_PROMPTS.forEach(def => {
        if (!prompts.some(p => p.id === def.id)) {
            prompts.push(def);
            hasUpdate = true;
        }
    });

    if (hasUpdate) {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(prompts));
    }

    return prompts;
}

export function savePrompt(title, content, id = null) {
    let prompts = getPrompts();
    if (id) {
        // Edit
        const index = prompts.findIndex(p => p.id === id);
        if (index !== -1) {
            prompts[index] = { ...prompts[index], title, content };
        }
    } else {
        // Add
        const newPrompt = {
            id: 'prompt-' + Date.now(),
            title,
            content
        };
        prompts.push(newPrompt);
    }
    localStorage.setItem(STORAGE_KEY, JSON.stringify(prompts));
    renderPromptList();
}

export function deletePrompt(id) {
    if (DEFAULT_PROMPTS.some(p => p.id === id)) {
        alert("Không thể xóa prompt mặc định!");
        return;
    }
    let prompts = getPrompts();
    prompts = prompts.filter(p => p.id !== id);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(prompts));
    renderPromptList();
}

export function renderPromptList() {
    const listContainer = document.getElementById("promptListContainer");
    if (!listContainer) return;

    const prompts = getPrompts();
    listContainer.innerHTML = prompts.map(p => `
        <div class="p-4 rounded-xl bg-base-200 border border-base-300 hover:border-primary transition-all group relative">
            <div class="flex justify-between items-start gap-2 mb-2">
                <span class="font-bold text-primary truncate flex-1 uppercase text-xs tracking-wider">${p.title}</span>
                <div class="flex gap-1 lg:opacity-0 group-hover:opacity-100 transition-opacity">
                    <button onclick="window.editPromptUI('${p.id}')" class="btn btn-xs btn-ghost btn-circle text-info">
                        <i data-lucide="edit-3" class="h-3 w-3"></i>
                    </button>
                    <button onclick="window.deletePromptUI('${p.id}')" class="btn btn-xs btn-ghost btn-circle text-error ${DEFAULT_PROMPTS.some(dp => dp.id === p.id) ? 'hidden' : ''}">
                        <i data-lucide="trash-2" class="h-3 w-3"></i>
                    </button>
                </div>
            </div>
            <p class="text-[10px] opacity-60 line-clamp-3 leading-relaxed mb-3">${p.content}</p>
            <button onclick="window.usePrompt('${p.id}')" class="btn btn-xs btn-primary w-full rounded-lg font-bold">Dùng Prompt này</button>
        </div>
    `).join("");

    if (window.lucide) window.lucide.createIcons();
}

// UI Handlers
window.editPromptUI = (id) => {
    const prompts = getPrompts();
    const prompt = prompts.find(p => p.id === id);
    if (prompt) {
        document.getElementById("promptIdInput").value = prompt.id;
        document.getElementById("promptTitleInput").value = prompt.title;
        document.getElementById("promptContentInput").value = prompt.content;

        originalTitle = prompt.title;
        originalContent = prompt.content;

        document.getElementById("promptFormTitle").innerText = "Chỉnh sửa Prompt";
        document.getElementById("promptManageForm").classList.remove("hidden");
        updateSaveButtonState();
    }
};

window.updateSaveButtonState = () => {
    const title = document.getElementById("promptTitleInput").value.trim();
    const content = document.getElementById("promptContentInput").value.trim();
    const saveBtn = document.getElementById("savePromptBtn");

    if (saveBtn) {
        const hasChanges = (title !== originalTitle || content !== originalContent) && title !== "" && content !== "";
        saveBtn.disabled = !hasChanges;
    }
};

window.deletePromptUI = (id) => {
    if (confirm("Xác nhận xóa prompt này?")) {
        deletePrompt(id);
    }
};

window.usePrompt = (id) => {
    const prompts = getPrompts();
    const prompt = prompts.find(p => p.id === id);
    if (prompt) {
        document.getElementById("promptText").innerText = prompt.content;
        document.getElementById("promptModalTitle").innerText = prompt.title;
        const manageModal = document.getElementById("managePromptsModal");
        if (manageModal) manageModal.close();
        const promptModal = document.getElementById("promptModal");
        if (promptModal) promptModal.showModal();
    }
};

window.togglePromptForm = () => {
    const form = document.getElementById("promptManageForm");
    form.classList.toggle("hidden");
    if (!form.classList.contains("hidden")) {
        document.getElementById("promptIdInput").value = "";
        document.getElementById("promptTitleInput").value = "";
        document.getElementById("promptContentInput").value = "";
        originalTitle = "";
        originalContent = "";
        document.getElementById("promptFormTitle").innerText = "Thêm Prompt mới";
        updateSaveButtonState();
    }
};

window.closePromptFormUI = () => {
    const title = document.getElementById("promptTitleInput").value.trim();
    const content = document.getElementById("promptContentInput").value.trim();

    if (title !== originalTitle || content !== originalContent) {
        document.getElementById("confirmClosePromptModal").showModal();
    } else {
        document.getElementById("promptManageForm").classList.add("hidden");
    }
};

window.saveNewPrompt = () => {
    const id = document.getElementById("promptIdInput").value;
    const title = document.getElementById("promptTitleInput").value.trim();
    const content = document.getElementById("promptContentInput").value.trim();

    if (!title || !content) {
        alert("Vui lòng điền đủ Tiêu đề và Nội dung!");
        return;
    }

    savePrompt(title, content, id || null);
    document.getElementById("promptManageForm").classList.add("hidden");
};

// Listeners for changes
document.getElementById("promptTitleInput")?.addEventListener("input", () => window.updateSaveButtonState());
document.getElementById("promptContentInput")?.addEventListener("input", () => window.updateSaveButtonState());
