const CURRENT_MODE = "context";

// Page-specific elements
const contextBox = document.getElementById('contextBox');
const answerBox = document.getElementById('answerBox');
const translationInput = document.getElementById('translationInput');
const submitBtn = document.getElementById('submitBtn');
const hintBtn = document.getElementById('hintBtn');
const answerBtn = document.getElementById('answerBtn');
const practiceCountEl = document.getElementById('practiceCount');
const accuracyEl = document.getElementById('accuracy');

// Page state
let currentWord = null;
let contextText = '';
let hasErrorInCurrentWord = false;
let answerShown = false;

/**
 * Updates the statistics display on the page for the current mode.
 */
function updateStats() {
    const records = JSON.parse(localStorage.getItem('practiceRecords') || '[]');
    const modeRecords = records.filter(r => r.mode === CURRENT_MODE);
    const total = modeRecords.length;
    const correct = modeRecords.filter(r => r.correct).length;

    // These elements might not exist if the user hasn't added them to the HTML
    if (practiceCountEl) {
        practiceCountEl.textContent = total;
    }
    if (accuracyEl) {
        accuracyEl.textContent = total ? `${Math.round((correct / total) * 100)}%` : '100%';
    }
}

/**
 * Sets up a new practice session.
 */
async function startNewSession() {
    translationInput.value = '';
    answerBox.innerHTML = '';
    answerBox.style.display = 'none';
    submitBtn.textContent = 'Submit';
    submitBtn.disabled = false;
    answerBtn.disabled = false;
    hasErrorInCurrentWord = false;
    answerShown = false;

    showSkeleton(contextBox);
    currentWord = getWeightedWord(CURRENT_MODE);

    if (!currentWord) {
        contextBox.innerHTML = '<div class="error">词库为空，请先在管理页面添加单词。</div>';
        submitBtn.disabled = true;
        hintBtn.disabled = true;
        answerBtn.disabled = true;
        return;
    }

    contextBox.innerHTML = `
    <h3>Contextual Situation</h3>
    <div class="skeleton-fade-in">
        <div class="skeleton skeleton-line full"></div>
        <div class="skeleton skeleton-line full"></div>
        <div class="skeleton skeleton-line medium"></div>
    </div>
    <p style="margin-top: 1rem;"><strong>Target Word: ${currentWord.word}</strong></p>
`;
    contextBox.style.opacity = '0';
    setTimeout(() => contextBox.style.opacity = '1', 50);

    try {
        contextText = await generateContext(currentWord);
        const contextPara = contextBox.querySelector('div.skeleton-fade-in');
        if (contextPara) {
            // Highlight target word occurrences in the displayed paragraph (case-insensitive)
            const re = new RegExp(`\\b${currentWord.word}\\b`, 'gi');
            const highlighted = contextText.replace(re, match => `<mark class="highlight">${match}</mark>`);
            contextPara.outerHTML = `<p>${highlighted}</p>`;
        }
    } catch (error) {
        contextBox.innerHTML = '<div class="error">情境生成失败，请刷新页面重试</div>';
    } finally {
        translationInput.focus();
    }
}

/**
 * Checks the user's submitted translation.
 */
async function checkTranslation() {
    // If answer was shown, clicking submit goes to next question
    if (answerShown) {
        await startNewSession();
        return;
    }

    const userInput = translationInput.value.trim();
    if (!userInput) return;

    submitBtn.disabled = true;
    submitBtn.textContent = '验证中...';

    try {
        // First, check against the stored correct translations
        let isCorrect = currentWord.translations.some(t => userInput.includes(t));

        // If not found, use the API for a more lenient check
        if (!isCorrect) {
            isCorrect = await validateTranslation(currentWord, userInput, contextText);
        }

        // Update word stats in localStorage
        const wordBank = JSON.parse(localStorage.getItem('wordBank'));
        const wordIndex = wordBank.findIndex(w => w.word === currentWord.word);
        if (wordIndex !== -1) {
            const modeData = getWordModeData(wordBank[wordIndex], CURRENT_MODE);
            modeData.practiceCount++;
            if (!isCorrect && !hasErrorInCurrentWord) {
                modeData.errors++;
                hasErrorInCurrentWord = true; // Mark that an error has occurred for this word
            }
            wordBank[wordIndex].modes[CURRENT_MODE] = modeData;
            localStorage.setItem('wordBank', JSON.stringify(wordBank));
        }

        updateRecords(currentWord.word, isCorrect, CURRENT_MODE);
        updateStats(); // Update stats display

        if (isCorrect) {
            showToast('回答正确！', 'success');
            await startNewSession();
        } else {
            showToast('回答错误，请再试一次', 'error');
        }
    } catch (error) {
        showToast('验证过程中发生错误', 'error');
    } finally {
        submitBtn.disabled = false;
        submitBtn.textContent = 'Submit';
        // Do not clear input on wrong answer to allow for correction
        if (isCorrect) {
            translationInput.value = '';
        }
        translationInput.focus();
    }
}

/**
 * Fetches and displays a hint.
 */
async function getHint() {
    hintBtn.disabled = true;
    hintBtn.textContent = '获取中...';
    try {
        const hintText = await getApiHint(currentWord, contextText);
        showToast(hintText, 'info', 5000);
    } catch (error) {
        showToast('获取提示失败，请检查网络连接', 'error');
    } finally {
        hintBtn.disabled = false;
        hintBtn.textContent = 'Hint';
    }
}

/**
 * Displays the correct answer.
 */
function showAnswer() {
    answerShown = true;

    // Record this as an error since the user gave up
    const wordBank = JSON.parse(localStorage.getItem('wordBank'));
    const wordIndex = wordBank.findIndex(w => w.word === currentWord.word);
    if (wordIndex !== -1) {
        const modeData = getWordModeData(wordBank[wordIndex], CURRENT_MODE);
        modeData.practiceCount++;
        if (!hasErrorInCurrentWord) {
            modeData.errors++;
            hasErrorInCurrentWord = true;
        }
        wordBank[wordIndex].modes[CURRENT_MODE] = modeData;
        localStorage.setItem('wordBank', JSON.stringify(wordBank));
    }

    // Record as incorrect in practice records
    updateRecords(currentWord.word, false, CURRENT_MODE);
    updateStats();

    answerBox.style.display = 'block';
    answerBox.style.opacity = '0';
    answerBox.innerHTML = `
    <div class="answer-card">
        <h4>正确答案</h4>
        <p>单词：<strong>${currentWord.word}</strong></p>
        <p>中文翻译：<span style="color: #10b981; font-weight: 600;">${currentWord.translations.join(' / ')}</span></p>
    </div>
`;
    setTimeout(() => answerBox.style.opacity = '1', 50);

    answerBtn.disabled = true;
    submitBtn.textContent = 'Next';
    showToast('已显示答案，点击 Next 进入下一题', 'info');
}

// Event Listeners
translationInput.addEventListener('keypress', (event) => {
    if (event.key === 'Enter') {
        event.preventDefault();
        checkTranslation();
    }
});

document.addEventListener('DOMContentLoaded', () => {
    initializeStorage();
    updateStats();
    startNewSession();
});