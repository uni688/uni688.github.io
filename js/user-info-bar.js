// 用户信息栏通用组件

/**
 * 初始化用户信息栏
 * @param {string} containerId - 容器元素ID
 */
function initUserInfoBar(containerId = "userInfoBar") {
  const container = document.getElementById(containerId);
  if (!container) {
    console.warn("用户信息栏容器不存在");
    return;
  }

  // 确保用户档案已初始化
  initializeUserProfile();
  const profile = getUserProfile();

  // 渲染用户信息栏
  container.innerHTML = `
    <style>
      .user-info-bar {
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding: 1rem 1.5rem;
        background: rgba(255, 255, 255, 0.95);
        border-radius: var(--border-radius);
        margin-bottom: 1.5rem;
        box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
        border: 1px solid #e2e8f0;
        flex-wrap: wrap;
        gap: 1rem;
      }

      [data-theme="dark"] .user-info-bar {
        background: rgba(51, 65, 85, 0.8);
        border-color: rgba(100, 116, 139, 0.3);
      }

      .user-stats-mini {
        display: flex;
        gap: 1.5rem;
        align-items: center;
        flex-wrap: wrap;
      }

      .stat-mini {
        display: flex;
        align-items: center;
        gap: 0.5rem;
        font-size: 0.9rem;
      }

      .stat-mini-value {
        font-weight: 700;
        color: var(--primary);
      }

      .theme-toggle-mini {
        padding: 0.5rem 1rem;
        background: var(--primary);
        color: white;
        border: none;
        border-radius: var(--border-radius-sm);
        cursor: pointer;
        font-size: 0.9rem;
        transition: all 0.2s;
        white-space: nowrap;
      }

      .theme-toggle-mini:hover {
        background: var(--secondary);
        transform: translateY(-2px);
      }

      @media (max-width: 640px) {
        .user-info-bar {
          flex-direction: column;
          align-items: stretch;
        }

        .user-stats-mini {
          justify-content: space-around;
        }

        .stat-mini {
          font-size: 0.85rem;
        }
      }
    </style>
    <div class="user-info-bar">
      <div class="user-stats-mini">
        <div class="stat-mini">
          <span>🏆</span>
          <span>Lv.<span class="stat-mini-value" id="userLevelMini">${profile.level}</span></span>
        </div>
        <div class="stat-mini">
          <span>💰</span>
          <span class="stat-mini-value" id="userCoinsMini">${profile.coins}</span>
        </div>
        <div class="stat-mini">
          <span>🔥</span>
          <span class="stat-mini-value" id="userStreakMini">${profile.streak}</span>
          <span style="color: #64748b; font-size: 0.85rem;">天</span>
        </div>
      </div>
    </div>
  `;

  updateThemeButton();
}

/**
 * 更新用户信息栏显示
 */
function updateUserInfoBar() {
  const profile = getUserProfile();

  const levelEl = document.getElementById("userLevelMini");
  const coinsEl = document.getElementById("userCoinsMini");
  const streakEl = document.getElementById("userStreakMini");

  if (levelEl) levelEl.textContent = profile.level;
  if (coinsEl) coinsEl.textContent = profile.coins;
  if (streakEl) streakEl.textContent = profile.streak;
}

/**
 * 切换主题并更新按钮
 */
function toggleThemeAndUpdate() {
  toggleTheme();
  updateThemeButton();
  showToast("主题已切换", "success");
}

/**
 * 更新主题切换按钮文本
 */
function updateThemeButton() {
  const theme = safeGetItem(STORAGE_KEYS.THEME_SETTING) || "light";
  const btn = document.getElementById("themeToggleMini");
  if (btn) {
    btn.textContent = theme === "light" ? "🌙 夜间模式" : "☀️ 日间模式";
  }
}

// 每10秒自动更新用户信息显示
setInterval(() => {
  if (document.getElementById("userLevelMini")) {
    updateUserInfoBar();
  }
}, 10000);
