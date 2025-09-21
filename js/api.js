// =================================================================
// API 和模型配置
// =================================================================

const API_BASE_URL = "https://aliyun.zaiwen.top/admin/chatbot";
const API_KEY = "test";
const MODEL_NAME = "claude-sonnet-4";

// =================================================================
// 通用 API 获取函数
// =================================================================

/**
 * 向聊天机器人发起API调用的通用函数。
 * @param {Array<Object>} messages - 要发送的消息对象数组。
 * @returns {Promise<string>} - The content of the response message.
 * @throws {Error} - Throws an error if the API call fails or returns an invalid format.
 */
async function fetchChatbotResponse(messages) {
    try {
        const response = await fetch(API_BASE_URL, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "key": API_KEY
            },
            body: JSON.stringify({
                message: messages,
                mode: MODEL_NAME,
                prompt_id: "",
                key: API_KEY
            })
        });

        if (!response.ok) {
            throw new Error(`API request failed with status ${response.status}`);
        }

        const rawData = await response.text();

        try {
            // Try to parse as JSON, which is the expected format
            const data = JSON.parse(rawData);
            if (data.message?.[0]?.content) {
                return data.message[0].content;
            }
        } catch (jsonError) {
            // If JSON parsing fails, it might be a plain text response
            console.log('Received plain text response from API:', rawData);
            return rawData;
        }

        throw new Error('Invalid response format from API');
    } catch (error) {
        console.error('API call failed:', error);
        throw error; // 重新抛出错误让调用者处理
    }
}

// =================================================================
// 具体的 API 函数
// =================================================================

/**
 * 为填空练习生成句子。
 * @param {Object} word - 单词对象。
 * @returns {Promise<string>} - 生成的句子。
 */
async function generateBlankSentence(word) {
    const messages = [{
        role: "user",
        content: `Generate 1 English sentence (30-50 words) containing the word "${word.word}". The sentence should clearly demonstrate the meaning of the word. Make sure there is ONLY ONE sentence. Do NOT include any explanation.`
    }];
    return await fetchChatbotResponse(messages);
}

/**
 * Generates a context for the word guessing exercise.
 * @param {Object} word - The word object.
 * @returns {Promise<string>} - The generated context.
 */
async function generateContext(word) {
    const messages = [{
        role: "user",
        content: `Generate a short English paragraph (30-50 words) that describes a situation or provides strong clues for the word "${word.word}", including the word "${word.word}" itself. The user will guess the word based on this context.`
    }];
    return await fetchChatbotResponse(messages);
}

/**
 * Validates a user's translation using the API.
 * @param {Object} word - The word object.
 * @param {string} translation - The user's translation.
 * @param {string} contextText - The context in which the word appeared.
 * @returns {Promise<boolean>} - True if the translation is valid.
 */
async function validateTranslation(word, translation, contextText) {
    const messages = [{
        role: "user",
        content: `Context: ${contextText}. Is "${translation}" a valid CHINESE translation for "${word.word}" in this context? Answer only yes/no.`
    }];
    const responseText = await fetchChatbotResponse(messages);
    return responseText.toLowerCase().includes('yes');
}

/**
 * Fetches a hint for the current word.
 * @param {Object} word - The word object.
 * @param {string} [contextText=''] - Optional context text for a more specific hint.
 * @returns {Promise<string>} - The hint text.
 */
async function getApiHint(word, contextText = '') {
    let content = `Give a brief English definition for the word "${word.word}". Keep it simple and under 15 words. Do NOT include the word itself in your answer.`;
    if (contextText) {
        content = `Give a hint (in English) for understanding the word "${word.word}" in this context: ${contextText}.DO NOT EXPLAIN THE WORD. DO NOT respond any other words.`;
    }
    const messages = [{ role: "user", content }];
    return await fetchChatbotResponse(messages);
}
