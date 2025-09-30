const CURRENT_MODE = "blank";

// 页面特定元素
const contextBox = document.getElementById('contextBox');
const answerBox = document.getElementById('answerBox');
const submitBtn = document.getElementById('submitBtn');
const hintBtn = document.querySelector('button[onclick="getHint()"]');
const answerBtn = document.getElementById('answerBtn');
const hintPanelContainer = document.getElementById('hintPanelContainer');

// 页面状态
let currentWord = null;
let sentenceText = '';
let hasErrorInCurrentWord = false;
let answerShown = false;

/**
 * 在句子中创建空白输入框。
 * @param {string} sentence - 完整的句子。
 * @param {string} word - 要留空的单词。
 * @returns {string} - 包含输入框的HTML字符串。
 */
function createBlankSentenceHTML(sentence, word) {
    // 使用正则表达式匹配完整单词并替换为输入框
    const regex = new RegExp(`\\b${word}\\b`, 'gi');
    return sentence.replace(regex, '<input type="text" class="blank-input" id="blankInput" placeholder="click to fill" autocomplete="off">');
}

/**
 * 验证用户输入是否与正确答案匹配。
 * @param {string} userInput - 用户的输入。
 * @param {string} correctWord - 正确的单词。
 * @returns {boolean} - 如果答案正确则返回true。
 */
function validateAnswer(userInput, correctWord) {
    // 忽略大小写和首尾空格进行比较
    return userInput.toLowerCase().trim() === correctWord.toLowerCase().trim();
}

/**
 * 设置新的练习会话。
 */
async function startNewSession() {
    // 重置会话状态
    answerShown = false;
    submitBtn.textContent = 'Submit';
    answerBtn.disabled = false;
    answerBox.style.display = 'none';
    answerBox.innerHTML = '';
    hasErrorInCurrentWord = false;

    // 初始化并清空提示面板（这里inputEl将在生成填空句子后设置）
    initHintPanel(hintPanelContainer, null);
    clearHints();

    // 显示加载骨架屏
    showSkeleton(contextBox);

    // 获取权重随机选择的单词
    currentWord = getWeightedWord(CURRENT_MODE);

    // 处理无可用单词的情况
    if (!currentWord) {
        const vocabularies = JSON.parse(localStorage.getItem('vocabularies') || '[]');
        const enabledVocabs = vocabularies.filter(v => v.enabled !== false);
        const hasWords = JSON.parse(localStorage.getItem('wordBank') || '[]').length > 0;

        // 根据不同情况显示相应错误信息
        let errorMessage;
        if (!hasWords) {
            errorMessage = '词库为空，请先在管理页面添加单词。';
        } else if (enabledVocabs.length === 0) {
            errorMessage = '所有词库都已被禁用，请在管理页面启用至少一个词库。';
        } else {
            errorMessage = '启用的词库中没有可用单词，请检查词库设置。';
        }

        // 显示错误信息并禁用相关按钮
        contextBox.innerHTML = `<div class="error">${errorMessage}</div>`;
        submitBtn.disabled = true;
        hintBtn.disabled = true;
        answerBtn.disabled = true;
        return;
    }

    // 显示加载界面
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
        // 调用API生成包含当前单词的句子
        sentenceText = await generateBlankSentence(currentWord);

        // 将目标单词替换为输入框
        const blankSentenceHTML = createBlankSentenceHTML(sentenceText, currentWord.word);

        // 替换骨架屏为实际内容
        const sentenceArea = contextBox.querySelector('div.skeleton-fade-in');
        if (sentenceArea) {
            sentenceArea.outerHTML = `<p class="blank-sentence">${blankSentenceHTML}</p>`;
        }

        // 为输入框绑定事件监听器
        const blankInput = document.getElementById('blankInput');
        if (blankInput) {
            blankInput.focus(); // 自动聚焦到输入框

            // 更新提示面板的输入框引用
            HintPanelManager.inputElement = blankInput;

            // 绑定回车键提交事件
            blankInput.addEventListener('keypress', (event) => {
                if (event.key === 'Enter') {
                    event.preventDefault();
                    checkAnswer();
                }
            });
        }
    } catch (error) {
        contextBox.innerHTML = `
            <div class="error">
                生成失败，请重试
                <br>
                <button class="error-refresh-btn" onclick="startNewSession()">🔄 重新生成</button>
            </div>
        `;
    }
}

/**
 * 检查用户的答案。
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
    submitBtn.textContent = 'Submitting...';

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
        submitBtn.textContent = 'Submit';
    }
}

/**
 * 获取并显示提示。
 */
async function getHint() {
    hintBtn.disabled = true;
    hintBtn.textContent = 'Hinting...';

    try {
        // 生成渐进式提示 - blank模式专注于拼写和词形提示
        const progressiveHint = HintPanelManager.generateHint(
            currentWord.word,
            currentWord,
            sentenceText,
            CURRENT_MODE  // 传入模式参数，确保使用Blank模式的拼写提示策略
        );

        if (progressiveHint.isLocal) {
            // 本地提示，直接添加
            HintPanelManager.pushHint(progressiveHint.level, progressiveHint.text);
        } else {
            // AI提示，根据类型异步获取
            const aiType = progressiveHint.aiType || 'complex';
            await HintPanelManager.pushAiHint(
                currentWord,
                sentenceText, // blank模式使用句子作为上下文
                aiType, // AI提示类型：complex、simple、synonyms
                null, // 成功回调
                (error) => {
                    showToast('获取AI提示失败，请检查网络连接。错误提示：' + error, 'error');
                }
            );
        }

    } catch (error) {
        console.error('生成提示失败:', error);
        showToast('生成提示失败', 'error');
    } finally {
        hintBtn.disabled = false;
        hintBtn.textContent = 'Hint';
    }
}

/**
 * 显示正确答案。
 */
function showAnswer() {
    answerShown = true;
    answerBox.style.display = 'block';
    answerBox.style.opacity = '0';
    answerBox.innerHTML = `
        <div class="answer-card">
            <h4>答案</h4>
            <p>正确答案：<strong>${currentWord.word}</strong></p>
            <p>中文翻译：<span style="color: #10b981; font-weight: 600;">${currentWord.translations.join(' / ')}</span></p>
        </div>
    `;
    setTimeout(() => answerBox.style.opacity = '1', 50);

    answerBtn.disabled = true;
    submitBtn.textContent = 'Next';
    showToast('已显示答案，点击 Next 进入下一题', 'info');
}

// 初始加载
document.addEventListener('DOMContentLoaded', () => {
    initializeStorage();
    startNewSession();
});
