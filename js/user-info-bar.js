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
        background: rgba(255, 255, 255, 0.92);
        border-radius: var(--border-radius);
        margin-bottom: 1.5rem;
        box-shadow: 0 15px 35px rgba(15, 23, 42, 0.08);
        border: 1px solid rgba(226, 232, 240, 0.9);
        flex-wrap: wrap;
        gap: 1rem;
        backdrop-filter: blur(12px);
      }

      .theme_dark .user-info-bar {
        background: linear-gradient(135deg, rgba(12, 17, 35, 0.9), rgba(38, 32, 78, 0.85));
        border-color: rgba(99, 102, 241, 0.35);
        box-shadow: 0 20px 45px rgba(5, 7, 19, 0.65);
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
        color: var(--text-secondary);
      }

      .stat-mini-unit {
        color: #94a3b8;
        font-size: 0.8rem;
      }

      .theme_dark .stat-mini {
        color: #d5dbff;
      }

      .theme_dark .stat-mini-unit {
        color: #c7d2ff;
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
          <span>💎</span>
          <span class="stat-mini-value" id="userDiamondsMini">${profile.diamonds}</span>
        </div>
        <div class="stat-mini">
          <span>🔥</span>
          <span class="stat-mini-value" id="userStreakMini">${profile.streak}</span>
          <span class="stat-mini-unit">天</span>
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
  const diamondsEl = document.getElementById("userDiamondsMini");
  const streakEl = document.getElementById("userStreakMini");

  if (levelEl) levelEl.textContent = profile.level;
  if (coinsEl) coinsEl.textContent = profile.coins;
  if (diamondsEl) diamondsEl.textContent = profile.diamonds;
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
