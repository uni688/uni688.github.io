/**
 * 主题切换按钮组件
 * 支持所有可用主题的切换
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
 * 获取所有可用主题列表
 */
function getAllThemes() {
  // 从 THEME_CONFIGS 获取所有主题
  if (typeof THEME_CONFIGS !== "undefined") {
    return Object.keys(THEME_CONFIGS).map((id) => ({
      id: id,
      name: THEME_CONFIGS[id].name,
      isDefault: THEME_CONFIGS[id].isDefault || false,
    }));
  }
  // 回退到默认主题列表
  return [
    { id: "theme_light", name: "明月清辉", isDefault: true },
    { id: "theme_dark", name: "星夜深邃", isDefault: true },
  ];
}

/**
 * 初始化主题切换按钮
 */
function initThemeToggleButton() {
  // 检查开发者模式
  const developerMode = safeGetItem(STORAGE_KEYS.DEVELOPER_MODE, false);

  // 查找或创建按钮容器
  let container = document.getElementById("themeToggleContainer");

  // 如果开发者模式关闭，隐藏按钮
  if (!developerMode) {
    if (container) {
      container.style.display = "none";
    }
    return;
  }

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
  } else {
    // 容器存在，显示它
    container.style.display = "";
  }

  // 获取当前装备的主题
  const inventory =
    typeof initializeInventory !== "undefined"
      ? initializeInventory()
      : { equipped: "theme_light" };
  const currentThemeId = inventory.equipped || "theme_light";

  // 获取所有可用主题
  const allThemes = getAllThemes();
  const currentTheme =
    allThemes.find((t) => t.id === currentThemeId) || allThemes[0];

  // 创建按钮
  container.innerHTML = `
    <style>
      .theme-toggle-container-wrapper {
        /* margin-top: 3rem; */
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
        -webkit-backdrop-filter: blur(10px);
        backdrop-filter: blur(10px);
        border-radius: 50px;
        border: 1px solid rgba(226, 232, 240, 0.8);
        box-shadow: 0 12px 30px rgba(15, 23, 42, 0.12);
        transition: all 0.3s ease;
        cursor: pointer;
        position: relative;
      }

      .theme_dark .theme-toggle-wrapper {
        background: linear-gradient(135deg, rgba(14, 20, 40, 0.95), rgba(39, 33, 84, 0.85));
        border-color: rgba(99, 102, 241, 0.35);
        box-shadow: 0 18px 45px rgba(2, 6, 23, 0.7);
      }

      .theme-toggle-wrapper:hover {
        transform: translateY(-2px);
        box-shadow: 0 6px 16px rgba(0, 0, 0, 0.15);
      }

      .theme-label {
        font-size: 0.9rem;
        color: #475569;
        font-weight: 500;
        -webkit-user-select: none;
        user-select: none;
      }

      .theme_dark .theme-label {
        color: #d7ddff;
      }

      .theme-icon {
        font-size: 1.2rem;
      }

      /* 主题选择下拉菜单 */
      .theme-dropdown {
        position: absolute;
        top: calc(100% + 0.5rem);
        left: 50%;
        transform: translateX(-50%);
        background: rgba(255, 255, 255, 0.98);
        backdrop-filter: blur(10px);
        border-radius: 12px;
        box-shadow: 0 8px 24px rgba(0, 0, 0, 0.15);
        padding: 0.5rem;
        min-width: 180px;
        max-height: 320px;
        overflow-y: auto;
        z-index: 1000;
        display: none;
        scrollbar-width: thin;
        scrollbar-color: rgba(99, 102, 241, 0.3) transparent;
        border: 1px solid rgba(226, 232, 240, 0.8);
      }

      .theme-dropdown::-webkit-scrollbar {
        width: 6px;
      }

      .theme-dropdown::-webkit-scrollbar-track {
        background: transparent;
      }

      .theme-dropdown::-webkit-scrollbar-thumb {
        background: rgba(99, 102, 241, 0.3);
        border-radius: 3px;
      }

      .theme-dropdown::-webkit-scrollbar-thumb:hover {
        background: rgba(99, 102, 241, 0.5);
      }

      .theme_dark .theme-dropdown {
        background: rgba(21, 26, 52, 0.98);
        border-color: rgba(129, 140, 248, 0.35);
        box-shadow: 0 18px 40px rgba(3, 5, 20, 0.75);
      }

      .theme-dropdown.show {
        display: block;
        animation: dropdownFadeIn 0.2s ease;
      }

      @keyframes dropdownFadeIn {
        from {
          opacity: 0;
          transform: translateX(-50%) translateY(-10px);
        }
        to {
          opacity: 1;
          transform: translateX(-50%) translateY(0);
        }
      }

      .theme-option {
        padding: 0.6rem 0.8rem;
        border-radius: 8px;
        cursor: pointer;
        transition: all 0.2s ease;
        color: #475569;
        font-size: 0.9rem;
        display: flex;
        align-items: center;
        justify-content: space-between;
      }

      .theme_dark .theme-option {
        color: #d4daff;
      }

      .theme-option:hover {
        background: rgba(99, 102, 241, 0.1);
      }

      .theme-option.active {
        background: rgba(99, 102, 241, 0.15);
        font-weight: 600;
        box-shadow: inset 0 0 0 1px rgba(99, 102, 241, 0.35);
      }

      .theme-option-check {
        color: #6366f1;
        font-weight: bold;
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

        .theme-dropdown {
          min-width: 160px;
        }
      }
    </style>
    <div class="theme-toggle-wrapper" id="themeToggleBtn">
      <span class="theme-icon">🎨</span>
      <span class="theme-label">${currentTheme.name}</span>
      <span style="font-size: 0.8rem; opacity: 0.6;">▼</span>
      <div class="theme-dropdown" id="themeDropdown">
        ${allThemes
          .map(
            (theme) => `
          <div class="theme-option ${
            theme.id === currentThemeId ? "active" : ""
          }"
               data-theme-id="${theme.id}">
            <span>${theme.name}${theme.isDefault ? " ⭐" : ""}</span>
            ${
              theme.id === currentThemeId
                ? '<span class="theme-option-check">✓</span>'
                : ""
            }
          </div>
        `
          )
          .join("")}
      </div>
    </div>
  `;

  // 绑定切换事件
  const toggleBtn = document.getElementById("themeToggleBtn");
  const dropdown = document.getElementById("themeDropdown");

  toggleBtn.addEventListener("click", (e) => {
    e.stopPropagation();
    dropdown.classList.toggle("show");
  });

  // 点击外部关闭下拉菜单
  document.addEventListener("click", () => {
    dropdown.classList.remove("show");
  });

  // 主题选项点击事件
  const options = dropdown.querySelectorAll(".theme-option");
  options.forEach((option) => {
    option.addEventListener("click", (e) => {
      e.stopPropagation();
      const themeId = option.dataset.themeId;

      // 装备主题
      if (typeof equipTheme !== "undefined") {
        equipTheme(themeId);
      } else {
        // 直接应用主题（用于没有商店系统的页面，带动画）
        const inventory = initializeInventory();
        inventory.equipped = themeId;
        safeSetItem(STORAGE_KEYS.USER_INVENTORY, inventory);
        applyEquippedThemeSkin(true);
        showToast("主题已切换！", "success");
      }

      // 重新初始化按钮以更新UI
      setTimeout(() => {
        initThemeToggleButton();
      }, 100);
    });
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
