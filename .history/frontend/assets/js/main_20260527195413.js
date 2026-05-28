// URL Backend Express kita
const BACKEND_URL = 'http://localhost:3000/api/ai';

// 1. Logika untuk Berpindah Tab Menu
function switchTab(tabId) {
    // Sembunyikan semua konten tab
    document.querySelectorAll('.tab-content').forEach(tab => tab.classList.add('hidden'));
    
    // Tampilkan tab yang dipilih
    document.getElementById(`tab-${tabId}`).classList.remove('hidden');

    // Reset semua style tombol navigasi menjadi tidak aktif
    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.classList.remove('bg-blue-600', 'text-white');
        btn.classList.add('text-slate-400', 'hover:bg-slate-900', 'hover:text-slate-200');
    });

    // Beri style aktif pada tombol yang sedang diklik
    const activeBtn = document.getElementById(`btn-${tabId}`);
    activeBtn.classList.remove('text-slate-400', 'hover:bg-slate-900');
    activeBtn.classList.add('bg-blue-600', 'text-white');
}

// 2. Logika Mengirim Data Fitur Text Enhancer ke Backend
async function processText() {
    const textInput = document.getElementById('text-input').value;
    const modeSelect = document.getElementById('text-mode').value;
    const outputDiv = document.getElementById('text-output');

    if (!textInput.trim()) {
        alert("Masukkan teks terlebih dahulu, bro!");
        return;
    }

    outputDiv.innerText = "Sedang memikirkan jawaban... 🤔⏳";

    try {
        const response = await fetch(`${BACKEND_URL}/text-enhancer`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ text: textInput, mode: modeSelect })
        });

        const data = await response.json();
        
        if (data.error) {
            outputDiv.innerText = `Error: ${data.error}`;
        } else {
            outputDiv.innerText = data.result;
        }
    } catch (error) {
        console.error(error);
        outputDiv.innerText = "Gagal terhubung ke backend server. Pastikan backend sudah menyala!";
    }
}

// 3. Logika Mengirim Data Fitur Code Fixer ke Backend
async function processCode() {
    const codeInput = document.getElementById('code-input').value;
    const outputDiv = document.getElementById('code-output');

    if (!codeInput.trim()) {
        alert("Tempel kodinganmu yang bermasalah dulu, bro!");
        return;
    }

    outputDiv.innerText = "AI sedang membaca kodinganmu... 🔍💻";

    try {
        const response = await fetch(`${BACKEND_URL}/code-fixer`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ code: codeInput })
        });

        const data = await response.json();

        if (data.error) {
            outputDiv.innerText = `Error: ${data.error}`;
        } else {
            outputDiv.innerText = data.result;
        }
    } catch (error) {
        console.error(error);
        outputDiv.innerText = "Gagal terhubung ke server. Periksa terminal backend kamu!";
    }
}