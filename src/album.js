/* =========================
   MY WORD LIST (ALBUMS) LOGIC
========================= */
let selectedTextToSave = "";
let currentViewAlbumId = null;
let pendingWordData = null;
let pendingAlbumId = null;
let isSelectionMode = false;
let selectedWordIndices = new Set();
let wordSortType = 'newest';

// Khởi tạo Word List
export function initWordList() {
    const albums = getAlbums();
    if (albums.length === 0) {
        // Tạo album mặc định nếu chưa có
        saveAlbums([{ id: Date.now(), name: "Từ vựng quan trọng", words: [] }]);
    }
}

export function getAlbums() {
    const albums = JSON.parse(localStorage.getItem("wordAlbums") || "[]");
    return albums.sort((a, b) => b.id - a.id);
}

export function saveAlbums(albums) {
    localStorage.setItem("wordAlbums", JSON.stringify(albums));
}

export function handleTextSelection() {
    const selection = window.getSelection();
    const text = selection.toString().trim();
    const popup = document.getElementById("selectionPopup");

    if (text && text.length > 0 && text.length < 100) {
        selectedTextToSave = text;
        const range = selection.getRangeAt(0);
        const rect = range.getBoundingClientRect();

        popup.style.left = `${rect.left + (rect.width / 2)}px`;
        popup.style.top = `${rect.top + window.scrollY - 12}px`;
        popup.style.transform = "translateX(-50%) translateY(-100%)";
        popup.classList.remove("hidden");
    } else {
        if (popup) popup.classList.add("hidden");
    }
}

export function openAddToAlbumModal() {
    const modal = document.getElementById("addToAlbumModal");
    const input = document.getElementById("selectedWordInput");
    const select = document.getElementById("albumSelect");

    if (input) {
        input.value = selectedTextToSave;
        input.readOnly = false; // Cho phép sửa/nhập mới
    }

    const typeInput = document.getElementById("wordTypeInput");
    const phoneticInput = document.getElementById("wordPhoneticInput");
    const meaningInput = document.getElementById("wordMeaningInput");

    if (typeInput) typeInput.value = "";
    if (phoneticInput) phoneticInput.value = "";
    if (meaningInput) meaningInput.value = "";

    const albums = getAlbums();
    if (select) {
        select.innerHTML = albums.map(a => `<option value="${a.id}">${a.name}</option>`).join("");
    }

    if (modal) modal.showModal();
    document.getElementById("selectionPopup")?.classList.add("hidden");

    if (selectedTextToSave) {
        fetchWordDetails(selectedTextToSave);
    }
}

async function fetchWordDetails(word) {
    const typeInput = document.getElementById("wordTypeInput");
    const phoneticInput = document.getElementById("wordPhoneticInput");
    const meaningInput = document.getElementById("wordMeaningInput");

    if (typeInput) typeInput.placeholder = "🔍...Đang tìm...";
    if (phoneticInput) phoneticInput.placeholder = "🔍...Đang tìm...";
    if (meaningInput) meaningInput.placeholder = "🔍...Đang tìm...";

    try {
        const dictPromise = fetch(`https://api.dictionaryapi.dev/api/v2/entries/en/${word}`)
            .then(res => res.ok ? res.json() : null);

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
    albums.unshift(newAlbum);
    saveAlbums(albums);

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
        album.words.unshift(wordData);
        saveAlbums(albums);

        // Refresh UI if viewing this album
        if (currentViewAlbumId == albumId) {
            renderWordListOnly();
            renderSideAlbumList();
        }
    }

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
    currentViewAlbumId = null;
    renderSideAlbumList();

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
        if (sidebar) {
            sidebar.classList.remove("lg:w-0", "lg:opacity-0", "lg:-translate-x-full");
            sidebar.classList.add("lg:w-1/3", "lg:opacity-100", "lg:translate-x-0");
        }
    }

    const modal = document.getElementById("wordListModal");
    if (modal) modal.showModal();

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
    albums.unshift(newAlbum);
    saveAlbums(albums);

    if (input) input.value = "";
    document.getElementById("newAlbumQuickInput")?.classList.add("hidden");
    renderSideAlbumList();
    viewAlbum(newAlbum.id);
}

