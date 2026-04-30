// ═══════════════════════════════════════
// RÉFÉRENCES DOM
// ═══════════════════════════════════════
const userRequestTextarea = document.getElementById('user-request');
const analyzeBtn = document.getElementById('analyze-btn');
const stepRequest = document.getElementById('step-request');
const stepQuestions = document.getElementById('step-questions');
const understoodBox = document.getElementById('understood-box');
const questionsForm = document.getElementById('questions-form');
const backBtn = document.getElementById('back-btn');
const generateBtn = document.getElementById('generate-btn');
const loadingDiv = document.getElementById('loading');
const loadingText = document.getElementById('loading-text');
const resultArea = document.getElementById('result-area');
const resultContent = document.getElementById('result-content');
const copyBtn = document.getElementById('copy-btn');
const newPromptBtn = document.getElementById('new-prompt-btn');
const historyToggleBtn = document.getElementById('history-toggle-btn');
const historyBadge = document.getElementById('history-badge');
const historyPanel = document.getElementById('history-panel');
const historyList = document.getElementById('history-list');
const historyCloseBtn = document.getElementById('history-close-btn');
const ctaStartBtn = document.getElementById('cta-start');
const navBurger = document.getElementById('nav-burger');
const navOverlay = document.getElementById('nav-overlay');
const navLinks = document.querySelector('.nav-links');

// ═══════════════════════════════════════
// STATE
// ═══════════════════════════════════════
let sessionHistory = [];
let sessionPrompts = [];
let currentRequest = '';
let currentUnderstood = '';
let currentQuestions = [];
let selectedAIType = 'chatgpt';

// ═══════════════════════════════════════
// CHIPS IA
// ═══════════════════════════════════════
document.querySelectorAll('.chip').forEach(chip => {
    chip.addEventListener('click', () => {
        document.querySelectorAll('.chip').forEach(c => c.classList.remove('active'));
        chip.classList.add('active');
        selectedAIType = chip.dataset.type;
    });
});

// ═══════════════════════════════════════
// CTA → focus widget
// ═══════════════════════════════════════
const ctaTryBtn = document.getElementById('cta-try');

ctaStartBtn.addEventListener('click', () => {
    userRequestTextarea.scrollIntoView({ behavior: 'smooth', block: 'center' });
    setTimeout(() => userRequestTextarea.focus(), 400);
});

ctaTryBtn.addEventListener('click', () => {
    userRequestTextarea.scrollIntoView({ behavior: 'smooth', block: 'center' });
    setTimeout(() => userRequestTextarea.focus(), 400);
});

// ═══════════════════════════════════════
// NAV MOBILE
// ═══════════════════════════════════════
function toggleMobileNav() {
    navLinks.classList.toggle('open');
    navBurger.classList.toggle('open');
    navOverlay.classList.toggle('active');
    document.body.classList.toggle('nav-open');
}

function closeMobileNav() {
    navLinks.classList.remove('open');
    navBurger.classList.remove('open');
    navOverlay.classList.remove('active');
    document.body.classList.remove('nav-open');
}

navBurger.addEventListener('click', toggleMobileNav);
navOverlay.addEventListener('click', closeMobileNav);

navLinks.querySelectorAll('a').forEach(link => {
    link.addEventListener('click', closeMobileNav);
});

// ═══════════════════════════════════════
// HELPERS UI
// ═══════════════════════════════════════
function showLoading(text) {
    loadingText.textContent = text;
    loadingDiv.style.display = 'flex';
}

function hideLoading() {
    loadingDiv.style.display = 'none';
}

function showError(msg) {
    const existing = document.getElementById('error-msg');
    if (existing) existing.remove();
    const err = document.createElement('div');
    err.id = 'error-msg';
    err.className = 'error-msg';
    err.textContent = msg;
    document.querySelector('.widget-body').appendChild(err);
    setTimeout(() => { if (err.parentNode) err.remove(); }, 6000);
}

function updateHistoryBar() {
    const count = sessionPrompts.length;
    if (count > 0) {
        historyToggleBtn.style.display = 'inline-flex';
        historyBadge.textContent = count;
    }
}

function renderHistoryPanel() {
    historyList.innerHTML = '';
    if (sessionPrompts.length === 0) {
        historyList.innerHTML = '<p class="history-empty">Aucun prompt généré pour le moment.</p>';
        return;
    }
    [...sessionPrompts].reverse().forEach((entry, idx) => {
        const realIdx = sessionPrompts.length - 1 - idx;
        const item = document.createElement('div');
        item.className = 'history-item';
        item.innerHTML = `
            <div class="history-item-meta">
                <span class="history-item-num">#${realIdx + 1}</span>
                <span class="history-item-date">${entry.date}</span>
            </div>
            <div class="history-item-request">💬 ${entry.request}</div>
            <div class="history-item-prompt">${entry.prompt}</div>
            <button class="btn-copy history-copy-btn" data-idx="${realIdx}">Copier ce prompt</button>
        `;
        historyList.appendChild(item);
    });

    historyList.querySelectorAll('.history-copy-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            const i = parseInt(btn.dataset.idx);
            navigator.clipboard.writeText(sessionPrompts[i].prompt).then(() => {
                btn.textContent = '✓ Copié !';
                setTimeout(() => { btn.textContent = 'Copier ce prompt'; }, 2000);
            });
        });
    });
}

