/* AI English Learning Assistant - Common JavaScript Functions */

// Common storage initialization functions
const initializeStorage = () => {
    // Initialize mode list (if not already initialized)
    if (!localStorage.getItem('supportedModes')) {
        const defaultModes = [
            { id: 'context', name: '上下文猜词', active: true },
            { id: 'blank', name: '填空练习', active: true }
        ];
        localStorage.setItem('supportedModes', JSON.stringify(defaultModes));
    } else {
        // Check and add blank mode (if it doesn't exist)
        const modes = JSON.parse(localStorage.getItem('supportedModes'));
        if (!modes.some(mode => mode.id === 'blank')) {
            modes.push({ id: 'blank', name: '填空练习', active: true });
            localStorage.setItem('supportedModes', JSON.stringify(modes));
        }
    }

    // Initialize word bank
    if (!localStorage.getItem('wordBank')) {
        const defaultWords = [
            { word: 'vivid', translations: ['生动的'], modes: { context: { errors: 0, practiceCount: 0 }, blank: { errors: 0, practiceCount: 0 } } },
            { word: 'ambiguous', translations: ['模糊的'], modes: { context: { errors: 0, practiceCount: 0 }, blank: { errors: 0, practiceCount: 0 } } },
            { word: 'profound', translations: ['深刻的'], modes: { context: { errors: 0, practiceCount: 0 }, blank: { errors: 0, practiceCount: 0 } } }
        ];
        localStorage.setItem('wordBank', JSON.stringify(defaultWords));
    } else {
        // Migrate old data
        migrateWordData();
    }

    if (!localStorage.getItem('practiceRecords')) {
        localStorage.setItem('practiceRecords', JSON.stringify([]));
    }
}

// Migrate old word data to new format
const migrateWordData = () => {
    try {
        const wordBank = JSON.parse(localStorage.getItem('wordBank') || '[]');
        const needsMigration = wordBank.some(word => !word.modes || !word.modes.blank);

        if (needsMigration) {
            const migratedWordBank = wordBank.map(word => {
                // Ensure modes object exists
                if (!word.modes) {
                    word.modes = {
                        context: { errors: word.errors || 0, practiceCount: word.practiceCount || 0 }
                    };
                }

                // Add blank mode data
                if (!word.modes.blank) {
                    word.modes.blank = { errors: 0, practiceCount: 0 };
                }

                return word;
            });

            localStorage.setItem('wordBank', JSON.stringify(migratedWordBank));
            console.log('Word data migrated successfully');
        }
    } catch (error) {
        console.error('Error migrating word data:', error);
    }
}

// Get mode information from localStorage
const getModeInfo = (modeId) => {
    const supportedModes = JSON.parse(localStorage.getItem('supportedModes') || '[]');
    return supportedModes.find(mode => mode.id === modeId) || { id: modeId, name: modeId };
}

// Toast notification system
let toastQueue = [];
let isToastShowing = false;

const showToast = (message, type = 'success', duration = 3000) => {
    const toast = {
        message,
        type,
        duration,
        id: Date.now() + Math.random()
    };
    
    toastQueue.push(toast);
    processToastQueue();
}

const processToastQueue = () => {
    if (isToastShowing || toastQueue.length === 0) return;
    
    isToastShowing = true;
    const toast = toastQueue.shift();
    displayToast(toast);
}

const displayToast = (toast) => {
    const container = document.getElementById('toastContainer');
    if (!container) {
        console.warn('Toast container not found');
        isToastShowing = false;
        processToastQueue();
        return;
    }

    const toastElement = document.createElement('div');
    toastElement.className = `toast toast-${toast.type}`;
    toastElement.innerHTML = `
        <div class="toast-icon">${getToastIcon(toast.type)}</div>
        <div class="toast-message">${toast.message}</div>
    `;

    container.appendChild(toastElement);

    // Auto remove after duration
    setTimeout(() => {
        removeToast(toastElement);
    }, toast.duration);
}

const removeToast = (toastElement) => {
    if (!toastElement || !toastElement.parentNode) {
        isToastShowing = false;
        processToastQueue();
        return;
    }

    toastElement.classList.add('removing');
    
    setTimeout(() => {
        if (toastElement.parentNode) {
            toastElement.parentNode.removeChild(toastElement);
        }
        isToastShowing = false;
        processToastQueue();
    }, 300);
}

const getToastIcon = (type) => {
    switch (type) {
        case 'success': return '✓';
        case 'error': return '✗';
        case 'info': return 'ℹ';
        default: return '✓';
    }
}

// Skeleton loading utility
const showSkeleton = (container) => {
    container.innerHTML = `
        <div class="skeleton-fade-in">
            <div class="skeleton skeleton-title"></div>
            <div class="skeleton skeleton-line full"></div>
            <div class="skeleton skeleton-line full"></div>
            <div class="skeleton skeleton-line medium"></div>
        </div>
    `;
}

// Utility functions for word management
const getWordBank = () => {
    return JSON.parse(localStorage.getItem('wordBank') || '[]');
}

const saveWordBank = (wordBank) => {
    localStorage.setItem('wordBank', JSON.stringify(wordBank));
}

const getPracticeRecords = () => {
    return JSON.parse(localStorage.getItem('practiceRecords') || '[]');
}

const savePracticeRecord = (record) => {
    const records = getPracticeRecords();
    records.push({
        ...record,
        timestamp: new Date().toISOString(),
        date: new Date().toLocaleDateString()
    });
    localStorage.setItem('practiceRecords', JSON.stringify(records));
}

// Common initialization - call this on page load
const initializeApp = () => {
    initializeStorage();
    
    // Add common event listeners or setup here if needed
    console.log('App initialized successfully');
}

// Export functions for use in other scripts
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        initializeStorage,
        migrateWordData,
        getModeInfo,
        showToast,
        showSkeleton,
        getWordBank,
        saveWordBank,
        getPracticeRecords,
        savePracticeRecord,
        initializeApp
    };
}