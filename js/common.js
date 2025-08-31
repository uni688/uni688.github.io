// =================================================================
// Local Storage Management
// =================================================================

/**
 * Initializes localStorage with default values if they don't exist.
 * This includes supported modes, word bank, and practice records.
 */
function initializeStorage() {
    // Initialize the list of supported modes if it doesn't exist.
    if (!localStorage.getItem('supportedModes')) {
        const defaultModes = [
            { id: 'context', name: '上下文猜词', active: true },
            { id: 'blank', name: '填空练习', active: true }
        ];
        localStorage.setItem('supportedModes', JSON.stringify(defaultModes));
    } else {
        // Ensure 'blank' mode exists for backward compatibility.
        const modes = JSON.parse(localStorage.getItem('supportedModes'));
        if (!modes.some(mode => mode.id === 'blank')) {
            modes.push({ id: 'blank', name: '填空练习', active: true });
            localStorage.setItem('supportedModes', JSON.stringify(modes));
        }
    }

    // Initialize the word bank with default words if it doesn't exist.
    if (!localStorage.getItem('wordBank')) {
        const defaultWords = [
            { word: 'vivid', translations: ['生动的'], modes: { context: { errors: 0, practiceCount: 0 }, blank: { errors: 0, practiceCount: 0 } } },
            { word: 'ambiguous', translations: ['模糊的'], modes: { context: { errors: 0, practiceCount: 0 }, blank: { errors: 0, practiceCount: 0 } } },
            { word: 'profound', translations: ['深刻的'], modes: { context: { errors: 0, practiceCount: 0 }, blank: { errors: 0, practiceCount: 0 } } }
        ];
        localStorage.setItem('wordBank', JSON.stringify(defaultWords));
    } else {
        // Migrate old data format if necessary.
        migrateWordData();
    }

    // Initialize practice records if it doesn't exist.
    if (!localStorage.getItem('practiceRecords')) {
        localStorage.setItem('practiceRecords', JSON.stringify([]));
    }
}

/**
 * Migrates old word data structure to the new format which includes 'modes'.
 */
function migrateWordData() {
    try {
        const wordBank = JSON.parse(localStorage.getItem('wordBank') || '[]');
        const needsMigration = wordBank.some(word => !word.modes);

        if (needsMigration) {
            const migratedWordBank = wordBank.map(word => {
                if (word.modes) return word; // Already in new format

                // Create new structure
                const newWord = {
                    ...word,
                    modes: {
                        context: {
                            errors: word.errors || 0,
                            practiceCount: word.practiceCount || 0
                        },
                        blank: { errors: 0, practiceCount: 0 }
                    }
                };
                // Delete old properties
                delete newWord.errors;
                delete newWord.practiceCount;
                return newWord;
            });

            localStorage.setItem('wordBank', JSON.stringify(migratedWordBank));
            console.log('Word data has been migrated to the new format.');
        }
    } catch (error) {
        console.error('Error migrating word data:', error);
    }
}


// =================================================================
// Data Access & Utility Functions
// =================================================================

/**
 * Retrieves information about a specific learning mode.
 * @param {string} modeId - The ID of the mode (e.g., 'context', 'blank').
 * @returns {Object} - The mode object with its details.
 */
function getModeInfo(modeId) {
    const supportedModes = JSON.parse(localStorage.getItem('supportedModes') || '[]');
    return supportedModes.find(mode => mode.id === modeId) || { id: modeId, name: modeId, active: false };
}

/**
 * Retrieves the practice data for a specific mode from a word object.
 * @param {Object} word - The word object from the word bank.
 * @param {string} mode - The ID of the mode.
 * @returns {{errors: number, practiceCount: number}} - The mode-specific data.
 */
function getWordModeData(word, mode) {
    if (!word.modes || !word.modes[mode]) {
        return { errors: 0, practiceCount: 0 };
    }
    return word.modes[mode];
}

/**
 * Selects a word from the word bank using a weighted random algorithm.
 * The algorithm prioritizes words that are new, have a high error rate, or haven't been practiced recently.
 * @param {string} currentMode - The learning mode to calculate weights for.
 * @returns {Object|null} - The selected word object or null if the bank is empty.
 */
