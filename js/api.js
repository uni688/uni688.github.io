// =================================================================
// API 和模型配置
// =================================================================

const API_BASE_URL = "https://aliyun.zaiwen.top/admin/chatbot";
const API_KEY = "test";
const MODEL_NAME = "claude-sonnet-4";
// const MODEL_NAME = "gpt-4o";

// =================================================================
// 通用 API 获取函数
// =================================================================

/**
 * 向聊天机器人发起API调用的通用函数。
 * @param {Array<Object>} messages - 要发送的消息对象数组。
 * @returns {Promise<string>} - 响应消息的内容。
 * @throws {Error} - 如果API调用失败或返回无效格式，则抛出错误。
 */
async function fetchChatbotResponse(messages) {
  try {
    const response = await fetch(API_BASE_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        key: API_KEY,
      },
      body: JSON.stringify({
        message: messages,
        mode: MODEL_NAME,
        prompt_id: "",
        key: API_KEY,
      }),
    });

    if (!response.ok) {
      throw new Error(`API request failed with status ${response.status}`);
    }

    const rawData = await response.text();

    try {
      // 尝试作为JSON解析，这是预期的格式
      const data = JSON.parse(rawData);
      if (data.message?.[0]?.content) {
        return data.message[0].content;
      }
    } catch (jsonError) {
      // 如果JSON解析失败，可能是纯文本响应
      console.log("从API收到纯文本响应:", rawData);
      return rawData;
    }

    throw new Error("API响应格式无效");
  } catch (error) {
    console.error("API调用失败:", error);
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
  const messages = [
    {
      role: "user",
      content: `Generate a short English paragraph (30-50 words) containing the word "${word.word}". The sentence should clearly demonstrate the meaning of the word. Make sure the word "${word.word}" only happens ONCE. Do NOT include any explanation.`,
    },
  ];
  return await fetchChatbotResponse(messages);
}

/**
 * 生成单词猜测练习的上下文。
 * @param {Object} word - 单词对象。
 * @returns {Promise<string>} - 生成的上下文。
 */
async function generateContext(word) {
  const messages = [
    {
      role: "user",
      content: `Generate a short English paragraph (30-50 words) that describes a situation for the word "${word.word}", including the word "${word.word}" itself. The user will guess the word based on this context. The word "${word.word}" must be included. Do NOT say any other words.`,
    },
  ];
  return await fetchChatbotResponse(messages);
}

/**
 * 使用API验证用户的翻译。
 * @param {Object} word - 单词对象。
 * @param {string} translation - 用户的翻译。
 * @param {string} contextText - 单词出现的上下文。
 * @returns {Promise<boolean>} - 如果翻译有效则返回true。
 */
async function validateTranslation(word, translation, contextText) {
  const messages = [
    {
      role: "user",
      content: `Context: ${contextText}. \nIs "${translation}" a valid CHINESE translation for "${word.word}" in this context? Answer only yes/no.`,
    },
  ];
  const responseText = await fetchChatbotResponse(messages);
  return responseText.toLowerCase().includes("yes");
}

/**
 * 获取当前单词的提示。
 * @param {Object} word - 单词对象。
 * @param {string} [contextText=''] - 可选的上下文文本，用于提供更具体的提示。
 * @returns {Promise<string>} - 提示文本。
 */
async function getApiHint(word, contextText = "") {
  let content = `Give a brief English definition for the word "${word.word}". Do NOT include the word itself in your answer. Do NOT respond any other words.`;
  if (contextText) {
    content = `Give a definition (for hint, in English) for understanding the word "${word.word}" in this context: "${contextText}". \nDO NOT EXPLAIN THE WORD. Do NOT respond any other words.`;
  }
  const messages = [{ role: "user", content }];
  return await fetchChatbotResponse(messages);
}

/**
 * 获取AI生成的简单直接提示（第二层提示）。
 * @param {Object} word - 包含单词和翻译的对象。
 * @param {string} contextText - 上下文（可选）。
 * @returns {Promise<string>} - 简单提示文本。
 */
async function getSimpleHint(word, contextText = "") {
  let content = `Give a very simple and direct hint for the word "${word.word}" in English. Remember to make it easy to understand. Do NOT respond any other words.`;
  if (contextText) {
    content = `Give a simple hint for understanding "${word.word}" in this context: "${contextText}". Remember to make it easy to understand. Do NOT respond any other words. Do NOT include the word "${word.word}".`;
  }
  const messages = [{ role: "user", content }];
  return await fetchChatbotResponse(messages);
}

/**
 * 获取AI生成的近义词提示（第三层提示）。
 * @param {Object} word - 包含单词和翻译的对象。
 * @returns {Promise<string>} - 近义词提示文本。
 */
async function getSynonymsHint(word) {
  const content = `List 3-4 synonyms for the word "${word.word}". Only provide the synonyms, separated by commas. Do not include the original word. Do NOT respond any other words.`;
  const messages = [{ role: "user", content }];
  return await fetchChatbotResponse(messages);
}

/**
 * 获取AI生成的语境提示（专门为填空模式设计）。
 * @param {Object} word - 包含单词和翻译的对象。
 * @param {string} contextText - 包含空白的句子上下文。
 * @returns {Promise<string>} - 语境提示文本。
 */
async function getContextualHint(word, contextText = "") {
  let content = `Analyze this complete sentence with a blank(target word:${word.word}): "${contextText}". What type of word should fill the blank? Describe the meaning and function needed in this context, but DO NOT say the actual word "${word.word}". Give a brief hint about what the missing word should express. Do NOT respond any other words.`;

  if (!contextText) {
    content = `What kind of word would fit in a sentence context for "${word.word}"? Describe the function and meaning this type of word should have, but DO NOT mention "${word.word}" itself. Do NOT respond any other words.`;
  }

  const messages = [{ role: "user", content }];
  return await fetchChatbotResponse(messages);
}
