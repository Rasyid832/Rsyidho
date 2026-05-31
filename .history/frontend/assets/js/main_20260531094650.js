const BACKEND_URL = 'http://localhost:3000/api/ai';

// Variabel global untuk menampung file yang sedang dipilih user
let selectedFileBase64 = null;
let selectedFileMimeType = null;
let selectedFileName = null;

// Variabel global untuk mengontrol pembatalan chat (Stop Generating)
let chatAbortController = null;

// =========================================================================
// [MULTICHAT] STATE & LOGIKA UTAMA MANAJEMEN ROOM CHAT
// =========================================================================
let chatRooms = JSON.parse(localStorage.getItem('syid_ai_rooms')) || [];
let currentRoomId = localStorage.getItem('syid_ai_current_room') || null;

// Fungsi inisialisasi awal saat halaman di-load
document.addEventListener('DOMContentLoaded', () => {
    if (chatRooms.length === 0) {
        createNewChat();
    } else {
        if (!currentRoomId || !chatRooms.find(r => r.id === currentRoomId)) {
            currentRoomId = chatRooms[0].id;
            localStorage.setItem('syid_ai_current_room', currentRoomId);
        }
        renderRecentChats();
        loadChatMessages();
    }
});

// Fungsi Membuat Sesi Chat Baru
function createNewChat() {
    const newRoom = {
        id: 'room-' + Date.now(),
        title: 'Sesi Chat Baru',
        messages: [
            {
                sender: 'ai',
                text: "Welcome👋\n\nI'm your futuristic AI companion. Ask me anything about coding, statistics, design, websites, or your next big project 🚀",
                timestamp: 'Just now'
            }
        ]
    };

    chatRooms.unshift(newRoom);
    currentRoomId = newRoom.id;
    saveToLocalStorage();
    
    renderRecentChats();
    loadChatMessages();
}

// Fungsi Menyimpan Data ke LocalStorage
function saveToLocalStorage() {
    localStorage.setItem('syid_ai_rooms', JSON.stringify(chatRooms));
    localStorage.setItem('syid_ai_current_room', currentRoomId);
}

// Fungsi Merender Daftar Riwayat Chat di Sidebar Kiri
function renderRecentChats() {
    const listContainer = document.getElementById('recent-chats-list');
    if (!listContainer) return;

    listContainer.innerHTML = '';

    chatRooms.forEach(room => {
        const isActive = room.id === currentRoomId;
        const activeClasses = isActive 
            ? 'bg-white/20 border-white/20 hover:bg-white/30' 
            : 'hover:bg-white/10 border-transparent';

        const roomHtml = `
            <div onclick="switchChatRoom('${room.id}')" class="group relative p-3 sm:p-4 rounded-xl sm:rounded-2xl border transition cursor-pointer flex items-center justify-between gap-2 ${activeClasses}">
                <div class="min-w-0 flex-1">
                    <h3 class="text-xs sm:text-sm font-semibold truncate">${room.title}</h3>
                    <p class="text-[10px] sm:text-xs text-slate-500 mt-0.5 truncate">${room.messages[room.messages.length - 1]?.text || 'Tidak ada pesan'}</p>
                </div>
                <!-- Tombol Hapus Room Chat -->
                <button onclick="deleteChatRoom(event, '${room.id}')" class="opacity-0 group-hover:opacity-100 p-1 text-slate-400 hover:text-rose-500 rounded transition cursor-pointer text-xs font-bold shrink-0">
                    ✕
                </button>
            </div>
        `;
        listContainer.insertAdjacentHTML('beforeend', roomHtml);
    });
}

// Fungsi Pindah Room Chat
function switchChatRoom(roomId) {
    if (chatAbortController) {
        chatAbortController.abort();
    }
    currentRoomId = roomId;
    localStorage.setItem('syid_ai_current_room', currentRoomId);
    renderRecentChats();
    loadChatMessages();
}

// Fungsi Menghapus Room Chat
function deleteChatRoom(event, roomId) {
    event.stopPropagation(); // Mencegah trigger klik pindah room

    chatRooms = chatRooms.filter(room => room.id !== roomId);
    
    if (chatRooms.length === 0) {
        localStorage.clear();
        currentRoomId = null;
        createNewChat();
        return;
    }

    if (currentRoomId === roomId) {
        currentRoomId = chatRooms[0].id;
    }

    saveToLocalStorage();
    renderRecentChats();
    loadChatMessages();
}

