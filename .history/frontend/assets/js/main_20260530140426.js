const BACKEND_URL = 'http://localhost:3000/api/ai';

// Variabel global untuk menampung file yang sedang dipilih user
let selectedFileBase64 = null;
let selectedFileMimeType = null;
let selectedFileName = null;

// Variabel global untuk mengontrol pembatalan chat (Stop Generating)
let chatAbortController = null;

// =========================================================================
// FUNGSI SAKTI: Custom Parser Matematika & Markdown Bold untuk KaTeX
// =========================================================================
function parseAndRenderMath(text) {
    if (!window.katex) return text;

    // 1. Handle Display Math ($$.$$) terlebih dahulu agar karakter di dalam rumus aman
    text = text.replace(/\$\$\s*([\s\S]*?)\s*\$\$/g, (match, mathExpression) => {
        try {
            return `<div class="my-3 flex justify-center text-center overflow-x-auto">${katex.renderToString(mathExpression, { displayMode: true, throwOnError: false })}</div>`;
        } catch (e) {
            return match;
        }
    });

    // 2. Handle Inline Math ($.$) yang suka menempel ke huruf/tanda baca lain
    text = text.replace(/\$([\s\S]*?)\$/g, (match, mathExpression) => {
        if (!mathExpression.trim()) return match;
        try {
            return `<span class="inline-math px-0.5 font-sans">${katex.renderToString(mathExpression, { displayMode: false, throwOnError: false })}</span>`;
        } catch (e) {
            return match;
        }
    });

    // 3. Render Format Tiga Bintang (Bold + Italic) ***teks***
    text = text.replace(/\*\*\*(.*?)\*\*\*/g, '<strong><em>$1</em></strong>');

    // 4. Render Format Markdown Tebal (Bold) **teks**
    text = text.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');

    // 5. Render Format Markdown Miring (Italic) *teks*
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
    
    // Deteksi cerdas: Kalau user ketik "gambar" atau "bikin", teks loading-nya disesuaikan biar keren
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
        // [FITUR BARU] PERCABANGAN LOGIKA: JIKA BACKEND MENGEMBALIKAN GAMBAR
        // =========================================================================
        if (data.type === 'image' || data.isImage || (data.result && data.result.startsWith('http') && (data.result.includes('.png') || data.result.includes('.jpg') || data.result.includes('blob') || data.result.includes('data:image')))) {
            
            // Render Gambar dengan bingkai kaca estetik + Tombol Download
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
            
            chatContainer.scrollTop = chatContainer.scrollHeight;
            resetSendButton();
            
        } else {
            // =========================================================================
            // JIKA RESPON ADALAH TEKS BIASA (Gunakan Efek Mengetik Lamamu)
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
                    chatContainer.scrollTop = chatContainer.scrollHeight;
                    resetSendButton();
                    return;
                }

                if (currentTextIndex <= rawContent.length) {
                    let partialText = rawContent.substring(0, currentTextIndex);
                    targetBubble.innerHTML = parseAndRenderMath(partialText);
                    chatContainer.scrollTop = chatContainer.scrollHeight;
                    
                    currentTextIndex += 3; 
                    setTimeout(typeWriterEffect, typingSpeed);
                } else {
                    targetBubble.innerHTML = processedHtml;
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