historyToggleBtn.addEventListener('click', () => {
    renderHistoryPanel();
    historyPanel.style.display = historyPanel.style.display === 'none' ? 'block' : 'none';
});

historyCloseBtn.addEventListener('click', () => {
    historyPanel.style.display = 'none';
});

function resetToStart() {
    userRequestTextarea.value = '';
    stepRequest.style.display = 'block';
    stepQuestions.style.display = 'none';
    resultArea.style.display = 'none';
    currentRequest = '';
    currentUnderstood = '';
    currentQuestions = [];
    userRequestTextarea.focus();
}

// ═══════════════════════════════════════
// ÉTAPE 1 : Analyser la demande
// ═══════════════════════════════════════
analyzeBtn.addEventListener('click', async () => {
    const request = userRequestTextarea.value.trim();
    if (!request) {
        userRequestTextarea.style.borderColor = '#EF4444';
        userRequestTextarea.focus();
        setTimeout(() => { userRequestTextarea.style.borderColor = ''; }, 1500);
        return;
    }

    currentRequest = request;
    analyzeBtn.disabled = true;
    showLoading('Analyse de ta demande...');

    try {
        const response = await fetch('http://localhost:3000/api/analyze', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ request, aiType: selectedAIType, history: sessionHistory })
        });

        if (!response.ok) throw new Error('Erreur serveur');

        const data = await response.json();
        currentUnderstood = data.understood;
        currentQuestions = data.questions || [];

        hideLoading();

        understoodBox.innerHTML = `<strong>💡 Compris :</strong> ${data.understood}`;

        questionsForm.innerHTML = '';
        if (data.needsQuestions && currentQuestions.length > 0) {
            const title = document.createElement('p');
            title.className = 'questions-title';
            title.textContent = 'Quelques précisions pour maximiser la qualité du prompt :';
            questionsForm.appendChild(title);

            currentQuestions.forEach(q => {
                const group = document.createElement('div');
                group.className = 'input-group';
                group.innerHTML = `
                    <label for="${q.id}">${q.text}</label>
                    <input type="text" id="${q.id}" class="question-input" placeholder="Ta réponse...">
                `;
                questionsForm.appendChild(group);
            });
        } else {
            const skipMsg = document.createElement('p');
            skipMsg.className = 'no-questions-msg';
            skipMsg.textContent = '✨ Ta demande est suffisamment claire — génération directe du prompt.';
            questionsForm.appendChild(skipMsg);
        }

        stepRequest.style.display = 'none';
        resultArea.style.display = 'none';
        stepQuestions.style.display = 'block';

    } catch (error) {
        console.error(error);
        hideLoading();
        showError('Impossible de se connecter au serveur. Vérifie que Node.js est lancé sur le port 3000.');
    } finally {
        analyzeBtn.disabled = false;
    }
});

// ═══════════════════════════════════════
// BOUTON RETOUR
// ═══════════════════════════════════════
backBtn.addEventListener('click', () => {
    stepQuestions.style.display = 'none';
    stepRequest.style.display = 'block';
    resultArea.style.display = 'none';
    currentQuestions = [];
    currentUnderstood = '';
});

// ═══════════════════════════════════════
// ÉTAPE 2 : Générer le prompt final
// ═══════════════════════════════════════
generateBtn.addEventListener('click', async () => {
    const answers = {};
    document.querySelectorAll('.question-input').forEach(input => {
        const label = input.previousElementSibling.textContent;
        if (input.value.trim()) {
            answers[label] = input.value.trim();
        }
    });

    generateBtn.disabled = true;
    backBtn.disabled = true;
    showLoading('Génération du prompt optimisé...');
    stepQuestions.style.display = 'none';

    try {
        const response = await fetch('http://localhost:3000/api/generate-prompt', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                request: currentRequest,
                understood: currentUnderstood,
                aiType: selectedAIType,
                answers,
                history: sessionHistory
            })
        });

        if (!response.ok) throw new Error('Erreur serveur');

        const data = await response.json();
        hideLoading();

        sessionHistory.push(currentRequest);
        sessionPrompts.push({
            request: currentRequest,
            prompt: data.prompt,
            date: new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })
        });
        updateHistoryBar();
        if (historyPanel.style.display === 'block') renderHistoryPanel();

        resultContent.textContent = data.prompt;
        copyBtn.textContent = '📋 Copier';
        resultArea.style.display = 'block';

    } catch (error) {
        console.error(error);
        hideLoading();
        stepQuestions.style.display = 'block';
        showError('Une erreur est survenue lors de la génération. Réessaie.');
    } finally {
        generateBtn.disabled = false;
        backBtn.disabled = false;
    }
});

// ═══════════════════════════════════════
// COPIER LE PROMPT
// ═══════════════════════════════════════
copyBtn.addEventListener('click', () => {
    const text = resultContent.textContent;
    navigator.clipboard.writeText(text).then(() => {
        copyBtn.textContent = '✓ Copié !';
        setTimeout(() => { copyBtn.textContent = '📋 Copier'; }, 2000);
    }).catch(() => {
        showError('Impossible d\'accéder au presse-papiers.');
    });
});

// ═══════════════════════════════════════
// NOUVEAU PROMPT
// ═══════════════════════════════════════
newPromptBtn.addEventListener('click', resetToStart);
