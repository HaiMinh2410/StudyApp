/* =========================
   PROMPT MANAGER LOGIC
========================= */

const STORAGE_KEY = "userPrompts";

const DEFAULT_PROMPTS = [
    {
        id: "default-toeic",
        title: "TOEIC Generator",
        content: `2 Exercise mỗi bài 10 câu dạng thường gặp trong các đề thi TOEIC, mức độ khó giống TOEIC thật, cung cấp đáp án + giải thích chi tiết từng câu để tự chấm.

Yêu cầu bắt buộc:

Bài tập gồm 2 phần:

-Exercise 1 - 10 câu hỏi trắc nghiệm, dạng chọn đáp án đúng nhất A, B, C hoặc D.

-Exercise 2 - 10 câu hỏi dạng điền vào chỗ trống

Nội dung câu hỏi nên mang bối cảnh công việc, doanh nghiệp, văn phòng, email, meeting, báo cáo, dự án, khách hàng, máy tính giống đề TOEIC.

Sau hai phần bài tập, viết phần:

-Answer Key & Detailed Explanations – Exercise 1

-Answer Key & Detailed Explanations – Exercise 2

Trong phần giải thích:

-Giải thích tại sao đáp án đúng

-Nêu dấu hiệu nhận biết (nếu có)

-Viết ngắn gọn, rõ ràng, dễ hiểu.

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

Exercise 2 – Complete the sentences with the correct word.
1. ....
...

Answer Key & Detailed Explanations – Exercise 2

...
Độ khó: TOEIC 600–850.`
    }
];

export function getPrompts() {
    const stored = localStorage.getItem(STORAGE_KEY);
    return stored ? JSON.parse(stored) : DEFAULT_PROMPTS;
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
    if (id === "default-toeic") {
        alert("Cannot delete default prompt!");
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
                        <svg xmlns="http://www.w3.org/2000/svg" class="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                        </svg>
                    </button>
                    <button onclick="window.deletePromptUI('${p.id}')" class="btn btn-xs btn-ghost btn-circle text-error ${p.id === 'default-toeic' ? 'hidden' : ''}">
                        <svg xmlns="http://www.w3.org/2000/svg" class="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1-1v3M4 7h16" />
                        </svg>
                    </button>
                </div>
            </div>
            <p class="text-[10px] opacity-60 line-clamp-3 leading-relaxed mb-3">${p.content}</p>
            <button onclick="window.usePrompt('${p.id}')" class="btn btn-xs btn-primary w-full rounded-lg font-bold">Dùng Prompt này</button>
        </div>
    `).join("");
}

// UI Handlers
window.editPromptUI = (id) => {
    const prompts = getPrompts();
    const prompt = prompts.find(p => p.id === id);
    if (prompt) {
        document.getElementById("promptIdInput").value = prompt.id;
        document.getElementById("promptTitleInput").value = prompt.title;
        document.getElementById("promptContentInput").value = prompt.content;
        document.getElementById("promptManageForm").classList.remove("hidden");
        document.getElementById("promptManageForm").scrollIntoView({ behavior: 'smooth' });
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