// Fungsi Memuat dan Menampilkan Pesan dari Room yang Aktif ke Layar Utama
function loadChatMessages() {
    const chatContainer = document.getElementById('chat-container');
    if (!chatContainer) return;

    chatContainer.innerHTML = '';
    const currentRoom = chatRooms.find(r => r.id === currentRoomId);
    if (!currentRoom) return;

    currentRoom.messages.forEach(msg => {
        if (msg.sender === 'user') {
            let attachmentHtml = '';
            if (msg.fileName) {
                const icon = msg.fileMimeType?.includes('image/') ? '🖼️' : '📄';
                attachmentHtml = `
                    <div class="flex items-center gap-1.5 text-xs bg-purple-700/40 border border-purple-400/30 px-2 py-1 rounded-lg mb-1.5 font-medium text-purple-200">
                        <span>${icon}</span> <span class="truncate max-w-[140px]">${msg.fileName}</span>
                    </div>
                `;
            }

            const userMessageHtml = `
                <div class="flex items-start gap-3 max-w-[85%] ml-auto justify-end message-animation">
                    <div class="flex flex-col gap-1 items-end">
                        <div class="flex items-center gap-2">
                            <span class="text-xs font-semibold text-slate-400">Kamu</span>
                        </div>
                        <div class="bg-gradient-to-r from-purple-600 to-indigo-600 text-white rounded-2xl rounded-tr-none px-4 py-3 text-sm shadow-md leading-relaxed tracking-wide">
                            ${attachmentHtml}
                            <div class="whitespace-pre-wrap">${msg.text}</div>
                        </div>
                    </div>
                    <div class="w-8 h-8 rounded-lg bg-purple-900/40 border border-purple-500/30 flex items-center justify-center shrink-0 shadow-sm text-sm">👤</div>
                </div>
            `;
            chatContainer.insertAdjacentHTML('beforeend', userMessageHtml);
        } else {
            // Render bubble AI (deteksi apakah berupa gambar atau teks)
            const aiUniqueId = 'ai-msg-loaded-' + Math.random().toString(36).substr(2, 9);
            const isImage = msg.isImage || (msg.text && msg.text.startsWith('http') && (msg.text.includes('.png') || msg.text.includes('.jpg') || msg.text.includes('blob') || msg.text.includes('data:image')));

            let aiBubbleInner = '';
            let extraClasses = "bg-slate-900/90 text-slate-200 rounded-2xl rounded-tl-none px-4 py-3 text-sm border border-slate-800/80 shadow-md leading-relaxed tracking-wide min-h-[40px] whitespace-pre-wrap";

            if (isImage) {
                extraClasses = "bg-white/10 text-slate-200 rounded-2xl rounded-tl-none p-2 text-sm border border-white/10 shadow-xl max-w-sm overflow-hidden";
                aiBubbleInner = `
                    <div class="relative group rounded-xl overflow-hidden shadow-inner bg-slate-950">
                        <img src="${msg.text}" alt="AI Generated" class="w-full h-auto object-cover max-h-[350px]">
                        <div class="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex items-end p-3">
                            <a href="${msg.text}" target="_blank" download="syid-ai-image.png" class="bg-white/20 backdrop-blur-md border border-white/30 text-white text-xs px-3 py-1.5 rounded-lg font-medium hover:bg-white/40 transition">📥 Buka / Unduh Full</a>
                        </div>
                    </div>
                    <p class="px-2 pt-2 pb-1 text-xs text-slate-400 italic">Gambar yang disimpan</p>
                `;
            } else {
                aiBubbleInner = parseAndRenderMath(msg.text);
            }

            const aiMessageHtml = `
                <div class="flex items-start gap-3 max-w-[85%] message-animation">
                    <div class="w-8 h-8 rounded-lg bg-slate-800 border border-slate-700 flex items-center justify-center shrink-0 shadow-sm text-sm">🤖</div>
                    <div class="flex flex-col gap-1 w-full">
                        <div class="flex items-center gap-2"><span class="text-xs font-semibold text-slate-400">Syid AI</span></div>
                        <div id="${aiUniqueId}" class="${extraClasses}">${aiBubbleInner}</div>
                    </div>
                </div>
            `;
            chatContainer.insertAdjacentHTML('beforeend', aiMessageHtml);
            
            // Re-highlight dengan Prism jika data baru dimuat kembali dari localstorage
            const targetBubble = document.getElementById(aiUniqueId);
            if (window.Prism && targetBubble) {
                Prism.highlightAllUnder(targetBubble);
            }
        }
    });

    chatContainer.scrollTop = chatContainer.scrollHeight;
}
// =========================================================================

