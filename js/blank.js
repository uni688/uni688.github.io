const CURRENT_MODE = "blank";

// 页面特定元素
const contextBox = document.getElementById('contextBox');
const answerBox = document.getElementById('answerBox');
const submitBtn = document.getElementById('submitBtn');
const hintBtn = document.querySelector('button[onclick="getHint()"]');
const answerBtn = document.getElementById('answerBtn');

// 页面状态
let currentWord = null;
let sentenceText = '';
let hasErrorInCurrentWord = false;
let answerShown = false;

/**
 * Creates the blank input field within the sentence.
 * @param {string} sentence - The full sentence.
 * @param {string} word - The word to be blanked out.
 * @returns {string} - HTML string with an input field.
 */
function createBlankSentenceHTML(sentence, word) {
    const regex = new RegExp(`\\b${word}\\b`, 'gi');
    return sentence.replace(regex, '<input type="text" class="blank-input" id="blankInput" placeholder="click to fill" autocomplete="off">');
}

/**
 * Validates the user's input against the correct word.
 * @param {string} userInput - The user's input.
 * @param {string} correctWord - The correct word.
 * @returns {boolean} - True if the answer is correct.
 */
function validateAnswer(userInput, correctWord) {
    return userInput.toLowerCase().trim() === correctWord.toLowerCase().trim();
}

/**
 * Sets up a new practice session.
 */
async function startNewSession() {
    answerShown = false;
    submitBtn.textContent = 'submit';
    answerBtn.disabled = false;
    answerBox.style.display = 'none';
    answerBox.innerHTML = '';
    hasErrorInCurrentWord = false;

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
        <h3>fill in the blank</h3>
        <div class="skeleton-fade-in">
            <div class="skeleton skeleton-line full"></div>
            <div class="skeleton skeleton-line full"></div>
            <div class="skeleton skeleton-line medium"></div>
        </div>
    `;
    contextBox.style.opacity = '0';
    setTimeout(() => contextBox.style.opacity = '1', 50);

    try {
        sentenceText = await generateBlankSentence(currentWord);
        const blankSentenceHTML = createBlankSentenceHTML(sentenceText, currentWord.word);

        const sentenceArea = contextBox.querySelector('div.skeleton-fade-in');
        if (sentenceArea) {
            sentenceArea.outerHTML = `<p class="blank-sentence">${blankSentenceHTML}</p>`;
        }

        const blankInput = document.getElementById('blankInput');
        if (blankInput) {
            blankInput.focus();
            blankInput.addEventListener('keypress', (event) => {
                if (event.key === 'Enter') {
                    event.preventDefault();
                    checkAnswer();
                }
            });
        }
    } catch (error) {
        contextBox.innerHTML = '<div class="error">生成失败，请刷新页面重试</div>';
    }
}

/**
 * Checks the user's answer.
 */
async function checkAnswer() {
    if (answerShown) {
        await startNewSession();
        return;
    }

    const blankInput = document.getElementById('blankInput');
    const userInput = blankInput.value.trim();
    if (!userInput) {
        showToast('请输入答案', 'info');
        return;
    }

    submitBtn.disabled = true;
    submitBtn.textContent = '验证中...';

    try {
        const isCorrect = validateAnswer(userInput, currentWord.word);

        updateRecords(currentWord.word, isCorrect, CURRENT_MODE);

        if (isCorrect) {
            showToast('回答正确！', 'success');
            await startNewSession();
        } else {
            showToast('回答错误，请再试一次', 'error');
            blankInput.value = '';
            blankInput.focus();
        }
    } catch (error) {
        showToast('验证过程中发生错误', 'error');
    } finally {
        submitBtn.disabled = false;
        submitBtn.textContent = 'submit';
    }
}

/**
 * Fetches and displays a hint.
 */
async function getHint() {
    hintBtn.disabled = true;
    hintBtn.textContent = '获取中...';
    try {
        const hintText = await getApiHint(currentWord);
        showToast(hintText, 'info', 10000);
    } catch (error) {
        showToast('获取提示失败，请检查网络连接', 'error');
    } finally {
        hintBtn.disabled = false;
        hintBtn.textContent = 'hint';
    }
}

/**
 * Displays the correct answer.
 */
function showAnswer() {
    answerShown = true;
    answerBox.style.display = 'block';
    answerBox.style.opacity = '0';
    answerBox.innerHTML = `
        <div class="answer-card">
            <h4>answer</h4>
            <p>answer：<strong>${currentWord.word}</strong></p>
            <p>chinese translation：<span style="color: #10b981; font-weight: 600;">${currentWord.translations.join(' / ')}</span></p>
        </div>
    `;
    setTimeout(() => answerBox.style.opacity = '1', 50);

    answerBtn.disabled = true;
    submitBtn.textContent = 'next';
    showToast('已显示答案，点击 next 进入下一题', 'info');
}

// 初始加载
document.addEventListener('DOMContentLoaded', () => {
    initializeStorage();
    startNewSession();
});