export function openAddWordDirectly() {
    selectedTextToSave = "";
    openAddToAlbumModal();

    // Ưu tiên chọn album đang xem trong dropdown
    setTimeout(() => {
        const select = document.getElementById("albumSelect");
        if (select && currentViewAlbumId) {
            select.value = currentViewAlbumId;
        }
        document.getElementById("selectedWordInput")?.focus();
    }, 100);
}

export function renderSideAlbumList() {
    const albums = getSortedAlbums();
    const container = document.getElementById("sideAlbumList");
    if (!container) return;

    container.innerHTML = albums.map(a => `
        <div class="group relative flex items-center mb-1">
            <button onclick="window.viewAlbum(${a.id})" 
                class="btn btn-ghost flex-1 justify-start text-left normal-case border-none hover:text-primary transition-all rounded-xl py-6 h-auto ${currentViewAlbumId == a.id ? 'bg-primary/20 text-primary font-bold ring-1 ring-primary/20' : 'hover:bg-primary/10'}">
                <div class="flex flex-col gap-0.5 w-full pr-8">
                    <span class="truncate font-bold">${a.name}</span>
                    <span class="text-[10px] opacity-50 uppercase font-black">${a.words.length} words</span>
                </div>
            </button>
            <button onclick="window.deleteAlbumById(${a.id})" 
                class="btn btn-ghost btn-circle btn-xs absolute right-3 text-error/60 lg:text-error lg:opacity-0 group-hover:opacity-100 transition-all" 
                title="Xóa Album">
                <i data-lucide="trash-2" class="h-3.5 w-3.5"></i>
            </button>
        </div>
    `).join("");

    if (window.lucide) window.lucide.createIcons();
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

    if (title && album) title.innerText = album.name;

    isSelectionMode = false;
    selectedWordIndices.clear();
    updateBulkActionsBar();
    renderWordListOnly();

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

        const clearAllBtn = document.getElementById("clearAllWordsBtn");
        const albumActions = document.getElementById("albumActions");
        const wordSortControl = document.getElementById("wordSortControl");
        const studyMode = document.getElementById("studyModeControl");
        const hideMeaningLabel = document.getElementById("hideMeaningLabel");
        const secretDivider = document.querySelector(".secret-divider");

        if (clearAllBtn) clearAllBtn.classList.toggle("hidden", !hasWords);
        if (albumActions) albumActions.classList.toggle("hidden", !hasWords);
        if (wordSortControl) wordSortControl.classList.toggle("hidden", !hasWords);

        // Luôn hiện studyModeControl khi đã vào album để hiện nút "Thêm từ"
        if (studyMode) studyMode.classList.remove("hidden");
        // Chỉ hiện toggle "Ẩn nghĩa" và divider khi có từ
        if (hideMeaningLabel) hideMeaningLabel.classList.toggle("hidden", !hasWords);
        if (secretDivider) secretDivider.classList.toggle("hidden", !hasWords);

        if (!hasWords) {
            list.innerHTML = `
                <div class="flex flex-col items-center justify-center py-20 opacity-30 grayscale gap-4">
                     <i data-lucide="book-open" class="h-16 w-16"></i>
                    <p class="italic">Chưa có từ vựng nào trong album này.</p>
                </div>`;
        } else {
            let displayWords = [...album.words];
            if (wordSortType === 'oldest') {
                displayWords.reverse();
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
                            <div class="hidden lg:flex items-center gap-1">
                                <button onclick="window.speakWord('${word.replace(/'/g, "\\'")}')" class="btn btn-ghost btn-circle btn-sm opacity-0 group-hover:opacity-100 transition-all font-medium" title="Nghe phát âm">
                                    <i data-lucide="volume-2" class="h-4 w-4"></i>
                                </button>
                                <button onclick="window.openEditWordModal('${word.replace(/'/g, "\\'")}', '${type.replace(/'/g, "\\'")}', '${phonetic.replace(/'/g, "\\'")}', '${meaning.replace(/'/g, "\\'")}')" class="btn btn-ghost btn-circle btn-sm opacity-0 group-hover:opacity-100 transition-all text-secondary" title="Sửa từ vựng">
                                    <i data-lucide="edit-3" class="h-4 w-4"></i>
                                </button>
                                <button onclick="window.removeWordFromAlbum(${currentViewAlbumId}, '${word.replace(/'/g, "\\'")}')" class="btn btn-ghost btn-circle btn-sm text-error opacity-0 group-hover:opacity-100 transition-all" title="Xóa từ vựng">
                                    <i data-lucide="trash-2" class="h-4 w-4"></i>
                                </button>
                            </div>
                            <div class="flex lg:hidden items-center gap-1">
                                <button onclick="window.speakWord('${word.replace(/'/g, "\\'")}')" class="btn btn-ghost btn-circle btn-sm" title="Nghe phát âm">
                                    <i data-lucide="volume-2" class="h-4 w-4"></i>
                                </button>
                                <div class="dropdown dropdown-end">
                                    <div tabindex="0" role="button" class="btn btn-ghost btn-circle btn-sm">
                                        <i data-lucide="more-vertical" class="h-5 w-5"></i>
                                    </div>
                                    <ul tabindex="0" class="dropdown-content z-[1] menu p-2 shadow bg-base-100 rounded-box w-32 border border-base-300">
                                        <li><a onclick="window.openEditWordModal('${word.replace(/'/g, "\\'")}', '${type.replace(/'/g, "\\'")}', '${phonetic.replace(/'/g, "\\'")}', '${meaning.replace(/'/g, "\\'")}')" class="flex items-center gap-2"><i data-lucide="edit-3" class="h-4 w-4"></i> Sửa</a></li>
                                        <li><a onclick="window.removeWordFromAlbum(${currentViewAlbumId}, '${word.replace(/'/g, "\\'")}')" class="flex items-center gap-2 text-error"><i data-lucide="trash-2" class="h-4 w-4"></i> Xóa</a></li>
                                    </ul>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>`;

            }).join("");
        }
    }
    if (window.lucide) window.lucide.createIcons();
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

    if (title) title.innerText = "Chọn một Album";
    if (list) list.innerHTML = `<div class="text-center py-20 opacity-20 italic">Chọn album ở cột bên trái để xem từ vựng</div>`;

    document.getElementById("wordSortControl")?.classList.add("hidden");
    document.getElementById("studyModeControl")?.classList.add("hidden");

    renderSideAlbumList();
}

document.addEventListener("mouseup", handleTextSelection);
document.addEventListener("mousedown", (e) => {
    const popup = document.getElementById("selectionPopup");
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
window.showCreateAlbumInput = showCreateAlbumInput;
window.createAlbumFromSidebar = createAlbumFromSidebar;
window.openAddWordDirectly = openAddWordDirectly;
window.deleteAlbumById = deleteAlbumById;
window.renderSideAlbumList = renderSideAlbumList;
window.renderWordListOnly = renderWordListOnly;
window.setWordSortType = setWordSortType;

window.toggleWordListSidebar = function () {
    const sidebar = document.getElementById("wordListSidebar");
    const backdrop = document.getElementById("sidebarBackdrop");
    if (!sidebar) return;

    const isLg = window.innerWidth >= 1024;

    if (isLg) {
        const isCollapsed = sidebar.classList.contains("lg:w-0");
        if (isCollapsed) {
            sidebar.classList.remove("lg:w-0", "lg:opacity-0", "lg:-translate-x-full", "lg:border-none");
            sidebar.classList.add("lg:w-1/3", "lg:opacity-100", "lg:translate-x-0");
        } else {
            sidebar.classList.remove("lg:w-1/3", "lg:opacity-100", "lg:translate-x-0");
            sidebar.classList.add("lg:w-0", "lg:opacity-0", "lg:-translate-x-full", "lg:border-none");
        }
    } else {
        const isOpen = sidebar.classList.contains("translate-x-0");
        if (!isOpen) {
            sidebar.classList.remove("-translate-x-full", "opacity-0");
            sidebar.classList.add("translate-x-0", "opacity-100");
            if (backdrop) {
                backdrop.classList.remove("hidden");
                setTimeout(() => backdrop.classList.add("opacity-100"), 10);
            }
        } else {
            sidebar.classList.remove("translate-x-0", "opacity-100");
            sidebar.classList.add("-translate-x-full", "opacity-0");
            if (backdrop) {
                backdrop.classList.remove("opacity-100");
                setTimeout(() => backdrop.classList.add("hidden"), 300);
            }
        }
    }
};

initWordList();