// =========================================================================
// FUNGSI SAKTI: Parser Matematika, Markdown Bold, & Code Block (Prism.js)
// =========================================================================
function parseAndRenderMath(text) {
    if (!text) return text;

    // 1. Handle Code Blocks (```nama_bahasa ... ```) dengan Perbaikan Dom-Targeting Tombol Copy
    text = text.replace(/```([a-zA-Z0-9+#-]+)?\n([\s\S]*?)
```/g, (match, lang, code) => {
        const language = lang ? lang.trim().toLowerCase() : 'plaintext';
        const cleanCode = code.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
        
        return `
            <div class="my-4 rounded-xl overflow-hidden border border-slate-800 bg-slate-950 shadow-lg text-left font-mono text-xs sm:text-sm code-block-container">
                <div class="bg-slate-900 px-4 py-1.5 flex justify-between items-center border-b border-slate-800 text-slate-400 select-none">
                    <span class="text-[10px] uppercase tracking-wider font-bold text-purple-400">${language}</span>
                    <button onclick="const codeEl = this.closest('.code-block-container').querySelector('code'); navigator.clipboard.writeText(codeEl.innerText); this.innerText='Copied!'; setTimeout(() => this.innerText='Copy', 2000)" class="text-[11px] hover:text-white transition cursor-pointer font-sans font-medium px-2 py-0.5 rounded hover:bg-slate-800">
                        Copy
                    </button>
                </div>
                <pre class="!p-4 !m-0 !bg-transparent custom-scrollbar overflow-x-auto"><code class="language-${language}">${cleanCode}</code></pre>
            </div>
        `;
    });

    // 2. Handle Inline Code (`code` di dalam kalimat)
    text = text.replace(/`([^`\n]+)`/g, '<code class="bg-slate-800/80 text-purple-300 px-1.5 py-0.5 rounded text-xs sm:text-sm font-mono border border-slate-700/50">$1</code>');

    if (!window.katex) return text;

    // 3. Handle Display Math ($$.$$)
    text = text.replace(/\$\$\s*([\s\S]*?)\s*\$\$/g, (match, mathExpression) => {
        try {
            return `<div class="my-3 flex justify-center text-center overflow-x-auto">${katex.renderToString(mathExpression, { displayMode: true, throwOnError: false })}</div>`;
        } catch (e) {
            return match;
        }
    });

    // 4. Handle Inline Math ($.$)
    text = text.replace(/\$([\s\S]*?)\$/g, (match, mathExpression) => {
        if (!mathExpression.trim()) return match;
        try {
            return `<span class="inline-math px-0.5 font-sans">${katex.renderToString(mathExpression, { displayMode: false, throwOnError: false })}</span>`;
        } catch (e) {
            return match;
        }
    });

    // 5. Render Format Tiga Bintang (Bold + Italic) ***teks***
    text = text.replace(/\*\*\*(.*?)\*\*\*/g, '<strong><em>$1</em></strong>');

    // 6. Render Format Markdown Tebal (Bold) **teks**
    text = text.replace(/\*\*\((.*?)\*\*/g, '<strong>$1</strong>');
    text = text.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');

    // 7. Render Format Markdown Miring (Italic) *teks*
    text = text.replace(/\*([^*]+)\*/g, '<em>$1</em>');

    return text;
}
// =========================================================================

function handleFileSelection() {
    const fileInput = document.getElementById('file-upload-input');
    const previewContainer = document.getElementById('file-preview-container');
    const previewName = document.getElementById('file-preview-name');
    const previewIcon = document.getElementById('file-preview-icon');
    
    const file = fileInput.files[0];
    if (!file) return;

    selectedFileName = file.name;
    selectedFileMimeType = file.type;

    if (file.type.includes('image/')) {
        previewIcon.innerText = '🖼️';
    } else if (file.type === 'application/pdf') {
        previewIcon.innerText = '📄';
    } else {
        previewIcon.innerText = '📁';
    }

    previewName.innerText = file.name;
    previewContainer.classList.remove('hidden');

    const reader = new FileReader();
    reader.onload = function (e) {
        selectedFileBase64 = e.target.result.split(',')[1];
    };
    reader.readAsDataURL(file);
}

function clearSelectedFile() {
    document.getElementById('file-upload-input').value = '';
    document.getElementById('file-preview-container').classList.add('hidden');
    selectedFileBase64 = null;
    selectedFileMimeType = null;
    selectedFileName = null;
}

// Fungsi Utama Mengirim Chat & File ke Backend
async function sendChatMessage() {
    const chatInputEl = document.getElementById('chat-input');
    const chatContainer = document.getElementById('chat-container');
    const messageText = chatInputEl.value.trim();

    if (chatAbortController) {
        chatAbortController.abort();
        return;
    }

    if (!messageText && !selectedFileBase64) return;

    // Ambil referensi room aktif
    const currentRoom = chatRooms.find(r => r.id === currentRoomId);
    if (!currentRoom) return;

    // Update Judul Jika ini Pesan Pertama User di Sesi Baru
    if (currentRoom.title === 'Sesi Chat Baru' && messageText) {
        currentRoom.title = messageText.substring(0, 24) + (messageText.length > 24 ? '...' : '');
    }

    // Simpan Pesan User ke State Room Aktif
    currentRoom.messages.push({
        sender: 'user',
        text: messageText,
        fileName: selectedFileName,
        fileMimeType: selectedFileMimeType,
        timestamp: 'Just now'
    });
    saveToLocalStorage();
    renderRecentChats();

    let attachmentHtml = '';
    if (selectedFileName) {
        const icon = selectedFileMimeType.includes('image/') ? '🖼️' : '📄';
        attachmentHtml = `
            <div class="flex items-center gap-1.5 text-xs bg-purple-700/40 border border-purple-400/30 px-2 py-1 rounded-lg mb-1.5 font-medium text-purple-200">
                <span>${icon}</span> <span class="truncate max-w-[140px]">${selectedFileName}</span>
            </div>
        `;
    }

    const userMessageHtml = `
        <div class="flex items-start gap-3 max-w-[85%] ml-auto justify-end message-animation">
            <div class="flex flex-col gap-1 items-end">
                <div class="flex items-center gap-2">
                    <span class="text-xs font-semibold text-slate-400">Kamu</span>
                </div>
                <div class="bg-gradient-to-r from-purple-600 to-indigo-600 text-white rounded-2xl rounded-tr-none px-4 py-3 text-sm shadow-md leading-relaxed tracking-wide">
                    ${attachmentHtml}
                    <div class="whitespace-pre-wrap">${messageText}</div>
                </div>
            </div>
            <div class="w-8 h-8 rounded-lg bg-purple-900/40 border border-purple-500/30 flex items-center justify-center shrink-0 shadow-sm text-sm">
                👤
            </div>
        </div>
    `;
    chatContainer.insertAdjacentHTML('beforeend', userMessageHtml);
    
    const fileToSend = selectedFileBase64;
    const mimeToSend = selectedFileMimeType;
    clearSelectedFile();

    chatInputEl.value = '';
    chatContainer.scrollTop = chatContainer.scrollHeight;

    // Render Animasi Loading Sementara
    const loadingId = 'loading-' + Date.now();
    const isImageRequest = /gambar|foto|lukis|bikin|create image|generate/i.test(messageText);
    const loadingText = isImageRequest ? 'Sedang melukis gambarmu... 🎨🖌️' : 'Sedang menganalisis file & mengetik... ⏳';

    const aiLoadingHtml = `
        <div class="flex items-start gap-3 max-w-[85%] message-animation" id="${loadingId}">
            <div class="w-8 h-8 rounded-lg bg-slate-800 border border-slate-700 flex items-center justify-center shrink-0 shadow-sm text-sm">
                🤖
            </div>
            <div class="flex flex-col gap-1">
                <div class="flex items-center gap-2">
                    <span class="text-xs font-semibold text-slate-400">Syid AI</span>
                </div>
                <div class="bg-slate-900/90 text-slate-400 rounded-2xl rounded-tl-none px-4 py-3 text-sm border border-slate-800/80 animate-pulse shadow-md">
                    ${loadingText}
                </div>
            </div>
        </div>
    `;
    chatContainer.insertAdjacentHTML('beforeend', aiLoadingHtml);
    chatContainer.scrollTop = chatContainer.scrollHeight;

    chatAbortController = new AbortController();
    
    const sendBtn = document.getElementById('chat-send-button');
    const sendText = document.getElementById('chat-send-text');
    const sendIcon = document.getElementById('chat-send-icon');
    if (sendBtn) {
        if (sendText) sendText.innerText = 'Stop';
        if (sendIcon) sendIcon.innerText = '⏹️';
        sendBtn.className = "h-10 sm:h-14 px-4 sm:px-8 rounded-xl sm:rounded-2xl bg-gradient-to-r from-red-500 to-orange-500 text-white text-xs sm:text-sm font-semibold shadow-lg transition shrink-0 cursor-pointer flex items-center justify-center gap-1 animate-pulse";
    }

    try {
        const response = await fetch(`${BACKEND_URL}/chat`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ 
                message: messageText,
                fileData: fileToSend,
                fileMimeType: mimeToSend
            }),
            signal: chatAbortController.signal
        });

        const data = await response.json();
        if (document.getElementById(loadingId)) document.getElementById(loadingId).remove();

        // Siapkan kontainer Bubble Chat kosong untuk AI
        const aiUniqueId = 'ai-msg-' + Date.now();
        const aiMessageHtml = `
            <div class="flex items-start gap-3 max-w-[85%] message-animation">
                <div class="w-8 h-8 rounded-lg bg-slate-800 border border-slate-700 flex items-center justify-center shrink-0 shadow-sm text-sm">
                    🤖
                </div>
                <div class="flex flex-col gap-1 w-full">
                    <div class="flex items-center gap-2">
                        <span class="text-xs font-semibold text-slate-400">Syid AI</span>
                    </div>
                    <div id="${aiUniqueId}" class="bg-slate-900/90 text-slate-200 rounded-2xl rounded-tl-none px-4 py-3 text-sm border border-slate-800/80 shadow-md leading-relaxed tracking-wide min-h-[40px]">
                    </div>
                </div>
            </div>
        `;
        chatContainer.insertAdjacentHTML('beforeend', aiMessageHtml);
        const targetBubble = document.getElementById(aiUniqueId);
        
        if (data.error) {
            targetBubble.innerHTML = 'Waduh error nih: ' + data.error;
            chatContainer.scrollTop = chatContainer.scrollHeight;
            resetSendButton(); 
            return;
        }

        // =========================================================================
        // PERCABANGAN LOGIKA: JIKA BACKEND MENGEMBALIKAN GAMBAR
        // =========================================================================
        const isResponseImage = data.type === 'image' || data.isImage || (data.result && data.result.startsWith('http') && (data.result.includes('.png') || data.result.includes('.jpg') || data.result.includes('blob') || data.result.includes('data:image')));

        if (isResponseImage) {
            targetBubble.className = "bg-white/10 text-slate-200 rounded-2xl rounded-tl-none p-2 text-sm border border-white/10 shadow-xl max-w-sm overflow-hidden";
            targetBubble.innerHTML = `
                <div class="relative group rounded-xl overflow-hidden shadow-inner bg-slate-950">
                    <img src="${data.result}" alt="AI Generated" class="w-full h-auto object-cover max-h-[350px] transition-transform duration-500 group-hover:scale-105 opacity-0" onload="this.classList.remove('opacity-0'); document.getElementById('chat-container').scrollTop = document.getElementById('chat-container').scrollHeight;">
                    <div class="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex items-end p-3">
                        <a href="${data.result}" target="_blank" download="syid-ai-image.png" class="bg-white/20 backdrop-blur-md border border-white/30 text-white text-xs px-3 py-1.5 rounded-lg font-medium hover:bg-white/40 transition">
                            📥 Buka / Unduh Full
                        </a>
                    </div>
                </div>
                <p class="px-2 pt-2 pb-1 text-xs text-slate-400 italic">Prompt: "${messageText}"</p>
            `;
            
            currentRoom.messages.push({ sender: 'ai', text: data.result, isImage: true, timestamp: 'Just now' });
            saveToLocalStorage();
            renderRecentChats();

            chatContainer.scrollTop = chatContainer.scrollHeight;
            resetSendButton();
            
        } else {
            // =========================================================================
            // JIKA RESPON ADALAH TEKS/KODE BIASA
            // =========================================================================
            targetBubble.classList.add('whitespace-pre-wrap');
            let rawContent = data.result || '';
            let processedHtml = parseAndRenderMath(rawContent);
            let currentTextIndex = 0;
            const typingSpeed = 15; 
            let isAbortedDuringTyping = false;

            chatAbortController.signal.addEventListener('abort', () => {
                isAbortedDuringTyping = true;
            });
            
            function typeWriterEffect() {
                if (isAbortedDuringTyping) {
                    targetBubble.insertAdjacentHTML('beforeend', ' <span class="text-orange-400 text-xs font-semibold block mt-2">⏹️ Generation stopped by user.</span>');
                    
                    currentRoom.messages.push({ sender: 'ai', text: rawContent.substring(0, currentTextIndex) + ' [Generation Stopped]', timestamp: 'Just now' });
                    saveToLocalStorage();
                    renderRecentChats();

                    chatContainer.scrollTop = chatContainer.scrollHeight;
                    resetSendButton();
                    return;
                }

                if (currentTextIndex <= rawContent.length) {
                    let partialText = rawContent.substring(0, currentTextIndex);
                    targetBubble.innerHTML = parseAndRenderMath(partialText);
                    
                    // Highlight secara real-time selagi efek mengetik berjalan dinamis
                    if (window.Prism) Prism.highlightAllUnder(targetBubble);
                    
                    chatContainer.scrollTop = chatContainer.scrollHeight;
                    currentTextIndex += 3; 
                    setTimeout(typeWriterEffect, typingSpeed);
                } else {
                    targetBubble.innerHTML = processedHtml;
                    
                    // Pastikan hasil akhir ter-highlight sempurna setelah selesai mengetik total
                    if (window.Prism) Prism.highlightAllUnder(targetBubble);
                    
                    currentRoom.messages.push({ sender: 'ai', text: rawContent, timestamp: 'Just now' });
                    saveToLocalStorage();
                    renderRecentChats();

                    chatContainer.scrollTop = chatContainer.scrollHeight;
                    resetSendButton();
                }
            }
            typeWriterEffect();
        }

    } catch (error) {
        if (error.name === 'AbortError') {
            if (document.getElementById(loadingId)) document.getElementById(loadingId).remove();
            const aiUniqueId = 'ai-msg-' + Date.now();
            const abortHtml = `
                <div class="flex items-start gap-3 max-w-[85%] message-animation">
                    <div class="w-8 h-8 rounded-lg bg-slate-800 border border-slate-700 flex items-center justify-center shrink-0 shadow-sm text-sm">🤖</div>
                    <div class="flex flex-col gap-1 w-full">
                        <div class="flex items-center gap-2"><span class="text-xs font-semibold text-slate-400">Syid AI</span></div>
                        <div id="${aiUniqueId}" class="bg-slate-900/90 text-slate-200 rounded-2xl rounded-tl-none px-4 py-3 text-sm border border-slate-800/80 shadow-md leading-relaxed"><span class="text-orange-400 text-xs font-semibold">⏹️ Generation stopped by user.</span></div>
                    </div>
                </div>
            `;
            chatContainer.insertAdjacentHTML('beforeend', abortHtml);
            chatContainer.scrollTop = chatContainer.scrollHeight;
        } else {
            console.error(error);
            if (document.getElementById(loadingId)) document.getElementById(loadingId).remove();
            alert("Gagal memproses pesan. Pastikan server backend kamu menyala, bro!");
        }
        resetSendButton();
    }
}

function resetSendButton() {
    chatAbortController = null;
    const sendBtn = document.getElementById('chat-send-button');
    const sendText = document.getElementById('chat-send-text');
    const sendIcon = document.getElementById('chat-send-icon');
    
    if (sendBtn) {
        if (sendText) sendText.innerText = 'Send';
        if (sendIcon) sendIcon.innerText = '🚀';
        sendBtn.className = "h-10 sm:h-14 px-4 sm:px-8 rounded-xl sm:rounded-2xl bg-gradient-to-r from-violet-600 to-fuchsia-500 text-white text-xs sm:text-sm font-semibold shadow-lg hover:scale-105 transition active:scale-95 shrink-0 cursor-pointer flex items-center justify-center gap-1";
    }
}