function getWeightedWord(currentMode) {
    const words = JSON.parse(localStorage.getItem('wordBank') || '[]');
    if (!words || words.length === 0) return null;

    const records = JSON.parse(localStorage.getItem('practiceRecords') || '[]');
    const modeRecords = records.filter(record => record.mode === currentMode);
    const lastPracticeTime = {};
    modeRecords.forEach(record => {
        if (record.word) {
            lastPracticeTime[record.word] = Math.max(new Date(record.date).getTime(), lastPracticeTime[record.word] || 0);
        }
    });

    const currentTime = new Date().getTime();
    const dayInMs = 24 * 60 * 60 * 1000;

    const weightedList = words.map(word => {
        const modeData = getWordModeData(word, currentMode);

        // 1. Practice Count Weight: Fewer practices -> higher weight.
        const practiceWeight = Math.pow(0.85, modeData.practiceCount || 0);

        // 2. Error Rate Weight: Higher error rate -> higher weight.
        const errorRate = (modeData.practiceCount > 0) ? (modeData.errors / modeData.practiceCount) : 0;
        const errorWeight = 1 + (errorRate * 2);

        // 3. Time Since Last Practice Weight: Longer time -> higher weight.
        const lastPractice = lastPracticeTime[word.word] || 0;
        const daysSince = lastPractice ? (currentTime - lastPractice) / dayInMs : 7; // Default to 7 days for new words.
        const timeWeight = Math.min(2, 1 + (daysSince / 7)); // Max weight is 2.

        // 4. Favorite Weight: Favorited words get a boost.
        const favoriteWeight = word.favorite ? 1.5 : 1;

        // 5. Base Weight: Ensures every word has a chance.
        const baseWeight = 0.3;

        const finalWeight = (baseWeight + (practiceWeight * errorWeight * timeWeight)) * favoriteWeight;

        return { ...word, weight: finalWeight };
    });

    const totalWeight = weightedList.reduce((sum, w) => sum + w.weight, 0);
    let random = Math.random() * totalWeight;

    for (const word of weightedList) {
        random -= word.weight;
        if (random < 0) return word;
    }

    return weightedList[0]; // Fallback
}

/**
 * Adds a new practice record to localStorage.
 * @param {string} word - The word that was practiced.
 * @param {boolean} isCorrect - Whether the answer was correct.
 * @param {string} mode - The learning mode.
 */
function updateRecords(word, isCorrect, mode) {
    const records = JSON.parse(localStorage.getItem('practiceRecords'));
    records.push({
        date: new Date().toISOString(),
        correct: isCorrect,
        word: word,
        mode: mode
    });
    localStorage.setItem('practiceRecords', JSON.stringify(records));
}

/**
 * Calculates the weight of a word for weighted random selection.
 * @param {object} word - The word object.
 * @param {string} mode - The current practice mode.
 * @param {Array} practiceRecords - All practice records.
 * @returns {number} - The calculated weight.
 */
function calculateWordWeight(word, mode, practiceRecords) {
    const modeData = getWordModeData(word, mode);
    const now = new Date().getTime();

    // Find the last practice time for this specific word and mode
    const lastPracticeRecord = practiceRecords
        .filter(r => r.word === word.word && r.mode === mode)
        .sort((a, b) => new Date(b.date) - new Date(a.date))[0];

    const lastPracticeTime = lastPracticeRecord ? new Date(lastPracticeRecord.date).getTime() : 0;

    // Time-based weight: more recent practice lowers the weight
    const hoursSincePractice = (now - lastPracticeTime) / (1000 * 60 * 60);
    const timeWeight = Math.log(Math.max(hoursSincePractice, 1)) + 1; // Logarithmic scale to not penalize old words too much

    // Error-based weight: more errors increase the weight
    const errorWeight = Math.pow(modeData.errors + 1, 1.5); // Exponentially increase weight with errors

    // Practice count weight: fewer practices increase the weight
    const practiceWeight = 1 / (modeData.practiceCount + 1);

    // Favorite weight: favorited words get a significant boost
    const favoriteWeight = word.favorite ? 5 : 1;

    // Combine weights
    const finalWeight = timeWeight * errorWeight * practiceWeight * favoriteWeight;

    return finalWeight;
}


// =================================================================
// UI Utility Functions
// =================================================================

/**
 * Displays a toast notification on the screen.
 * @param {string} message - The message to display.
 * @param {'info'|'success'|'error'} [type='info'] - The type of toast.
 * @param {number} [duration=3000] - How long the toast should be visible in ms.
 */
function showToast(message, type = 'info', duration = 3000) {
    const toastContainer = document.getElementById('toastContainer');
    if (!toastContainer) {
        console.error('Toast container not found!');
        return;
    }

    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;

    let icon = 'i';
    if (type === 'success') icon = '✓';
    if (type === 'error') icon = '✗';

    toast.innerHTML = `
        <div class="toast-icon">${icon}</div>
        <div class="toast-message">${message}</div>
    `;

    toastContainer.appendChild(toast);

    setTimeout(() => {
        toast.style.animation = 'toastOut 0.3s ease forwards';
        setTimeout(() => {
            toast.remove();
        }, 300);
    }, duration);
}

/**
 * Shows a skeleton loading state in a given container.
 * @param {HTMLElement} container - The element to show the skeleton in.
 */
function showSkeleton(container) {
    container.innerHTML = `
        <div class="skeleton-fade-in">
            <div class="skeleton skeleton-title"></div>
            <div class="skeleton skeleton-line full"></div>
            <div class="skeleton skeleton-line full"></div>
            <div class="skeleton skeleton-line medium"></div>
        </div>
    `;
}
