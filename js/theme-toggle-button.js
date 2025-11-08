/**
 * 主题切换按钮组件
 * 采用与 vocabulary-status-button 相同的样式风格
 */

/**
 * 获取当前主题
 */
function getCurrentTheme() {
  return safeGetItem(STORAGE_KEYS.THEME_SETTING) || "light";
}

/**
 * 设置主题
 */
function setTheme(theme) {
  safeSetItem(STORAGE_KEYS.THEME_SETTING, theme);
  applyTheme(theme);
}

/**
 * 初始化主题切换按钮
 */
function initThemeToggleButton() {
  // 查找或创建按钮容器
  let container = document.getElementById("themeToggleContainer");

  if (!container) {
    // 在 .container 底部插入主题切换按钮
    const mainContainer = document.querySelector(".container");
    container = document.createElement("div");
    container.id = "themeToggleContainer";
    container.className = "theme-toggle-container-wrapper";

    if (mainContainer) {
      mainContainer.appendChild(container);
    } else {
      document.body.appendChild(container);
    }
  }

  // 获取当前主题
  const currentTheme = getCurrentTheme();
  const isDark = currentTheme === "dark";

  // 创建按钮
  container.innerHTML = `
    <style>
      .theme-toggle-container-wrapper {
        margin-top: 3rem;
        margin-bottom: 2rem;
        text-align: center;
        width: 100%;
      }

      .theme-toggle-wrapper {
        display: inline-flex;
        align-items: center;
        gap: 0.75rem;
        padding: 0.75rem 1rem;
        background: rgba(255, 255, 255, 0.9);
        backdrop-filter: blur(10px);
        border-radius: 50px;
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
        transition: all 0.3s ease;
      }

      [data-theme="dark"] .theme-toggle-wrapper {
        background: rgba(30, 41, 59, 0.9);
      }

      .theme-label {
        font-size: 0.9rem;
        color: #475569;
        font-weight: 500;
        user-select: none;
      }

      [data-theme="dark"] .theme-label {
        color: #cbd5e1;
      }

      /* 开关按钮样式（复用 vocabulary-status-button 的样式） */
      .theme-switch {
        position: relative;
        display: inline-block;
        width: 48px;
        height: 26px;
      }

      .theme-switch input {
        opacity: 0;
        width: 0;
        height: 0;
      }

      .theme-slider {
        position: absolute;
        cursor: pointer;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        background-color: #cbd5e1;
        transition: 0.3s;
        border-radius: 34px;
      }

      .theme-slider:before {
        position: absolute;
        content: "";
        height: 20px;
        width: 20px;
        left: 3px;
        bottom: 3px;
        background-color: white;
        transition: 0.3s;
        border-radius: 50%;
        box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
      }

      input:checked + .theme-slider {
        background-color: #6366f1;
      }

      input:checked + .theme-slider:before {
        transform: translateX(22px);
      }

      .theme-slider:hover {
        opacity: 0.9;
      }

      /* 移动端样式 */
      @media (max-width: 768px) {
        #themeToggleContainer {
          bottom: 5.5rem !important;
          left: 50% !important;
        }

        .theme-toggle-wrapper {
          padding: 0.6rem 0.85rem;
          gap: 0.5rem;
        }

        .theme-label {
          font-size: 0.85rem;
        }

        .theme-switch {
          width: 44px;
          height: 24px;
        }

        .theme-slider:before {
          height: 18px;
          width: 18px;
        }

        input:checked + .theme-slider:before {
          transform: translateX(20px);
        }
      }
    </style>
    <div class="theme-toggle-wrapper">
      <span class="theme-label">${isDark ? "🌙 夜间" : "☀️ 日间"}</span>
      <label class="theme-switch">
        <input type="checkbox" id="themeToggleCheckbox" ${
          isDark ? "checked" : ""
        }>
        <span class="theme-slider"></span>
      </label>
    </div>
  `;

  // 绑定切换事件
  const checkbox = document.getElementById("themeToggleCheckbox");
  checkbox.addEventListener("change", (e) => {
    const newTheme = e.target.checked ? "dark" : "light";
    setTheme(newTheme);

    // 更新标签文本
    const label = container.querySelector(".theme-label");
    label.textContent = newTheme === "dark" ? "🌙 夜间" : "☀️ 日间";

    // 显示提示
    showToast(
      `已切换到${newTheme === "dark" ? "夜间" : "日间"}模式`,
      "success"
    );
  });
}

// 页面加载时自动初始化
if (typeof document !== "undefined") {
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initThemeToggleButton);
  } else {
    initThemeToggleButton();
  }
}
