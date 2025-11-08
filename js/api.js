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

// API 重试配置
const API_RETRY_CONFIG = {
  MAX_RETRIES: 2, // 最大重试次数
  RETRY_DELAY_MS: 1000, // 重试延迟（毫秒）
  TIMEOUT_MS: 10000, // 请求超时时间（毫秒）
};

// 存储当前进行中的请求，用于取消
let currentAbortController = null;

/**
 * 带超时控制的 fetch 请求
 * @param {string} url - 请求 URL
 * @param {Object} options - fetch 选项
 * @param {number} timeout - 超时时间（毫秒）
 * @returns {Promise<Response>} fetch 响应
 */
async function fetchWithTimeout(
  url,
  options,
  timeout = API_RETRY_CONFIG.TIMEOUT_MS
) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeout);

  try {
    const response = await fetch(url, {
      ...options,
      signal: controller.signal,
    });
    clearTimeout(timeoutId);
    return response;
  } catch (error) {
    clearTimeout(timeoutId);
    if (error.name === "AbortError") {
      throw new Error("请求超时，请检查网络连接");
    }
    throw error;
  }
}

/**
 * 带重试机制的请求函数
 * @param {Function} fetchFn - 执行请求的函数
 * @param {number} maxRetries - 最大重试次数
 * @returns {Promise<any>} 请求结果
 */
async function fetchWithRetry(
  fetchFn,
  maxRetries = API_RETRY_CONFIG.MAX_RETRIES
) {
  let lastError;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fetchFn();
    } catch (error) {
      lastError = error;

      // 如果是最后一次尝试，直接抛出错误
      if (attempt === maxRetries) {
        break;
      }

      // 记录重试信息
      console.warn(
        `API 请求失败，正在重试 (${attempt + 1}/${maxRetries})`,
        error
      );

      // 等待一段时间后重试（递增延迟）
      const delayMs = API_RETRY_CONFIG.RETRY_DELAY_MS * (attempt + 1);
      await new Promise((resolve) => setTimeout(resolve, delayMs));
    }
  }

  throw lastError;
}

/**
 * 取消当前进行中的 API 请求
 */
function cancelCurrentRequest() {
  if (currentAbortController) {
    currentAbortController.abort();
    currentAbortController = null;
    console.log("已取消当前 API 请求");
  }
}

/**
 * 向聊天机器人发起API调用的通用函数。
 * @param {Array<Object>} messages - 要发送的消息对象数组。
 * @returns {Promise<string>} - 响应消息的内容。
 * @throws {Error} - 如果API调用失败或返回无效格式，则抛出错误。
 */
async function fetchChatbotResponse(messages) {
  // 取消之前的请求
  cancelCurrentRequest();

  const executeFetch = async () => {
    // 为每次重试创建新的 AbortController
    const abortController = new AbortController();
    currentAbortController = abortController;

    try {
      const response = await fetchWithTimeout(
        API_BASE_URL,
        {
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
          signal: abortController.signal,
        },
        API_RETRY_CONFIG.TIMEOUT_MS
      );

      if (!response.ok) {
        // 根据状态码提供更详细的错误信息
        if (response.status === 429) {
          throw new Error("请求过于频繁，请稍后重试");
        } else if (response.status >= 500) {
          throw new Error("服务器错误，请稍后重试");
        } else if (response.status === 401 || response.status === 403) {
          throw new Error("API 认证失败");
        } else {
          throw new Error(`API 请求失败，状态码: ${response.status}`);
        }
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
      // 如果是用户主动取消，不记录错误
      if (error.name === "AbortError") {
        throw new Error("请求已取消");
      }
      throw error;
    } finally {
      // 清除 AbortController 引用（只清除当前controller）
      if (currentAbortController === abortController) {
        currentAbortController = null;
      }
    }
  };

  try {
    // 使用重试机制执行请求
    return await fetchWithRetry(executeFetch, API_RETRY_CONFIG.MAX_RETRIES);
  } catch (error) {
    console.error("API调用失败:", error);
    // 重新抛出错误让调用者处理
    throw error;
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
/**
 * 生成一个包含指定单词的短英文段落（30-50 个单词），并确保该单词仅出现一次且不带任何额外解释。
 *
 * 该异步函数会构建一个用于聊天模型的 messages 数组（将目标单词插入到提示中），
 * 然后调用 fetchChatbotResponse 将提示发送到后端/聊天接口以获取生成结果。
 *
 * @async
 * @param {{word: string}} word - 包含目标单词的对象；函数内部使用 word.word 作为要插入的单词。
 * @returns {Promise<string>} 返回一个 Promise，解析为聊天模型的响应文本（通常为生成的英文段落）。
 * @throws {Error} 当调用 fetchChatbotResponse 失败或响应不可用时抛出（具体错误由底层实现决定）。
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
  try {
    // 验证输入参数
    if (!word || !word.word || !translation) {
      console.warn("validateTranslation: 无效的输入参数");
      return false;
    }

    const messages = [
      {
        role: "user",
        content: `Context: ${
          contextText || ""
        }.\nIs "${translation}" a valid CHINESE translation for "${
          word.word
        }" in this context? Answer only yes/no.`,
      },
    ];
    const responseText = await fetchChatbotResponse(messages);

    if (!responseText || typeof responseText !== "string") {
      console.warn("validateTranslation: API返回无效响应");
      return false;
    }

    return responseText.toLowerCase().includes("yes");
  } catch (error) {
    console.error("validateTranslation 失败:", error);
    // API失败时降级为不通过，防止错误扩散
    return false;
  }
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
  const content = `List several synonyms for the word "${word.word}". Only provide the synonyms, separated by commas. Do not include the original word. Do NOT respond any other words.`;
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
