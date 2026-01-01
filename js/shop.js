// 商店系统脚本

// =================================================================
// 常量配置
// =================================================================

// 钻石兑换汇率：1钻石 = 2金币
const DIAMOND_TO_COIN_RATE = 2;

// 货币类型
const CURRENCY_TYPES = {
  COIN: "coin",
  DIAMOND: "diamond",
};

// 道具购买限额配置
const ITEM_PURCHASE_LIMITS = {
  // 每日购买限额
  DAILY_LIMIT: 5,
  // 刷新时间间隔（毫秒）- 24小时
  REFRESH_INTERVAL: 24 * 60 * 60 * 1000,
  // 存储键
  STORAGE_KEY: "itemPurchaseLimits",
};

// 当前卡池类型（用于抽卡）
let currentGachaPool = "standard"; // 'standard' 或 'limited'

// 抽卡动画配置
const GACHA_ANIMATION_CONFIG = {
  // 翻牌间隔配置
  flipDelay: {
    tenPull: 850, // 十连抽翻牌间隔（毫秒）
    singlePull: 900, // 单抽翻牌间隔（毫秒）
    initialDelay: 850, // 首张卡片翻开前的延迟（毫秒）
  },
  // 各稀有度动画时长（毫秒）
  rarityDuration: {
    common: 500, // 普通卡翻牌动画时长
    rare: 500, // 稀有卡翻牌动画时长
    epic: 1700, // 史诗卡完整动画时长（泛光+翻牌）
    legendary: 8100, // 传说卡完整动画时长（6阶段特效）
  },
  // 跳过功能配置
  skip: {
    enabled: true, // 是否启用跳过功能
    showDelay: 1000, // 跳过按钮显示延迟（毫秒）- 十连抽开始后多久显示
    quickFlipInterval: 100, // 跳过后快速翻牌的间隔（毫秒）
    minCardsBeforeSkip: 1, // 至少翻开几张卡后才能跳过
  },
  // 关闭按钮配置
  closeButton: {
    showDelay: 400, // 最后一张翻完后显示关闭按钮的延迟（毫秒）
  },
};

// 充值套餐配置
const RECHARGE_PACKAGES = [
  { diamonds: 60, price: "¥6", displayPrice: "6元" },
  { diamonds: 318, price: "¥30", displayPrice: "30元" },
  { diamonds: 728, price: "¥68", displayPrice: "68元", badge: "推荐" },
  { diamonds: 3588, price: "¥328", displayPrice: "328元", badge: "超值" },
  { diamonds: 7688, price: "¥648", displayPrice: "648元", badge: "土豪" },
];

// 商品数据
const SHOP_DATA = {
  themes: [
    // 默认主题 - 系统赠送，不在商店出售
    {
      id: "theme_light",
      name: "明月清辉",
      description: "清新明亮的默认主题，适合日常学习",
      icon: "☀️",
      price: 0,
      currency: CURRENCY_TYPES.COIN,
      rarity: "common",
      isDefault: true, // 标记为默认主题
    },
    {
      id: "theme_dark",
      name: "星夜深邃",
      description: "优雅深邃的暗色主题，护眼舒适",
      icon: "🌙",
      price: 0,
      currency: CURRENCY_TYPES.COIN,
      rarity: "common",
      isDefault: true, // 标记为默认主题
    },
    // 可购买主题
    {
      id: "theme_forest",
      name: "森林绿野",
      description: "清新的森林主题，让学习更加放松",
      icon: "🌲",
      price: 500,
      currency: CURRENCY_TYPES.COIN,
      rarity: "common",
    },
    {
      id: "theme_sunset",
      name: "日落余晖",
      description: "温暖的日落主题，舒适的视觉享受",
      icon: "🌅",
      price: 1000,
      currency: CURRENCY_TYPES.COIN,
      rarity: "rare",
    },
    {
      id: "theme_galaxy",
      name: "玉津璀璨",
      description: "梦幻的星空主题，探索知识宇宙",
      icon: "🌌",
      price: 150,
      currency: CURRENCY_TYPES.DIAMOND,
      rarity: "epic",
    },
    {
      id: "theme_aurora",
      name: "极光幻境",
      description: "神秘的极光主题，绚丽夺目",
      icon: "🌈",
      price: 300,
      currency: CURRENCY_TYPES.DIAMOND,
      rarity: "legendary",
    },
    // 仅抽卡可获得的主题
    {
      id: "theme_ocean",
      name: "深海蓝调",
      description: "清澈的海洋主题，宁静深邃",
      icon: "🌊",
      price: 0, // 不可直接购买
      currency: CURRENCY_TYPES.COIN,
      rarity: "rare",
      gachaOnly: true, // 仅抽卡可获得
    },
    {
      id: "theme_cherry",
      name: "樱花纷飞",
      description: "浪漫的樱花主题，粉嫩迷人",
      icon: "🌸",
      price: 0, // 不可直接购买
      currency: CURRENCY_TYPES.COIN,
      rarity: "rare",
      gachaOnly: true, // 仅抽卡可获得
    },
  ],
  items: [
    {
      id: "item_hint_boost",
      name: "提示加速器",
      description: "消耗后可获取一次高级提示（第2-9级提示）",
      icon: "💡",
      price: 300,
      currency: CURRENCY_TYPES.COIN,
      rarity: "common",
    },
    {
      id: "item_exp_boost",
      name: "经验倍增卡",
      description: "30分钟内经验值获取翻倍",
      icon: "✨",
      price: 500,
      currency: CURRENCY_TYPES.COIN,
      rarity: "rare",
    },
    {
      id: "item_coin_boost",
      name: "金币加成",
      description: "30分钟内金币获取增加50%",
      icon: "💰",
      price: 600,
      currency: CURRENCY_TYPES.COIN,
      rarity: "rare",
    },
    {
      id: "item_lucky_charm",
      name: "幸运符",
      description: "提高抽卡稀有度，持续3次抽卡",
      icon: "🍀",
      price: 100,
      currency: CURRENCY_TYPES.DIAMOND,
      rarity: "epic",
    },
    {
      id: "item_master_key",
      name: "大师之钥",
      description: "24小时内免费使用所有高级提示（不消耗提示加速器）",
      icon: "🔑",
      price: 1000,
      currency: CURRENCY_TYPES.DIAMOND,
      rarity: "legendary",
    },
    {
      id: "item_shit",
      name: "屎",
      description: "鲜美的食物，世间之至宝！",
      icon: "💩",
      price: 9999, // 不可购买
      currency: CURRENCY_TYPES.COIN,
      rarity: "common",
      gachaOnly: true, // 仅抽卡可获得
    },
  ],
};

// ============================================
// 抽卡池配置 - 常驻池和限定池分开设置
// ============================================

/**
 * 常驻卡池物品列表
 * - 主题：深海蓝调、樱花纷飞
 * - 道具：除大师之钥外的所有道具
 */
const STANDARD_GACHA_POOL = [
  // 皮肤 - 仅深海蓝调和樱花纷飞
  SHOP_DATA.themes.find((t) => t.id === "theme_ocean"),
  SHOP_DATA.themes.find((t) => t.id === "theme_cherry"),
  // 道具 - 除大师之钥外
  SHOP_DATA.items.find((i) => i.id === "item_hint_boost"),
  SHOP_DATA.items.find((i) => i.id === "item_exp_boost"),
  SHOP_DATA.items.find((i) => i.id === "item_coin_boost"),
  SHOP_DATA.items.find((i) => i.id === "item_lucky_charm"),
  ...SHOP_DATA.items.filter((i) => i.id !== "item_master_key"),
].filter(Boolean); // 过滤掉可能的 undefined

/**
 * 限定卡池物品列表
 * - 包含所有史诗和传说稀有度的物品（包括大师之钥）
 * - 以及商店可购买的皮肤（森林绿野、日落余晖、玉津璀璨、极光幻境）
 * - 随赛季更新，每个赛季有不同的UP物品
 */
const LIMITED_GACHA_POOL = [
  // 可购买皮肤
  ...SHOP_DATA.themes.filter(
    (t) => !t.isDefault && !t.gachaOnly && t.price > 0
  ),
  // 大师之钥
  SHOP_DATA.items.find((i) => i.id === "item_master_key"),
].filter(Boolean);

/**
 * 赛季限定UP物品配置
 * 根据赛季编号选择不同的UP物品
 */
const SEASON_UP_ITEMS = {
  // 奇数赛季UP：极光幻境 + 大师之钥
  odd: ["theme_aurora", "item_master_key"],
  // 偶数赛季UP：玉津璀璨 + 幸运符
  even: ["theme_galaxy", "item_lucky_charm"],
};

/**
 * 获取当前赛季的UP物品ID列表
 * @returns {Array} UP物品ID数组
 */
function getSeasonUpItems() {
  // 检查是否有赛季系统可用
  if (typeof getSeasonData === "function") {
    const seasonData = getSeasonData();
    const isOddSeason = seasonData.seasonNumber % 2 === 1;
    return isOddSeason ? SEASON_UP_ITEMS.odd : SEASON_UP_ITEMS.even;
  }
  // 默认返回奇数赛季UP
  return SEASON_UP_ITEMS.odd;
}

/**
 * 获取限定卡池剩余时间（与赛季同步）
 * @returns {Object} { days, hours, minutes, formatted }
 */
function getLimitedPoolRemainingTime() {
  if (typeof getSeasonRemainingTime === "function") {
    const remaining = getSeasonRemainingTime();
    return {
      ...remaining,
      formatted: formatLimitedPoolTime(remaining),
    };
  }
  // 默认返回14天
  return {
    days: 14,
    hours: 0,
    minutes: 0,
    totalMs: 14 * 24 * 60 * 60 * 1000,
    formatted: "14天",
  };
}

/**
 * 格式化限定卡池倒计时
 */
function formatLimitedPoolTime(remaining) {
  if (remaining.days > 0) {
    return `${remaining.days}天${remaining.hours}小时`;
  } else if (remaining.hours > 0) {
    return `${remaining.hours}小时${remaining.minutes}分钟`;
  } else {
    return `${remaining.minutes}分钟`;
  }
}

// 保留旧的 GACHA_POOL 用于兼容（指向常驻池）
const GACHA_POOL = STANDARD_GACHA_POOL;

const RARITY_COLORS = {
  common: "#94a3b8",
  rare: "#3b82f6",
  epic: "#a855f7",
  legendary: "#f59e0b",
};

const RARITY_NAMES = {
  common: "普通",
  rare: "稀有",
  epic: "史诗",
  legendary: "传说",
};

/**
 * 初始化商店页面
 */
function initShopPage() {
  initializeStorage();
  initializeUserProfile();
  initializeTheme(); // 初始化主题
  initDeveloperMode(); // 初始化开发者模式
  initializeInventory();
  initializePurchaseLimits(); // 初始化购买限额系统
  updateBalanceDisplay();
  loadShopItems();
  loadGachaPools(); // 加载卡池物品
  initTabIndicator(); // 初始化标签页指示条
}

// 初始化
document.addEventListener("DOMContentLoaded", initShopPage);

/**
 * 初始化用户物品库
 */
function initializeInventory() {
  let inventory = safeGetItem(STORAGE_KEYS.USER_INVENTORY);
  if (!inventory) {
    inventory = {
      owned: [], // 已拥有的物品ID列表
      equipped: null, // 当前装备的主题ID
    };
    safeSetItem(STORAGE_KEYS.USER_INVENTORY, inventory);
  }
  return inventory;
}

/**
 * 初始化道具购买限额数据
 */
function initializePurchaseLimits() {
  let limits = safeGetItem(ITEM_PURCHASE_LIMITS.STORAGE_KEY);
  const now = Date.now();

  if (!limits || !limits.lastRefresh) {
    // 首次初始化
    limits = {
      lastRefresh: now,
      purchased: {}, // { itemId: count }
    };
    safeSetItem(ITEM_PURCHASE_LIMITS.STORAGE_KEY, limits);
  } else {
    // 检查是否需要刷新
    const timeSinceRefresh = now - limits.lastRefresh;
    if (timeSinceRefresh >= ITEM_PURCHASE_LIMITS.REFRESH_INTERVAL) {
      // 重置购买记录
      limits = {
        lastRefresh: now,
        purchased: {},
      };
      safeSetItem(ITEM_PURCHASE_LIMITS.STORAGE_KEY, limits);
    }
  }

  return limits;
}

/**
 * 获取道具剩余可购买数量
 */
function getRemainingPurchases(itemId) {
  const limits = initializePurchaseLimits();
  const purchased = limits.purchased[itemId] || 0;
  return Math.max(0, ITEM_PURCHASE_LIMITS.DAILY_LIMIT - purchased);
}

/**
 * 记录道具购买
 */
function recordPurchase(itemId) {
  const limits = initializePurchaseLimits();
  limits.purchased[itemId] = (limits.purchased[itemId] || 0) + 1;
  safeSetItem(ITEM_PURCHASE_LIMITS.STORAGE_KEY, limits);
}

/**
 * 获取下次刷新时间
 */
function getNextRefreshTime() {
  const limits = initializePurchaseLimits();
  const nextRefresh =
    limits.lastRefresh + ITEM_PURCHASE_LIMITS.REFRESH_INTERVAL;
  const remaining = nextRefresh - Date.now();

  if (remaining <= 0) return "即将刷新";

  const hours = Math.floor(remaining / (60 * 60 * 1000));
  const minutes = Math.floor((remaining % (60 * 60 * 1000)) / (60 * 1000));

  return `${hours}小时${minutes}分钟后刷新`;
}

/**
 * 更新余额显示（金币和钻石）
 */
function updateBalanceDisplay() {
  const profile = getUserProfile();
  const coinBalanceEl = document.getElementById("coinBalance");
  const diamondBalanceEl = document.getElementById("diamondBalance");

  if (coinBalanceEl) {
    coinBalanceEl.textContent = profile.coins;
  }
  if (diamondBalanceEl) {
    diamondBalanceEl.textContent = profile.diamonds;
  }
}

/**
 * 更新金币显示（保持兼容性）
 */
function updateCoinDisplay() {
  updateBalanceDisplay();
}

/**
 * 切换标签页
 */
function switchTab(tabName) {
  // 更新标签按钮状态
  document.querySelectorAll(".shop-tabs .tab-btn").forEach((btn) => {
    btn.classList.remove("active");
    if (btn.dataset.tab === tabName) {
      btn.classList.add("active");
    }
  });

  // 将激活项滚入可视区域（用于移动端横向滚动标签）
  const tabsContainer = document.getElementById("mainShopTabs");
  const activeBtn = tabsContainer?.querySelector(
    `.tab-btn[data-tab="${tabName}"]`
  );
  if (activeBtn && typeof activeBtn.scrollIntoView === "function") {
    activeBtn.scrollIntoView({ block: "nearest", inline: "center" });
  }

  // 更新底部指示条位置（等滚动/布局稳定后再计算）
  requestAnimationFrame(() => updateTabIndicator(tabName));

  // 切换内容显示
  document.querySelectorAll(".tab-content").forEach((content) => {
    content.style.display = "none";
  });
  const targetTab = document.getElementById(`tab-${tabName}`);
  if (targetTab) {
    targetTab.style.display = "block";
  }

  // 加载对应内容
  if (tabName === "gacha") {
    loadGachaPools();
  } else if (tabName === "shop") {
    loadShopItems();
  } else if (tabName === "inventory") {
    loadInventory();
  }
}

/**
 * 更新标签页底部指示条位置（磁吸+液体效果）
 */
function updateTabIndicator(tabName) {
  const indicator = document.getElementById("tabIndicator");
  const tabsContainer = document.getElementById("mainShopTabs");
  const activeBtn = tabsContainer?.querySelector(
    `.tab-btn[data-tab="${tabName}"]`
  );

  if (!indicator || !activeBtn || !tabsContainer) return;

  // 获取按钮相对于容器的位置
  const containerRect = tabsContainer.getBoundingClientRect();
  const btnRect = activeBtn.getBoundingClientRect();

  // 计算相对位置（需要加上 scrollLeft，否则横向滚动后会错位）
  const left = btnRect.left - containerRect.left + tabsContainer.scrollLeft;
  const width = btnRect.width;

  // 添加移动状态类
  indicator.classList.add("moving");

  // 设置新位置
  indicator.style.left = `${left}px`;
  indicator.style.width = `${width}px`;

  // 移动完成后添加轻微磁吸效果（无弹跳）
  setTimeout(() => {
    indicator.classList.remove("moving");
    indicator.classList.add("snap");

    setTimeout(() => {
      indicator.classList.remove("snap");
    }, 200);
  }, 250);
}

/**
 * 初始化指示条位置
 */
function initTabIndicator() {
  const tabsContainer = document.getElementById("mainShopTabs");
  const activeBtn = tabsContainer?.querySelector(".tab-btn.active");

  if (!activeBtn) return;

  const tabName = activeBtn.dataset.tab;
  if (tabName) {
    // 延迟执行确保DOM渲染完成
    setTimeout(() => updateTabIndicator(tabName), 100);
  }

  // 移动端横向滚动时，保持指示条与激活项对齐
  if (tabsContainer && !tabsContainer.dataset.indicatorScrollBound) {
    tabsContainer.dataset.indicatorScrollBound = "1";
    let rafId = 0;
    tabsContainer.addEventListener(
      "scroll",
      () => {
        if (rafId) return;
        rafId = requestAnimationFrame(() => {
          rafId = 0;
          const currentActive = tabsContainer.querySelector(".tab-btn.active");
          const currentTab = currentActive?.dataset?.tab;
          if (currentTab) updateTabIndicator(currentTab);
          updateScrollableTabsHint(tabsContainer);
        });
      },
      { passive: true }
    );
  }

  // 首次更新可滚动提示
  if (tabsContainer) updateScrollableTabsHint(tabsContainer);
}

/**
 * 处理窗口大小变化，重新计算指示条位置
 */
let resizeTimeout = null;
function handleWindowResize() {
  // 使用防抖避免频繁计算
  if (resizeTimeout) clearTimeout(resizeTimeout);
  resizeTimeout = setTimeout(() => {
    const tabsContainer = document.getElementById("mainShopTabs");
    const activeBtn = tabsContainer?.querySelector(".tab-btn.active");
    if (activeBtn) {
      const tabName = activeBtn.dataset.tab;
      if (tabName) {
        // 直接更新位置，不添加动画效果
        const indicator = document.getElementById("tabIndicator");
        if (indicator) {
          indicator.style.transition = "none"; // 临时禁用动画
          updateTabIndicator(tabName);
          // 恢复动画
          setTimeout(() => {
            indicator.style.transition = "";
          }, 50);
        }
      }
    }

    if (tabsContainer) updateScrollableTabsHint(tabsContainer);
  }, 100);
}

/**
 * 更新横向 tabs 的“可滑动提示”状态类：
 * - is-scrollable：内容宽度超过容器
 * - at-start / at-end：用于隐藏左右渐变
 */
function updateScrollableTabsHint(tabsContainer) {
  if (!tabsContainer) return;

  const isScrollable =
    tabsContainer.scrollWidth > tabsContainer.clientWidth + 1;
  tabsContainer.classList.toggle("is-scrollable", isScrollable);

  if (!isScrollable) {
    tabsContainer.classList.remove("at-start");
    tabsContainer.classList.remove("at-end");
    return;
  }

  const maxScrollLeft = Math.max(
    0,
    tabsContainer.scrollWidth - tabsContainer.clientWidth
  );
  const atStart = tabsContainer.scrollLeft <= 1;
  const atEnd = tabsContainer.scrollLeft >= maxScrollLeft - 1;

  tabsContainer.classList.toggle("at-start", atStart);
  tabsContainer.classList.toggle("at-end", atEnd);
}

// 添加窗口resize事件监听
window.addEventListener("resize", handleWindowResize);

// =================================================================
// 传说卡片 3D 立体效果 - Steam 风格
// =================================================================

/**
 * 为传说卡片初始化 3D 立体效果
 * @param {HTMLElement} card - 卡片元素
 */
function initLegendaryCard3DEffect(card) {
  // 3D 效果配置
  const MAX_ROTATION = 15; // 最大旋转角度
  const PERSPECTIVE = 1000; // 透视距离

  // 鼠标进入：激活 3D 效果
  card.addEventListener("mouseenter", () => {
    card.classList.add("tilt-active");
    card.style.transition = "transform 0.1s ease-out";
  });

  // 鼠标移动：实时更新 3D 旋转
  card.addEventListener("mousemove", (e) => {
    const rect = card.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;

    // 计算鼠标相对于卡片中心的位置（-1 到 1）
    const mouseX = (e.clientX - centerX) / (rect.width / 2);
    const mouseY = (e.clientY - centerY) / (rect.height / 2);

    // 计算旋转角度（鼠标向右 → 卡片向左转，形成立体感）
    const rotateY = mouseX * MAX_ROTATION;
    const rotateX = -mouseY * MAX_ROTATION;

    // 应用 3D 变换
    card.style.transform = `
      perspective(${PERSPECTIVE}px)
      rotateX(${rotateX}deg)
      rotateY(${rotateY}deg)
      scale3d(1.05, 1.05, 1.05)
    `;

    // 更新光泽效果位置（通过 CSS 变量）
    const shineX = ((e.clientX - rect.left) / rect.width) * 100;
    const shineY = ((e.clientY - rect.top) / rect.height) * 100;
    card.style.setProperty("--shine-x", `${shineX}%`);
    card.style.setProperty("--shine-y", `${shineY}%`);
  });

  // 鼠标离开：平滑复位
  card.addEventListener("mouseleave", () => {
    card.classList.remove("tilt-active");
    card.style.transition =
      "transform 0.5s cubic-bezier(0.25, 0.46, 0.45, 0.94)";
    card.style.transform =
      "perspective(1000px) rotateX(0) rotateY(0) scale3d(1, 1, 1)";
  });
}

/**
 * 切换卡池（常驻/限定）
 */
function switchPool(poolType) {
  currentGachaPool = poolType; // 更新当前卡池

  // 切换卡池显示
  const standardPool = document.getElementById("standard-pool");
  const limitedPool = document.getElementById("limited-pool");

  if (poolType === "standard") {
    standardPool.style.display = "block";
    limitedPool.style.display = "none";
  } else {
    standardPool.style.display = "none";
    limitedPool.style.display = "block";
  }

  // 更新按钮状态
  document.querySelectorAll("[data-pool]").forEach((btn) => {
    btn.classList.toggle("active", btn.dataset.pool === poolType);
  });
}

/**
 * 切换商店子标签页（皮肤/道具）
 */
function switchShopTab(tabName) {
  // 更新按钮状态
  document.querySelectorAll("[data-shop-tab]").forEach((btn) => {
    btn.classList.remove("active");
    if (btn.dataset.shopTab === tabName) {
      btn.classList.add("active");
    }
  });

  // 切换内容显示
  document.getElementById("shop-themes").style.display =
    tabName === "themes" ? "block" : "none";
  document.getElementById("shop-items").style.display =
    tabName === "items" ? "block" : "none";
}

/**
 * 切换库存子标签页（皮肤/道具）
 */
function switchInventoryTab(tabName) {
  // 更新按钮状态
  document.querySelectorAll("[data-inv-tab]").forEach((btn) => {
    btn.classList.remove("active");
    if (btn.dataset.invTab === tabName) {
      btn.classList.add("active");
    }
  });

  // 切换内容显示
  document.getElementById("inv-themes").style.display =
    tabName === "themes" ? "block" : "none";
  document.getElementById("inv-items").style.display =
    tabName === "items" ? "block" : "none";
}

/**
 * 加载抽卡池内容
 */
function loadGachaPools() {
  loadStandardPool();
  loadLimitedPool();
}

/**
 * 加载常驻卡池
 */
function loadStandardPool() {
  const container = document.getElementById("standardPoolGrid");
  container.innerHTML = "";

  // 常驻卡池：深海蓝调、樱花纷飞 + 除大师之钥外的道具
  STANDARD_GACHA_POOL.forEach((item) => {
    const card = createPoolItemCard(item);
    container.appendChild(card);
  });
}

/**
 * 加载限定卡池
 */
function loadLimitedPool() {
  const container = document.getElementById("limitedPoolGrid");
  container.innerHTML = "";

  // 获取赛季信息
  const remainingTime = getLimitedPoolRemainingTime();
  const upItems = getSeasonUpItems();

  // 添加赛季信息头部
  const headerHtml = `
  <div class="limited-pool-header-wrapper" style="position: relative; display: grid; grid-column: 1/-1; margin-bottom: 1rem;">
    <div class="limited-pool-header" style="
      position: relative;
      z-index: 1;
      padding: 1rem;
      border-radius: 12px;
      background: linear-gradient(135deg, rgba(168, 85, 247, 0.1), rgba(245, 158, 11, 0.1));
      text-align: center;
    ">
      <div style="font-size: 1.25rem; font-weight: 700; color: var(--text-primary); margin-bottom: 0.5rem;">
        🌟 赛季限定卡池
      </div>
      <div style="font-size: 0.9rem; color: var(--text-secondary);">
        ⏱️ 剩余时间：<span style="color: var(--primary); font-weight: 600;">${remainingTime.formatted}</span>
      </div>
      <div style="font-size: 0.85rem; color: #f59e0b; margin-top: 0.5rem;">
        ✨ UP物品概率提升中！
      </div>
    </div>
    <!-- 厚渐变圆角边框 -->
    <div style="
      position: absolute;
      top: -6px; left: -6px; right: -6px; bottom: -6px;
      border-radius: 15px;
      padding: 6px;
      background: linear-gradient(135deg, #a855f7, #06d988ff, #f59e0b);
      -webkit-mask:
        linear-gradient(#fff 0 0) content-box,
        linear-gradient(#fff 0 0);
      -webkit-mask-composite: destination-out;
      mask-composite: exclude;
      z-index: 0;
    "></div>
  </div>
`;

  container.insertAdjacentHTML("beforeend", headerHtml);

  // 限定卡池：商店可购买皮肤 + 大师之钥
  if (LIMITED_GACHA_POOL.length === 0) {
    container.innerHTML += `
      <p style="text-align: center; color: #64748b; padding: 3rem; grid-column: 1/-1;">
        🚧 限定卡池暂无物品，敬请期待下次更新！
      </p>
    `;
    return;
  }

  LIMITED_GACHA_POOL.forEach((item) => {
    const isUp = upItems.includes(item.id);
    const card = createPoolItemCard(item, isUp);
    container.appendChild(card);
  });
}

/**
 * 创建卡池物品卡片（仅展示，不可购买）
 * @param {Object} item - 物品数据
 * @param {boolean} isUp - 是否为UP物品
 */
function createPoolItemCard(item, isUp = false) {
  const card = document.createElement("div");
  card.className = "shop-item";
  card.setAttribute("data-rarity", item.rarity);
  const previewColor = RARITY_COLORS[item.rarity] || RARITY_COLORS.common;

  // 稀有度标签
  const rarityBadge = `
    <div style="position: absolute; top: 0.5rem; right: 0.5rem; background: ${previewColor}; color: white;
      padding: 0.25rem 0.75rem; border-radius: 1rem; font-size: 0.75rem; font-weight: 700;">
      ${RARITY_NAMES[item.rarity] || "未知"}
    </div>
  `;

  // UP标识
  const upBadge = isUp
    ? `
    <div style="position: absolute; top: 0.5rem; left: 0.5rem; background: linear-gradient(135deg, #f59e0b, #d97706); color: white;
      padding: 0.25rem 0.75rem; border-radius: 1rem; font-size: 0.75rem; font-weight: 700; animation: pulse 2s infinite;">
      ⬆️ UP
    </div>
  `
    : "";

  card.innerHTML = `
    <div class="item-preview" style="background: linear-gradient(135deg, ${previewColor}20, ${previewColor}40); position: relative;">
      ${item.icon}
      ${rarityBadge}
      ${upBadge}
    </div>
    <div class="item-info">
      <div class="item-name">${item.name}</div>
      <div class="item-desc">${item.description}</div>
      <div class="item-footer">
        <div style="color: ${isUp ? "#f59e0b" : "#64748b"}; font-size: 0.9rem;">
          ${isUp ? "✨ UP概率提升" : "💫 抽卡获得"}
        </div>
      </div>
    </div>
  `;

  // 为传说卡片添加 3D 立体效果
  if (item.rarity === "legendary") {
    initLegendaryCard3DEffect(card);
  }

  return card;
}
/**
 * 加载商店商品
 */
function loadShopItems() {
  loadThemes();
  loadItems();
}

/**
 * 加载主题列表
 */
function loadThemes() {
  const container = document.getElementById("themesGrid");
  const inventory = initializeInventory();

  container.innerHTML = "";

  // 只显示非默认、非抽卡专属的可购买主题
  SHOP_DATA.themes
    .filter((theme) => !theme.isDefault && !theme.gachaOnly)
    .forEach((theme) => {
      const isOwned = inventory.owned.includes(theme.id);
      const card = createShopItemCard(theme, isOwned, "theme");
      container.appendChild(card);
    });
}

/**
 * 加载道具列表
 */
function loadItems() {
  const container = document.getElementById("itemsGrid");
  const inventory = initializeInventory();

  container.innerHTML = "";

  // 过滤掉仅抽卡可得的道具
  SHOP_DATA.items
    .filter((item) => !item.gachaOnly)
    .forEach((item) => {
      const isOwned = inventory.owned.includes(item.id);
      const card = createShopItemCard(item, isOwned, "item");
      container.appendChild(card);
    });
}

/**
 * 创建商品卡片
 */
function createShopItemCard(item, isOwned, type) {
  const card = document.createElement("div");
  card.className = "shop-item";
  card.setAttribute("data-rarity", item.rarity); // 添加稀有度属性
  const previewColor = RARITY_COLORS[item.rarity] || RARITY_COLORS.common;

  // 根据货币类型显示价格
  const priceDisplay =
    item.currency === CURRENCY_TYPES.DIAMOND
      ? `${item.price} 💎`
      : `${item.price} 💰`;

  // 道具类型显示购买限额
  let limitInfo = "";
  let limitReached = false;
  if (type === "item") {
    const remaining = getRemainingPurchases(item.id);
    const nextRefresh = getNextRefreshTime();
    limitReached = remaining <= 0;

    if (limitReached) {
      // 购买达上限，显示红色警告
      limitInfo = `
        <div style="font-size: 0.8rem; color: #ef4444; margin-top: 0.5rem; padding: 0.5rem; background: rgba(239, 68, 68, 0.1); border-radius: 8px; border: 1px solid rgba(239, 68, 68, 0.3);">
          ⚠️ 今日购买已达上限！<br>
          下次刷新: ${nextRefresh}
        </div>
      `;
    } else {
      limitInfo = `
        <div style="font-size: 0.75rem; color: #64748b; margin-top: 0.25rem;">
          剩余 ${remaining}/${ITEM_PURCHASE_LIMITS.DAILY_LIMIT} | 刷新: ${nextRefresh}
        </div>
      `;
    }
  }

  card.innerHTML = `
    <div class="item-preview" style="background: linear-gradient(135deg, ${previewColor}20, ${previewColor}40);">
      ${item.icon}
    </div>
    <div class="item-info">
      <div class="item-name">${item.name}</div>
      <div class="item-desc">${item.description}</div>
      ${limitInfo}
      <div class="item-footer">
        <div class="item-price">${priceDisplay}</div>
        ${
          type === "theme" && isOwned
            ? '<span class="owned-badge">已拥有</span>'
            : limitReached
            ? '<button class="buy-btn" disabled style="background: #94a3b8; cursor: not-allowed; opacity: 0.6;">已达上限</button>'
            : `<button class="buy-btn" onclick="buyItem('${item.id}', '${type}')">购买</button>`
        }
      </div>
    </div>
  `;

  // 为传说卡片添加 3D 立体效果（Steam 风格）
  if (item.rarity === "legendary") {
    initLegendaryCard3DEffect(card);
  }

  return card;
}

/**
 * 购买商品
 */
function buyItem(itemId, type) {
  const profile = getUserProfile();
  const allItems = [...SHOP_DATA.themes, ...SHOP_DATA.items];
  const item = allItems.find((i) => i.id === itemId);

  if (!item) {
    showToast("商品不存在", "error");
    return;
  }

  // 道具类型检查购买限额
  if (type === "item") {
    const remaining = getRemainingPurchases(itemId);
    if (remaining <= 0) {
      const nextRefresh = getNextRefreshTime();
      showToast(
        `今日购买次数已达上限！下次刷新: ${nextRefresh}`,
        "error",
        5000
      );
      return;
    }
  }

  // 根据货币类型检查余额并扣费
  let success = false;
  if (item.currency === CURRENCY_TYPES.DIAMOND) {
    // 钻石购买
    if (profile.diamonds < item.price) {
      showToast("钻石不足！", "error");
      return;
    }
    success = deductDiamonds(item.price);
  } else {
    // 金币购买
    if (profile.coins < item.price) {
      showToast("金币不足！", "error");
      return;
    }
    success = deductCoins(item.price);
  }

  if (!success) return;

  // 添加到物品库
  const inventory = initializeInventory();
  if (type === "item") {
    // 道具可重复购买，直接追加
    inventory.owned.push(itemId);
    recordPurchase(itemId);
  } else {
    // 主题皮肤只能购买一次
    if (!inventory.owned.includes(itemId)) {
      inventory.owned.push(itemId);
    } else {
      showToast("您已拥有该主题！", "info");
      return;
    }
  }
  safeSetItem(STORAGE_KEYS.USER_INVENTORY, inventory);

  showToast(`🎉 成功购买 ${item.name}！`, "success");

  // 刷新显示
  updateBalanceDisplay();
  loadShopItems();
}

// =================================================================
// 充值系统
// =================================================================

/**
 * 打开充值弹窗
 */
function openRechargeModal(diamondAmount, displayPrice) {
  const modal = document.createElement("div");
  modal.id = "rechargeModal";
  modal.style.cssText = `
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background: rgba(0, 0, 0, 0.7);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 10000;
    animation: fadeIn 0.3s ease;
  `;

  // 生成随机短语作为二维码内容
  const randomPhrases = [
    "给钱了吗就看？",
    "付款了再来！",
    "先转账后看货～",
    "操你妈，钱到位了吗？",
    "别白嫖了快充值！",
    "学习也要花钱的～",
    "投资自己从充值开始！",
    "充钱使你变强！",
  ];
  const qrContent =
    randomPhrases[Math.floor(Math.random() * randomPhrases.length)];

  modal.innerHTML = `
    <div style="
      background: white;
      padding: 2.5rem;
      border-radius: 16px;
      max-width: 450px;
      width: 90%;
      box-shadow: 0 20px 60px rgba(0,0,0,0.3);
      animation: slideUp 0.3s ease;
    ">
      <h2 style="text-align: center; color: var(--primary); margin-bottom: 1.5rem;">
        💳 充值钻石
      </h2>

      <div style="text-align: center; margin-bottom: 2rem;">
        <div style="font-size: 2.5rem; font-weight: 700; color: #8b5cf6; margin-bottom: 0.5rem;">
          ${diamondAmount} 💎
        </div>
        <div style="font-size: 1.3rem; color: #ef4444; font-weight: 600;">
          ${displayPrice}
        </div>
      </div>

      <div style="
        background: #f3f4f6;
        padding: 2rem;
        border-radius: 12px;
        text-align: center;
        margin-bottom: 1.5rem;
      ">
        <div id="qrcode-container" style="
          width: 200px;
          height: 200px;
          margin: 0 auto;
          background: white;
          border-radius: 8px;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 0.5rem;
          box-shadow: 0 2px 8px rgba(0,0,0,0.1);
        "></div>
        <p style="margin-top: 1rem; color: #64748b; font-size: 0.9rem;">
          扫描二维码完成支付
        </p>
        <p style="margin-top: 0.5rem; color: #94a3b8; font-size: 0.85rem; font-style: italic;">
          "看你妈，快给钱💰！"
        </p>
      </div>

      <div style="display: flex; gap: 1rem;">
        <button onclick="closeRechargeModal()" style="
          flex: 1;
          padding: 0.875rem;
          background: #e2e8f0;
          color: #475569;
          border: none;
          border-radius: 8px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s;
        ">
          取消
        </button>
        <button onclick="confirmRecharge(${diamondAmount})" style="
          flex: 1;
          padding: 0.875rem;
          background: linear-gradient(135deg, #10b981, #059669);
          color: white;
          border: none;
          border-radius: 8px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s;
        ">
          ✓ 已支付
        </button>
      </div>
    </div>
  `;

  document.body.appendChild(modal);

  // 等待DOM渲染后生成二维码
  setTimeout(() => {
    const qrContainer = document.getElementById("qrcode-container");
    if (qrContainer && typeof QRCode !== "undefined") {
      // 清空容器
      qrContainer.innerHTML = "";
      // 生成二维码
      new QRCode(qrContainer, {
        text: qrContent,
        width: 180,
        height: 180,
        colorDark: "#000000",
        colorLight: "#ffffff",
        correctLevel: QRCode.CorrectLevel.H,
      });
    }
  }, 100);
}

/**
 * 关闭充值弹窗
 */
function closeRechargeModal() {
  const modal = document.getElementById("rechargeModal");
  if (modal) {
    modal.remove();
  }
}

/**
 * 确认充值（模拟支付成功）
 */
function confirmRecharge(diamondAmount) {
  // 添加钻石
  addDiamonds(diamondAmount);

  // 更新显示
  updateBalanceDisplay();

  // 显示成功提示
  showToast(`🎉 充值成功！获得 ${diamondAmount} 钻石`, "success", 3000);

  // 关闭弹窗
  closeRechargeModal();
}

// =================================================================
// 兑换系统
// =================================================================

/**
 * 兑换钻石为金币
 */
function exchangeDiamondsToCoins() {
  const inputEl = document.getElementById("exchangeAmount");
  const diamondAmount = parseInt(inputEl.value);

  if (!diamondAmount || diamondAmount <= 0) {
    showToast("请输入有效的钻石数量", "error");
    return;
  }

  const profile = getUserProfile();
  if (profile.diamonds < diamondAmount) {
    showToast("钻石不足！", "error");
    return;
  }

  // 计算可兑换的金币
  const coinsToAdd = diamondAmount * DIAMOND_TO_COIN_RATE;

  // 扣除钻石
  const success = deductDiamonds(diamondAmount);
  if (!success) return;

  // 添加金币
  addCoins(coinsToAdd);

  // 清空输入框
  inputEl.value = "";

  // 更新显示
  updateBalanceDisplay();

  showToast(`✨ 兑换成功！获得 ${coinsToAdd} 金币`, "success");
}

/**
 * 加载我的物品
 */
/**
 * 加载库存 - 区分皮肤和道具
 */
function loadInventory() {
  loadInventoryThemes();
  loadInventoryItems();
}

/**
 * 加载库存中的皮肤
 */
function loadInventoryThemes() {
  const container = document.getElementById("inventoryThemesGrid");
  const inventory = initializeInventory();

  container.innerHTML = "";

  // 筛选出皮肤物品
  const ownedThemes = inventory.owned.filter((id) => id.startsWith("theme_"));

  if (ownedThemes.length === 0) {
    container.innerHTML = `
      <p style="grid-column: 1/-1; text-align: center; color: #64748b; padding: 3rem;">
        还没有购买任何皮肤<br>
        快去商店看看吧！🎨
      </p>
    `;
    return;
  }

  ownedThemes.forEach((themeId) => {
    const theme = SHOP_DATA.themes.find((t) => t.id === themeId);
    if (!theme) return;

    const card = document.createElement("div");
    card.className = "shop-item";
    card.setAttribute("data-rarity", theme.rarity); // 添加稀有度属性

    const isEquipped = inventory.equipped === themeId;
    const previewColor = RARITY_COLORS[theme.rarity] || RARITY_COLORS.common;

    // 稀有度标签
    const rarityBadge = `
      <div style="position: absolute; top: 0.5rem; right: 0.5rem; background: ${previewColor}; color: white;
        padding: 0.25rem 0.75rem; border-radius: 1rem; font-size: 0.75rem; font-weight: 700;">
        ${RARITY_NAMES[theme.rarity] || "未知"}
      </div>
    `;

    card.innerHTML = `
      <div class="item-preview" style="background: linear-gradient(135deg, ${previewColor}20, ${previewColor}40); position: relative;">
        ${theme.icon}
        ${rarityBadge}
      </div>
      <div class="item-info">
        <div class="item-name">${theme.name}</div>
        <div class="item-desc">${theme.description}</div>
        <div class="item-footer">
          ${
            isEquipped
              ? '<span class="owned-badge" style="background: #10b981;">✓ 使用中</span>'
              : `<button class="buy-btn" onclick="equipTheme('${themeId}')">装备</button>`
          }
        </div>
      </div>
    `;

    // 为传说卡片添加 3D 立体效果
    if (theme.rarity === "legendary") {
      initLegendaryCard3DEffect(card);
    }

    container.appendChild(card);
  });
}

/**
 * 加载库存中的道具
 */
function loadInventoryItems() {
  const container = document.getElementById("inventoryItemsGrid");
  const inventory = initializeInventory();

  container.innerHTML = "";

  // 筛选出道具物品
  const ownedItems = inventory.owned.filter((id) => id.startsWith("item_"));

  if (ownedItems.length === 0) {
    container.innerHTML = `
      <p style="grid-column: 1/-1; text-align: center; color: #64748b; padding: 3rem;">
        还没有购买任何道具<br>
        快去商店看看吧！✨
      </p>
    `;
    return;
  }

  // 统计道具数量（支持同一道具多次购买）
  const itemCounts = {};
  ownedItems.forEach((itemId) => {
    itemCounts[itemId] = (itemCounts[itemId] || 0) + 1;
  });

  // 去重并显示
  const uniqueItems = [...new Set(ownedItems)];

  uniqueItems.forEach((itemId) => {
    const count = itemCounts[itemId];
    const item = SHOP_DATA.items.find((i) => i.id === itemId);
    if (!item) return;

    // 检查道具是否激活
    const active = isItemActive(itemId);
    let activeInfo = "";
    let itemData = null; // 在作用域开头定义

    if (active) {
      const activeItems = getActiveItems();
      itemData = activeItems[itemId]; // 赋值

      if (itemData) {
        if (itemData.expiresAt) {
          // 有时间限制
          const remaining = Math.ceil(
            (itemData.expiresAt - Date.now()) / 60000
          );
          activeInfo = `<span style="color: #10b981; font-size: 0.85rem; font-weight: 600;">⏰ 剩余 ${remaining} 分钟</span>`;
        } else if (itemData.usesLeft !== null) {
          // 有使用次数限制
          activeInfo = `<span style="color: #10b981; font-size: 0.85rem; font-weight: 600;">🔢 剩余 ${itemData.usesLeft} 次</span>`;
        } else {
          // 永久激活
          activeInfo = `<span style="color: #10b981; font-size: 0.85rem; font-weight: 600;">✅ 已激活</span>`;
        }
      }
    }

    const card = document.createElement("div");
    card.className = "shop-item";
    card.setAttribute("data-rarity", item.rarity); // 添加稀有度属性

    const previewColor = RARITY_COLORS[item.rarity] || RARITY_COLORS.common;

    // 稀有度标签
    const rarityBadge = `
      <div style="position: absolute; top: 0.5rem; right: 0.5rem; background: ${previewColor}; color: white;
        padding: 0.25rem 0.75rem; border-radius: 1rem; font-size: 0.75rem; font-weight: 700;">
        ${RARITY_NAMES[item.rarity] || "未知"}
      </div>
    `;

    // 数量标签
    const countBadge =
      count > 1
        ? `
      <div style="position: absolute; top: 0.5rem; left: 0.5rem; background: #f59e0b; color: white;
        padding: 0.25rem 0.75rem; border-radius: 1rem; font-size: 0.75rem; font-weight: 700;">
        × ${count}
      </div>
    `
        : "";

    card.innerHTML = `
      <div class="item-preview" style="background: linear-gradient(135deg, ${previewColor}20, ${previewColor}40); position: relative;">
        ${item.icon}
        ${rarityBadge}
        ${countBadge}
      </div>
      <div class="item-info">
        <div class="item-name">${item.name}</div>
        <div class="item-desc">${item.description}</div>
        <div class="item-footer">
          <button class="buy-btn" onclick="useItem('${itemId}')" ${
      active && (itemData.expiresAt || itemData.usesLeft !== null)
        ? "disabled"
        : ""
    }>
            ${active ? "使用中" : "使用"}
          </button>
          <div style="display: flex; flex-direction: column; gap: 0.25rem; align-items: flex-end;">
            ${activeInfo}
            ${
              count > 1
                ? `<span style="color: #64748b; font-size: 0.85rem;">拥有 ${count} 个</span>`
                : ""
            }
          </div>
        </div>
      </div>
    `;

    // 为传说卡片添加 3D 立体效果
    if (item.rarity === "legendary") {
      initLegendaryCard3DEffect(card);
    }

    container.appendChild(card);
  });
}

/**
 * 装备主题
 */
function equipTheme(themeId) {
  const inventory = initializeInventory();
  inventory.equipped = themeId;
  safeSetItem(STORAGE_KEYS.USER_INVENTORY, inventory);

  // 立即应用主题效果（带动画）
  applyEquippedThemeSkin(true);

  showToast("主题已装备并应用！", "success");

  // 延迟刷新界面以避免动画冲突
  setTimeout(() => {
    loadInventory();
  }, 650);
}

/**
 * 使用道具
 */
function useItem(itemId) {
  const inventory = initializeInventory();

  // 检查是否拥有该道具
  if (!inventory.owned.includes(itemId)) {
    showToast("您还没有该道具", "error");
    return;
  }

  // 根据道具类型激活效果
  switch (itemId) {
    case "item_hint_boost":
      // 提示加速器 - 不需要在这里激活，获取提示时自动消耗
      showToast("提示加速器会在获取高级提示时自动消耗", "info");
      break;

    case "item_exp_boost":
      // 经验倍增卡 - 30分钟
      if (isItemActive(itemId)) {
        showToast("经验倍增卡已在使用中", "info");
        return;
      }
      activateItem(itemId, 30 * 60 * 1000, null); // 30分钟
      showToast("经验倍增卡已激活！30分钟内经验值翻倍", "success");
      break;

    case "item_coin_boost":
      // 金币加成 - 30分钟
      if (isItemActive(itemId)) {
        showToast("金币加成已在使用中", "info");
        return;
      }
      activateItem(itemId, 30 * 60 * 1000, null); // 30分钟
      showToast("金币加成已激活！30分钟内金币获取增加50%", "success");
      break;

    case "item_lucky_charm":
      // 幸运符 - 3次抽卡
      if (isItemActive(itemId)) {
        showToast("幸运符已在使用中", "info");
        return;
      }
      activateItem(itemId, null, 3); // 3次使用
      showToast("幸运符已激活！接下来3次抽卡稀有度提升", "success");
      break;

    case "item_master_key":
      // 大师之钥 - 24小时
      if (isItemActive(itemId)) {
        showToast("大师之钥已激活", "info");
        return;
      }
      activateItem(itemId, 24 * 60 * 60 * 1000, null); // 24小时
      showToast("大师之钥已激活！24小时内免费使用所有高级提示", "success");
      break;

    case "item_shit":
      // 屎 - 使用后增加1金币并移除道具
      // 从库存中移除一个屎
      const shitIndex = inventory.owned.indexOf(itemId);
      if (shitIndex > -1) {
        inventory.owned.splice(shitIndex, 1);
        safeSetItem(STORAGE_KEYS.USER_INVENTORY, inventory);
      }

      // 增加1金币
      addCoins(1);
      updateBalanceDisplay();

      // 播放下粑粑雨特效
      playPoopRainEffect();

      showToast("💩 你竟然吃屎？！但屎就是好吃！", "success");
      showToast("💩 噫？里面似乎有个什么东西？💩💰💩", "success");
      break;

    default:
      showToast("未知道具类型", "error");
      return;
  }

  // 刷新库存显示
  setTimeout(() => {
    loadInventory();
  }, 500);
}

/**
 * 抽卡
 */
function drawGacha(count) {
  const profile = getUserProfile();
  const cost = count === 1 ? 100 : 900;

  // 检查金币
  if (profile.coins < cost) {
    showToast("金币不足！", "error");
    return;
  }

  // 扣除金币
  const success = deductCoins(cost);
  if (!success) return;

  // 执行抽卡
  const results = [];
  for (let i = 0; i < count; i++) {
    const item = performGacha();
    results.push(item);

    // 添加到物品库
    const inventory = initializeInventory();

    // 判断是主题还是道具
    if (item.id.startsWith("theme_")) {
      // 主题皮肤只能拥有一次
      if (!inventory.owned.includes(item.id)) {
        inventory.owned.push(item.id);
        safeSetItem(STORAGE_KEYS.USER_INVENTORY, inventory);
      }
    } else {
      // 道具可以重复拥有（多次添加）
      inventory.owned.push(item.id);
      safeSetItem(STORAGE_KEYS.USER_INVENTORY, inventory);
    }
  }

  // 显示抽卡结果
  showGachaResults(results);

  // 刷新显示
  updateBalanceDisplay();
}

/**
 * 执行单次抽卡
 */
function performGacha() {
  // 根据当前卡池选择物品池
  const currentPool =
    currentGachaPool === "limited" ? LIMITED_GACHA_POOL : STANDARD_GACHA_POOL;

  // 获取当前池中存在的稀有度
  const availableRarities = [
    ...new Set(currentPool.map((item) => item.rarity)),
  ];

  // 基础稀有度概率
  let rarityRates = {
    common: 0.7,
    rare: 0.2,
    epic: 0.08,
    legendary: 0.02,
  };

  // 如果幸运符激活，提升稀有度
  if (isItemActive("item_lucky_charm")) {
    rarityRates = {
      common: 0.5, // 70% -> 50%
      rare: 0.32, // 20% -> 32%
      epic: 0.15, // 8% -> 15%
      legendary: 0.03, // 2% -> 3%
    };
    // 消耗一次使用次数
    consumeItemUse("item_lucky_charm");
  }

  // 只保留当前池中存在的稀有度概率
  const filteredRates = {};
  let totalRate = 0;
  availableRarities.forEach((rarity) => {
    filteredRates[rarity] = rarityRates[rarity] || 0;
    totalRate += filteredRates[rarity];
  });

  // 归一化概率
  Object.keys(filteredRates).forEach((rarity) => {
    filteredRates[rarity] /= totalRate;
  });

  const random = Math.random();
  let cumulative = 0;
  let selectedRarity = availableRarities[0]; // 默认选第一个

  // 按稀有度从高到低排序（传说 > 史诗 > 稀有 > 普通）
  const rarityOrder = ["legendary", "epic", "rare", "common"];
  const sortedRarities = availableRarities.sort(
    (a, b) => rarityOrder.indexOf(a) - rarityOrder.indexOf(b)
  );

  for (const rarity of sortedRarities) {
    cumulative += filteredRates[rarity];
    if (random < cumulative) {
      selectedRarity = rarity;
      break;
    }
  }

  // 从对应稀有度池中随机选择
  const pool = currentPool.filter((item) => item.rarity === selectedRarity);
  if (pool.length === 0) {
    // 如果没有对应稀有度的物品，从整个池中随机选
    return currentPool[Math.floor(Math.random() * currentPool.length)];
  }
  return pool[Math.floor(Math.random() * pool.length)];
}

// 抽卡动画定时器管理（用于跳过功能）
let gachaAnimationTimers = [];
let gachaAnimationSkipped = false;

/**
 * 清除所有抽卡动画定时器
 */
function clearGachaAnimationTimers() {
  gachaAnimationTimers.forEach((timer) => clearTimeout(timer));
  gachaAnimationTimers = [];
}

/**
 * 添加抽卡动画定时器（便于统一管理和清除）
 */
function addGachaTimer(callback, delay) {
  const timer = setTimeout(callback, delay);
  gachaAnimationTimers.push(timer);
  return timer;
}

/**
 * 显示抽卡结果 - 自动翻牌动画
 */
function showGachaResults(results) {
  // 重置跳过状态和定时器
  gachaAnimationSkipped = false;
  clearGachaAnimationTimers();

  const overlay = document.createElement("div");
  overlay.id = "gachaResultOverlay";
  overlay.style.cssText = `
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background: rgba(0, 0, 0, 0.85);
    z-index: 9999;
    display: flex;
    align-items: center;
    justify-content: center;
    animation: gachaFadeIn 0.3s ease;
  `;

  // 根据卡片数量动态计算尺寸（桌面端放大）
  const isTenPull = results.length > 1;
  // 桌面端卡片尺寸（放大约30%）
  const cardWidth = isTenPull ? 95 : 130;
  const cardHeight = isTenPull ? 132 : 182;
  const gridGap = isTenPull ? 12 : 16;
  const gridMaxWidth = isTenPull ? 560 : 200;

  // 添加动画样式
  const styleEl = document.createElement("style");
  styleEl.id = "gachaAnimStyles";
  styleEl.textContent = `
    @keyframes gachaFadeIn {
      from { opacity: 0; }
      to { opacity: 1; }
    }
    @keyframes cardFlip {
      0% { transform: rotateY(180deg) scale(0.8); opacity: 0; }
      50% { transform: rotateY(90deg) scale(1.1); }
      100% { transform: rotateY(0deg) scale(1); opacity: 1; }
    }
    @keyframes cardGlow {
      0%, 100% { box-shadow: 0 0 15px var(--glow-color, rgba(99, 102, 241, 0.5)); }
      50% { box-shadow: 0 0 30px var(--glow-color, rgba(99, 102, 241, 0.8)); }
    }
    @keyframes rarityPulse {
      0%, 100% { transform: scale(1); }
      50% { transform: scale(1.03); }
    }
    @keyframes btnFadeIn {
      from { opacity: 0; transform: translateY(10px); }
      to { opacity: 1; transform: translateY(0); }
    }
    .gacha-card {
      width: ${cardWidth}px;
      height: ${cardHeight}px;
      perspective: 1000px;
      overflow: hidden;
      border-radius: 10px;
    }
    .gacha-card-inner {
      width: 100%;
      height: 100%;
      position: relative;
      transform-style: preserve-3d;
      transform: rotateY(180deg);
      transition: transform 0.5s cubic-bezier(0.4, 0, 0.2, 1);
    }
    .gacha-card.flipped .gacha-card-inner {
      transform: rotateY(0deg);
      animation: cardFlip 0.5s cubic-bezier(0.4, 0, 0.2, 1);
    }
    .gacha-card.flipped.rarity-epic .gacha-card-inner,
    .gacha-card.flipped.rarity-legendary .gacha-card-inner {
      animation: cardFlip 0.5s cubic-bezier(0.4, 0, 0.2, 1), rarityPulse 2s ease-in-out infinite 0.5s;
    }
    .gacha-card-face {
      position: absolute;
      width: 100%;
      height: 100%;
      backface-visibility: hidden;
      border-radius: 10px;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      box-shadow: 0 3px 12px rgba(0, 0, 0, 0.3);
    }
    .gacha-card-back {
      background: linear-gradient(135deg, #1e293b, #334155);
      border: 2px solid #475569;
      transform: rotateY(180deg);
      overflow: hidden;
    }
    .gacha-card-back::before {
      content: "?";
      font-size: ${isTenPull ? "2rem" : "3rem"};
      color: #64748b;
      font-weight: bold;
    }
    .gacha-card-front {
      background: linear-gradient(135deg, var(--card-bg-start, #1e293b), var(--card-bg-end, #334155));
      border: 2px solid var(--card-border, #475569);
      overflow: hidden;
    }
    .gacha-card.flipped .gacha-card-front {
      animation: cardGlow 2s ease-in-out infinite;
    }
    .gacha-card-icon {
      font-size: ${isTenPull ? "1.8rem" : "2.5rem"};
      margin-bottom: 0.3rem;
    }
    .gacha-card-rarity {
      font-size: ${isTenPull ? "0.55rem" : "0.65rem"};
      font-weight: 700;
      padding: 0.1rem 0.4rem;
      border-radius: 0.75rem;
      color: white;
      text-transform: uppercase;
    }
    .gacha-card-name {
      font-size: ${isTenPull ? "0.7rem" : "0.8rem"};
      color: #e2e8f0;
      text-align: center;
      margin-top: 0.3rem;
      padding: 0 0.3rem;
      line-height: 1.2;
      max-height: 2.4em;
      overflow: hidden;
    }
    .gacha-grid {
      display: flex;
      flex-wrap: wrap;
      justify-content: center;
      align-items: center;
      gap: ${gridGap}px;
      max-width: ${gridMaxWidth}px;
      padding: 1rem;
      margin: 0 auto;
    }
    .gacha-popup {
      transition: all 0.3s ease;
    }
    .gacha-close-btn {
      display: none;
      padding: 0.75rem 2rem;
      background: linear-gradient(135deg, #10b981, #059669);
      color: white;
      border: none;
      border-radius: 10px;
      font-weight: 600;
      cursor: pointer;
      font-size: 1rem;
      transition: all 0.2s;
      animation: btnFadeIn 0.4s ease;
    }
    .gacha-close-btn:hover {
      transform: scale(1.05);
      box-shadow: 0 4px 20px rgba(16, 185, 129, 0.4);
    }
    .gacha-close-btn.visible {
      display: inline-block;
    }
    .gacha-skip-btn {
      padding: 0.5rem 1.25rem;
      background: linear-gradient(135deg, rgba(100, 116, 139, 0.8), rgba(71, 85, 105, 0.8));
      color: #e2e8f0;
      border: 1px solid rgba(148, 163, 184, 0.3);
      border-radius: 8px;
      font-weight: 500;
      cursor: pointer;
      font-size: 0.85rem;
      transition: all 0.2s;
      backdrop-filter: blur(4px);
    }
    .gacha-skip-btn:hover {
      background: linear-gradient(135deg, rgba(100, 116, 139, 1), rgba(71, 85, 105, 1));
      transform: scale(1.03);
      box-shadow: 0 2px 12px rgba(100, 116, 139, 0.4);
    }
    /* 平板端适配 (769px - 1024px) */
    @media (max-width: 1024px) {
      .gacha-popup {
        max-width: 580px;
        padding: 1.25rem 1.5rem;
      }
      .gacha-popup h2 {
        font-size: 1.35rem !important;
      }
      .gacha-card {
        width: ${isTenPull ? 80 : 110}px;
        height: ${isTenPull ? 112 : 154}px;
      }
      .gacha-card-icon {
        font-size: ${isTenPull ? "2rem" : "2.8rem"};
      }
      .gacha-card-rarity {
        font-size: ${isTenPull ? "0.55rem" : "0.65rem"};
      }
      .gacha-card-name {
        font-size: ${isTenPull ? "0.6rem" : "0.7rem"};
      }
      .gacha-card-back::before {
        font-size: ${isTenPull ? "2rem" : "3rem"};
      }
      .gacha-grid {
        max-width: ${isTenPull ? 480 : 160}px;
        gap: 10px;
        padding: 0.6rem;
      }
    }
    /* 大手机端适配 (481px - 768px) */
    @media (max-width: 768px) {
      .gacha-popup {
        max-width: 460px;
        padding: 1rem 1.25rem;
        border-radius: 18px;
      }
      .gacha-popup h2 {
        font-size: 1.2rem !important;
        margin-bottom: 0.75rem !important;
      }
      .gacha-card {
        width: ${isTenPull ? 68 : 95}px;
        height: ${isTenPull ? 95 : 133}px;
      }
      .gacha-card-icon {
        font-size: ${isTenPull ? "1.7rem" : "2.4rem"};
      }
      .gacha-card-rarity {
        font-size: ${isTenPull ? "0.5rem" : "0.6rem"};
        padding: 0.08rem 0.35rem;
      }
      .gacha-card-name {
        font-size: ${isTenPull ? "0.55rem" : "0.65rem"};
      }
      .gacha-card-back::before {
        font-size: ${isTenPull ? "1.7rem" : "2.8rem"};
      }
      .gacha-grid {
        max-width: ${isTenPull ? 400 : 140}px;
        gap: 8px;
        padding: 0.5rem;
      }
    }
    /* 小手机端适配 (≤480px) */
    @media (max-width: 480px) {
      .gacha-popup {
        max-width: 360px;
        width: 95%;
        padding: 0.85rem 1rem;
        border-radius: 16px;
      }
      .gacha-popup h2 {
        font-size: 1.1rem !important;
        margin-bottom: 0.6rem !important;
      }
      .gacha-card {
        width: ${isTenPull ? 58 : 85}px;
        height: ${isTenPull ? 81 : 119}px;
      }
      .gacha-card-icon {
        font-size: ${isTenPull ? "1.4rem" : "2.1rem"};
      }
      .gacha-card-rarity {
        font-size: 0.45rem;
        padding: 0.06rem 0.28rem;
      }
      .gacha-card-name {
        font-size: ${isTenPull ? "0.48rem" : "0.55rem"};
      }
      .gacha-card-back::before {
        font-size: ${isTenPull ? "1.4rem" : "2.5rem"};
      }
      .gacha-grid {
        max-width: ${isTenPull ? 340 : 120}px;
        gap: 6px;
        padding: 0.4rem;
      }
      .gacha-close-btn {
        padding: 0.6rem 1.5rem;
        font-size: 0.9rem;
      }
      .gacha-skip-btn {
        padding: 0.4rem 1rem;
        font-size: 0.75rem;
      }
    }
    /* 超小屏幕适配 (≤360px) */
    @media (max-width: 360px) {
      .gacha-popup {
        max-width: 310px;
        width: 96%;
        padding: 0.7rem 0.8rem;
        border-radius: 14px;
      }
      .gacha-popup h2 {
        font-size: 1rem !important;
        margin-bottom: 0.5rem !important;
      }
      .gacha-card {
        width: ${isTenPull ? 50 : 75}px;
        height: ${isTenPull ? 70 : 105}px;
      }
      .gacha-card-icon {
        font-size: ${isTenPull ? "1.2rem" : "1.8rem"};
      }
      .gacha-card-rarity {
        font-size: 0.4rem;
        padding: 0.05rem 0.25rem;
      }
      .gacha-card-name {
        font-size: ${isTenPull ? "0.42rem" : "0.5rem"};
      }
      .gacha-card-back::before {
        font-size: ${isTenPull ? "1.2rem" : "2rem"};
      }
      .gacha-grid {
        max-width: ${isTenPull ? 290 : 100}px;
        gap: 5px;
        padding: 0.3rem;
      }
      .gacha-close-btn {
        padding: 0.5rem 1.2rem;
        font-size: 0.85rem;
      }
      .gacha-skip-btn {
        padding: 0.35rem 0.8rem;
        font-size: 0.7rem;
      }
    }
  `;
  document.head.appendChild(styleEl);

  // 创建卡片HTML
  const cardsHTML = results
    .map((item, index) => {
      const color = RARITY_COLORS[item.rarity] || RARITY_COLORS.common;
      const bgStart = `${color}15`;
      const bgEnd = `${color}35`;
      return `
        <div class="gacha-card" data-index="${index}" data-rarity="${
        item.rarity
      }"
             style="--card-bg-start: ${bgStart}; --card-bg-end: ${bgEnd}; --card-border: ${color}; --glow-color: ${color}80;">
          <div class="gacha-card-inner">
            <div class="gacha-card-face gacha-card-back"></div>
            <div class="gacha-card-face gacha-card-front">
              <div class="gacha-card-icon">${item.icon}</div>
              <div class="gacha-card-rarity" style="background: ${color};">
                ${RARITY_NAMES[item.rarity] || "未知"}
              </div>
              <div class="gacha-card-name">${item.name}</div>
            </div>
          </div>
        </div>
      `;
    })
    .join("");

  const popup = document.createElement("div");
  popup.className = "gacha-popup";
  popup.style.cssText = `
    background: linear-gradient(135deg, rgba(15, 23, 42, 0.95), rgba(30, 41, 59, 0.95));
    padding: 1.5rem 2rem;
    border-radius: 24px;
    max-width: 680px;
    width: 94%;
    max-height: 90vh;
    overflow-y: auto;
    box-shadow: 0 25px 80px rgba(0, 0, 0, 0.6);
    border: 1px solid rgba(99, 102, 241, 0.3);
    text-align: center;
  `;

  popup.innerHTML = `
    <h2 id="gachaTitle" style="color: #e0e7ff; margin-bottom: 1rem; font-size: 1.5rem;">
      🎊 ${isTenPull ? "十连抽取" : "单抽"} - 揭晓中...
    </h2>
    <div class="gacha-grid">
      ${cardsHTML}
    </div>
    <div style="margin-top: 1rem; min-height: 48px; display: flex; flex-direction: column; align-items: center; gap: 0.5rem;">
      ${
        isTenPull && GACHA_ANIMATION_CONFIG.skip.enabled
          ? `<button id="gachaSkipBtn" class="gacha-skip-btn" style="display: none;">
              ⏩ 跳过动画
            </button>`
          : ""
      }
      <button id="gachaCloseBtn" class="gacha-close-btn">
        ✓ 太棒了！
      </button>
    </div>
  `;

  overlay.appendChild(popup);
  document.body.appendChild(overlay);

  // 获取所有卡片和按钮
  const cards = popup.querySelectorAll(".gacha-card");
  const closeBtn = popup.querySelector("#gachaCloseBtn");
  const skipBtn = popup.querySelector("#gachaSkipBtn");
  const titleEl = popup.querySelector("#gachaTitle");

  // 从配置获取翻牌间隔
  const flipDelay = isTenPull
    ? GACHA_ANIMATION_CONFIG.flipDelay.tenPull
    : GACHA_ANIMATION_CONFIG.flipDelay.singlePull;
  let accumulatedDelay = GACHA_ANIMATION_CONFIG.flipDelay.initialDelay;
  let flippedCount = 0; // 已翻开的卡片数量

  /**
   * 快速翻开所有未翻的卡片（跳过动画时使用）
   */
  function quickFlipRemaining() {
    const quickInterval = GACHA_ANIMATION_CONFIG.skip.quickFlipInterval;
    let delay = 0;

    cards.forEach((card) => {
      if (!card.classList.contains("flipped")) {
        addGachaTimer(() => {
          // 直接翻开，不播放特效
          card.classList.add("flipped");
          const rarity = card.dataset.rarity;
          if (rarity === "epic") {
            card.classList.add("rarity-epic");
          } else if (rarity === "legendary") {
            card.classList.add("rarity-legendary");
          }
        }, delay);
        delay += quickInterval;
      }
    });

    // 所有卡片翻完后显示关闭按钮
    addGachaTimer(() => {
      if (skipBtn) skipBtn.style.display = "none";
      closeBtn.classList.add("visible");
      if (titleEl) titleEl.textContent = "🎊 抽取完成！";
    }, delay + 100);
  }

  /**
   * 处理跳过动画
   */
  function handleSkipAnimation() {
    if (gachaAnimationSkipped) return;
    gachaAnimationSkipped = true;

    // 清除所有待执行的定时器
    clearGachaAnimationTimers();

    // 快速翻开剩余卡片
    quickFlipRemaining();
  }

  // 十连抽时，延迟显示跳过按钮
  if (isTenPull && skipBtn && GACHA_ANIMATION_CONFIG.skip.enabled) {
    addGachaTimer(() => {
      // 只有在未完成所有翻牌时才显示跳过按钮
      if (flippedCount < cards.length && !gachaAnimationSkipped) {
        skipBtn.style.display = "inline-block";
        skipBtn.style.animation = "btnFadeIn 0.3s ease";
      }
    }, GACHA_ANIMATION_CONFIG.skip.showDelay);

    // 跳过按钮点击事件
    skipBtn.addEventListener("click", handleSkipAnimation);
  }

  // 自动逐个翻牌 - 带高稀有度特效（顺序播放）
  cards.forEach((card, index) => {
    const rarity = card.dataset.rarity;
    const itemData = results[index];
    const currentDelay = accumulatedDelay;

    addGachaTimer(() => {
      // 如果已跳过动画，则不执行
      if (gachaAnimationSkipped) return;

      flippedCount++;

      if (rarity === "legendary") {
        // 传说级特效
        playLegendaryReveal(card, overlay, itemData, () => {
          if (index === cards.length - 1) {
            if (skipBtn) skipBtn.style.display = "none";
            closeBtn.classList.add("visible");
            if (titleEl) titleEl.textContent = "🎊 抽取完成！";
          }
        });
      } else if (rarity === "epic") {
        // 史诗级特效
        playEpicReveal(card, itemData, () => {
          if (index === cards.length - 1) {
            if (skipBtn) skipBtn.style.display = "none";
            closeBtn.classList.add("visible");
            if (titleEl) titleEl.textContent = "🎊 抽取完成！";
          }
        });
      } else {
        // 普通/稀有直接翻开
        card.classList.add("flipped");
        if (index === cards.length - 1) {
          addGachaTimer(() => {
            if (skipBtn) skipBtn.style.display = "none";
            closeBtn.classList.add("visible");
            if (titleEl) titleEl.textContent = "🎊 抽取完成！";
          }, GACHA_ANIMATION_CONFIG.closeButton.showDelay);
        }
      }
    }, currentDelay);

    // 根据稀有度累加延迟时间（使用配置）
    if (rarity === "legendary") {
      accumulatedDelay += GACHA_ANIMATION_CONFIG.rarityDuration.legendary;
    } else if (rarity === "epic") {
      accumulatedDelay += GACHA_ANIMATION_CONFIG.rarityDuration.epic;
    } else {
      accumulatedDelay += flipDelay;
    }
  });

  // 关闭按钮 - 只能通过点击按钮关闭
  closeBtn.addEventListener("click", () => {
    // 清除所有定时器
    clearGachaAnimationTimers();
    gachaAnimationSkipped = true;

    overlay.style.animation = "gachaFadeIn 0.3s ease reverse";
    setTimeout(() => {
      overlay.remove();
      const style = document.getElementById("gachaAnimStyles");
      if (style) style.remove();
      // 清理特效样式
      const epicStyle = document.getElementById("epicRevealStyles");
      if (epicStyle) epicStyle.remove();
      const legendaryStyle = document.getElementById("legendaryRevealStyles");
      if (legendaryStyle) legendaryStyle.remove();
    }, 280);
  });
}

/**
 * 史诗级卡片揭示特效（紫色）
 */
function playEpicReveal(card, itemData, onComplete) {
  // 添加史诗特效样式
  if (!document.getElementById("epicRevealStyles")) {
    const style = document.createElement("style");
    style.id = "epicRevealStyles";
    style.textContent = `
      @keyframes epicGlowUp {
        0% { box-shadow: 0 0 0 rgba(168, 85, 247, 0); }
        100% { box-shadow: 0 0 30px rgba(168, 85, 247, 0.8), 0 0 60px rgba(168, 85, 247, 0.4); }
      }
      @keyframes epicPulse {
        0%, 100% { box-shadow: 0 0 30px rgba(168, 85, 247, 0.8), 0 0 60px rgba(168, 85, 247, 0.4); }
        50% { box-shadow: 0 0 45px rgba(168, 85, 247, 1), 0 0 90px rgba(168, 85, 247, 0.6); }
      }
      @keyframes epicAura {
        0% { opacity: 0; transform: scale(0.8); }
        50% { opacity: 1; transform: scale(1.2); }
        100% { opacity: 0; transform: scale(1.5); }
      }
      .epic-aura {
        position: absolute;
        inset: -20%;
        border-radius: 15px;
        background: radial-gradient(circle, rgba(168, 85, 247, 0.3) 0%, transparent 70%);
        pointer-events: none;
        z-index: -1;
      }
    `;
    document.head.appendChild(style);
  }

  // 压暗背景
  const overlay = card.closest("#gachaResultOverlay");
  if (overlay) {
    overlay.style.background = "rgba(0, 0, 0, 0.92)";
  }

  // 第一阶段：泛光出现（0-800ms）
  card.style.animation = "epicGlowUp 0.8s ease-out forwards";

  // 第二阶段：呼吸闪烁（800-1100ms）
  setTimeout(() => {
    card.style.animation = "epicPulse 0.6s ease-in-out 2";
  }, 800);

  // 第三阶段：翻开并显示光晕（1100ms）
  setTimeout(() => {
    card.classList.add("flipped");
    card.classList.add("rarity-epic");

    // 添加光晕残影
    const aura = document.createElement("div");
    aura.className = "epic-aura";
    aura.style.animation = "epicAura 0.8s ease-out forwards";
    card.appendChild(aura);

    setTimeout(() => aura.remove(), 800);

    // 恢复背景
    setTimeout(() => {
      if (overlay) overlay.style.background = "rgba(0, 0, 0, 0.85)";
      card.style.animation = "";
      if (onComplete) onComplete();
    }, 200);
  }, 1100);
}

/**
 * 传说级卡片揭示特效（金色）- 6阶段完整版
 * 阶段1: 高能蓄力（0.8-1.2s）- 金色包裹、粒子外溢、颤抖蓄力
 * 阶段2: 裂纹扩散（与蓄力后半段重叠）- 能量裂纹浮现并扩散
 * 阶段3: 爆裂瞬间（≤1帧）- 白色闪光、碎片飞散
 * 阶段4: 物品前冲（0.4-0.6s）- 物品从中心生成并向前冲出
 * 阶段5: 聚焦展示（0.8-1.5s）- 放射光辉、粒子漂浮
 * 阶段6: 回落收束（0.6-1.0s）- 物品回落、卡片重生
 */
function playLegendaryReveal(card, overlayEl, itemData, onComplete) {
  // 添加传说特效样式
  if (!document.getElementById("legendaryRevealStyles")) {
    const style = document.createElement("style");
    style.id = "legendaryRevealStyles";
    style.textContent = `
      /* ========== 阶段1：高能蓄力 ========== */
      @keyframes legendaryChargeGlow {
        0% {
          box-shadow: 0 0 10px rgba(251, 191, 36, 0.3), 0 0 20px rgba(251, 191, 36, 0.2);
          filter: brightness(1);
        }
        50% {
          box-shadow: 0 0 40px rgba(251, 191, 36, 0.9), 0 0 80px rgba(251, 191, 36, 0.5), 0 0 120px rgba(251, 191, 36, 0.3);
          filter: brightness(1.3);
        }
        100% {
          box-shadow: 0 0 60px rgba(255, 215, 0, 1), 0 0 120px rgba(251, 191, 36, 0.8), 0 0 180px rgba(251, 191, 36, 0.4);
          filter: brightness(1.6);
        }
      }

      /* 流动边缘辉光 */
      @keyframes legendaryEdgeFlow {
        0% { background-position: 0% 50%; }
        100% { background-position: 200% 50%; }
      }

      .legendary-edge-glow {
        position: absolute;
        inset: -4px;
        border-radius: 18px;
        background: linear-gradient(90deg,
          transparent, rgba(255, 215, 0, 0.8), rgba(255, 255, 200, 1), rgba(255, 215, 0, 0.8), transparent,
          transparent, rgba(255, 215, 0, 0.8), rgba(255, 255, 200, 1), rgba(255, 215, 0, 0.8), transparent);
        background-size: 200% 100%;
        animation: legendaryEdgeFlow 1s linear infinite;
        pointer-events: none;
        z-index: -1;
        mask: linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0);
        -webkit-mask: linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0);
        mask-composite: xor;
        -webkit-mask-composite: xor;
        padding: 4px;
      }

      /* 蓄力颤抖 - 频率递增 */
      @keyframes legendaryTremor1 {
        0%, 100% { transform: translate(0, 0) rotate(0deg); }
        25% { transform: translate(-1px, 0.5px) rotate(-0.3deg); }
        50% { transform: translate(1px, -0.5px) rotate(0.3deg); }
        75% { transform: translate(-0.5px, 1px) rotate(-0.2deg); }
      }
      @keyframes legendaryTremor2 {
        0%, 100% { transform: translate(0, 0) rotate(0deg); }
        20% { transform: translate(-2px, 1px) rotate(-0.5deg); }
        40% { transform: translate(2px, -1px) rotate(0.5deg); }
        60% { transform: translate(-1px, 2px) rotate(-0.3deg); }
        80% { transform: translate(1px, -2px) rotate(0.3deg); }
      }
      @keyframes legendaryTremor3 {
        0%, 100% { transform: translate(0, 0) rotate(0deg); }
        16% { transform: translate(-3px, 1.5px) rotate(-0.8deg); }
        33% { transform: translate(3px, -1.5px) rotate(0.8deg); }
        50% { transform: translate(-2px, 3px) rotate(-0.5deg); }
        66% { transform: translate(2px, -3px) rotate(0.5deg); }
        83% { transform: translate(-1px, 2px) rotate(-0.3deg); }
      }

      /* 蓄力粒子 - 缓慢外溢 */
      .legendary-charge-particle {
        position: absolute;
        width: 4px;
        height: 4px;
        background: radial-gradient(circle, #fffacd, #ffd700);
        border-radius: 50%;
        pointer-events: none;
        box-shadow: 0 0 6px #ffd700, 0 0 12px rgba(255, 215, 0, 0.5);
      }
      @keyframes chargeParticleFloat {
        0% {
          transform: translate(0, 0) scale(0.5);
          opacity: 0;
        }
        20% {
          opacity: 1;
          transform: translate(calc(var(--px) * 0.3), calc(var(--py) * 0.3)) scale(1);
        }
        100% {
          transform: translate(var(--px), var(--py)) scale(0.3);
          opacity: 0;
        }
      }

      /* ========== 阶段2：裂纹系统 ========== */
      .legendary-crack-container {
        position: absolute;
        inset: 0;
        overflow: hidden;
        border-radius: 15px;
        pointer-events: none;
        z-index: 10;
      }

      .legendary-crack {
        position: absolute;
        background: linear-gradient(90deg, transparent, rgba(255, 255, 200, 0.9), #ffd700, rgba(255, 255, 200, 0.9), transparent);
        transform-origin: left center;
        filter: blur(0.5px);
        box-shadow: 0 0 8px #ffd700, 0 0 15px rgba(255, 215, 0, 0.6);
      }

      @keyframes crackGrow {
        0% {
          width: 0;
          opacity: 0.5;
          filter: blur(0.5px) brightness(1);
        }
        60% {
          opacity: 1;
          filter: blur(0.3px) brightness(1.5);
        }
        100% {
          width: var(--crack-length);
          opacity: 1;
          filter: blur(0.2px) brightness(2);
        }
      }

      @keyframes crackFlicker {
        0%, 100% { opacity: 1; filter: brightness(1.5); }
        50% { opacity: 0.7; filter: brightness(2); }
      }

      /* ========== 阶段3：爆裂瞬间 ========== */
      .legendary-flash {
        position: fixed;
        inset: 0;
        background: radial-gradient(circle at 50% 50%,
          rgba(255, 255, 255, 1) 0%,
          rgba(255, 250, 200, 0.9) 20%,
          rgba(255, 215, 0, 0.6) 40%,
          transparent 70%);
        pointer-events: none;
        z-index: 99998;
      }

      @keyframes flashBurst {
        0% { opacity: 0; transform: scale(0.5); }
        15% { opacity: 1; transform: scale(1.2); }
        100% { opacity: 0; transform: scale(2); }
      }

      /* 卡片碎片 */
      .legendary-shard {
        position: absolute;
        background: linear-gradient(135deg, rgba(50, 50, 70, 0.9), rgba(30, 30, 50, 0.9));
        border: 2px solid rgba(255, 215, 0, 0.8);
        box-shadow: 0 0 10px rgba(255, 215, 0, 0.6), inset 0 0 5px rgba(255, 215, 0, 0.3);
        pointer-events: none;
      }

      @keyframes shardExplode {
        0% {
          transform: translate(0, 0) rotate(0deg) scale(1);
          opacity: 1;
        }
        40% {
          opacity: 1;
        }
        100% {
          transform: translate(var(--sx), var(--sy)) rotate(var(--sr)) scale(0);
          opacity: 0;
        }
      }

      /* ========== 阶段4：物品前冲 ========== */
      .legendary-item-reveal {
        position: fixed;
        z-index: 99999;
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        pointer-events: none;
      }

      .legendary-item-icon {
        flex-shrink: 0;
      }

      @keyframes itemBurstIn {
        0% {
          transform: scale(0.3) translateZ(-300px);
          opacity: 0;
          filter: brightness(3) blur(10px);
        }
        30% {
          filter: brightness(2.5) blur(5px);
        }
        60% {
          transform: scale(1.4) translateZ(100px);
          opacity: 1;
          filter: brightness(2) blur(0px);
        }
        80% {
          transform: scale(1.15) translateZ(50px);
        }
        100% {
          transform: scale(1.1) translateZ(0px);
          opacity: 1;
          filter: brightness(1.5) blur(0px);
        }
      }

      @keyframes itemBurstToCenter {
        0% {
          transform: scale(0.3) translateZ(-300px);
          opacity: 0;
          filter: brightness(3) blur(10px);
        }
        30% {
          filter: brightness(2.5) blur(5px);
        }
        60% {
          left: 50%;
          top: 50%;
          transform: translate(-50%, -50%) scale(1.4) translateZ(100px);
          opacity: 1;
          filter: brightness(2) blur(0px);
        }
        80% {
          left: 50%;
          top: 50%;
          transform: translate(-50%, -50%) scale(1.15) translateZ(50px);
        }
        100% {
          left: 50%;
          top: 50%;
          transform: translate(-50%, -50%) scale(1.1) translateZ(0px);
          opacity: 1;
          filter: brightness(1.5) blur(0px);
        }
      }

      /* ========== 阶段5：聚焦展示 ========== */
      .legendary-radiance {
        position: absolute;
        width: 600px;
        height: 600px;
        left: 50%;
        top: 50%;
        transform: translate(-50%, -50%);
        background: conic-gradient(from 0deg,
            transparent 0deg, rgba(255, 215, 0, 0.2) 8deg, transparent 16deg,
            transparent 22deg, rgba(255, 215, 0, 0.2) 30deg, transparent 38deg,
            transparent 44deg, rgba(255, 215, 0, 0.2) 52deg, transparent 60deg,
            transparent 66deg, rgba(255, 215, 0, 0.2) 74deg, transparent 82deg,
            transparent 88deg, rgba(255, 215, 0, 0.2) 96deg, transparent 104deg,
            transparent 110deg, rgba(255, 215, 0, 0.2) 118deg, transparent 126deg,
            transparent 132deg, rgba(255, 215, 0, 0.2) 140deg, transparent 148deg,
            transparent 154deg, rgba(255, 215, 0, 0.2) 162deg, transparent 170deg,
            transparent 176deg, rgba(255, 215, 0, 0.2) 184deg, transparent 192deg,
            transparent 198deg, rgba(255, 215, 0, 0.2) 206deg, transparent 214deg,
            transparent 220deg, rgba(255, 215, 0, 0.2) 228deg, transparent 236deg,
            transparent 242deg, rgba(255, 215, 0, 0.2) 250deg, transparent 258deg,
            transparent 264deg, rgba(255, 215, 0, 0.2) 272deg, transparent 280deg,
            transparent 286deg, rgba(255, 215, 0, 0.2) 294deg, transparent 302deg,
            transparent 308deg, rgba(255, 215, 0, 0.2) 316deg, transparent 324deg,
            transparent 330deg, rgba(255, 215, 0, 0.2) 338deg, transparent 346deg,
            transparent 352deg, rgba(255, 215, 0, 0.2) 360deg);
        pointer-events: none;
        z-index: -1;
        filter: blur(8px);
        mask: radial-gradient(circle, white 0%, white 40%, transparent 70%);
        -webkit-mask: radial-gradient(circle, white 0%, white 40%, transparent 70%);
      }

      /* 聚焦遮罩 - 突出主体 */
      .legendary-focus-overlay {
        position: absolute;
        inset: 0;
        background: radial-gradient(circle at 50% 50%, transparent 0%, transparent 15%, rgba(0, 0, 0, 0.5) 50%, rgba(0, 0, 0, 0.75) 100%);
        backdrop-filter: blur(6px);
        -webkit-backdrop-filter: blur(6px);
        pointer-events: none;
        z-index: 1;
      }

      @keyframes focusOverlayIn {
        0% { opacity: 0; }
        100% { opacity: 1; }
      }

      @keyframes focusOverlayOut {
        0% { opacity: 1; }
        100% { opacity: 0; }
      }

      @keyframes radianceExpand {
        0% {
          transform: translate(-50%, -50%) scale(0) rotate(0deg);
          opacity: 0;
        }
        40% {
          opacity: 1;
        }
        100% {
          transform: translate(-50%, -50%) scale(1) rotate(30deg);
          opacity: 0.8;
        }
      }

      @keyframes radiancePulse {
        0%, 100% {
          opacity: 0.6;
          transform: translate(-50%, -50%) scale(1) rotate(30deg);
        }
        50% {
          opacity: 0.9;
          transform: translate(-50%, -50%) scale(1.05) rotate(35deg);
        }
      }

      /* 环绕漂浮粒子 */
      .legendary-float-particle {
        position: absolute;
        width: 6px;
        height: 6px;
        background: radial-gradient(circle, #fffacd, #ffd700);
        border-radius: 50%;
        box-shadow: 0 0 10px #ffd700, 0 0 20px rgba(255, 215, 0, 0.5);
        pointer-events: none;
      }

      @keyframes particleOrbit {
        0% {
          transform: rotate(var(--start-angle)) translateX(var(--orbit-radius)) rotate(calc(-1 * var(--start-angle)));
          opacity: 0;
        }
        20% { opacity: 1; }
        80% { opacity: 1; }
        100% {
          transform: rotate(calc(var(--start-angle) + 120deg)) translateX(var(--orbit-radius)) rotate(calc(-1 * (var(--start-angle) + 120deg)));
          opacity: 0;
        }
      }

      /* ========== 阶段6：回落收束 ========== */
      @keyframes itemReturn {
        0% {
          transform: translate(-50%, -50%) scale(1.1);
          opacity: 1;
        }
        100% {
          transform: translate(-50%, -50%) scale(var(--return-scale));
          opacity: 0.8;
        }
      }

      @keyframes radianceFadeOut {
        0% { opacity: 0.8; }
        100% { opacity: 0; transform: translate(-50%, -50%) scale(1.3) rotate(60deg); }
      }

      @keyframes cardRegenerateFront {
        0% {
          opacity: 0;
          filter: brightness(2);
        }
        100% {
          opacity: 1;
          filter: brightness(1);
        }
      }

      /* 展示区物品信息 - 使用绝对定位避免挤压 */
      .legendary-item-info {
        position: absolute;
        top: calc(50% + 70px);
        left: 50%;
        transform: translateX(-50%);
        white-space: nowrap;
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: 8px;
      }

      .legendary-item-info .rarity-name {
        display: flex;
        align-items: center;
        justify-content: center;
        gap: 6px;
      }

      @keyframes infoFadeIn {
        0% {
          opacity: 0;
          transform: translateX(-50%) translateY(20px);
        }
        100% {
          opacity: 1;
          transform: translateX(-50%) translateY(0);
        }
      }
    `;
    document.head.appendChild(style);
  }

  const cardRect = card.getBoundingClientRect();
  const cardCenterX = cardRect.left + cardRect.width / 2;
  const cardCenterY = cardRect.top + cardRect.height / 2;

  // 存储所有需要清理的元素
  const cleanupElements = [];

  // 压暗背景（放慢2倍）
  overlayEl.style.transition = "background 0.6s ease";
  overlayEl.style.background = "rgba(0, 0, 0, 0.95)";

  // ========== 阶段1：高能蓄力（放慢2倍：0-2000ms）==========

  // 添加流动边缘辉光
  const edgeGlow = document.createElement("div");
  edgeGlow.className = "legendary-edge-glow";
  card.style.position = "relative";
  card.appendChild(edgeGlow);
  cleanupElements.push(edgeGlow);

  // 金色光芒包裹（放慢2倍：1s -> 2s）
  card.style.animation = "legendaryChargeGlow 2s ease-out forwards";

  // 启动粒子外溢效果（间隔放慢2倍：100ms -> 200ms）
  const chargeParticleInterval = setInterval(() => {
    for (let i = 0; i < 3; i++) {
      const particle = document.createElement("div");
      particle.className = "legendary-charge-particle";
      const angle = Math.random() * Math.PI * 2;
      const distance = 60 + Math.random() * 40;
      particle.style.cssText = `
        left: 50%;
        top: 50%;
        --px: ${Math.cos(angle) * distance}px;
        --py: ${Math.sin(angle) * distance}px;
        animation: chargeParticleFloat ${
          1.6 + Math.random() * 0.8
        }s ease-out forwards;
      `;
      card.appendChild(particle);
      setTimeout(() => particle.remove(), 2400);
    }
  }, 200);

  // 颤抖阶段1（放慢2倍：200ms -> 400ms，频率放慢：0.15s -> 0.3s）
  setTimeout(() => {
    card.style.animation =
      "legendaryChargeGlow 2s ease-out forwards, legendaryTremor1 0.3s ease-in-out infinite";
  }, 400);

  // 颤抖阶段2（放慢2倍：500ms -> 1000ms，频率放慢：0.1s -> 0.2s）
  setTimeout(() => {
    card.style.animation =
      "legendaryChargeGlow 2s ease-out forwards, legendaryTremor2 0.2s ease-in-out infinite";
  }, 1000);

  // ========== 阶段2：裂纹扩散（放慢2倍：1200-2400ms）==========

  setTimeout(() => {
    // 创建裂纹容器
    const crackContainer = document.createElement("div");
    crackContainer.className = "legendary-crack-container";
    card.appendChild(crackContainer);
    cleanupElements.push(crackContainer);

    // 生成随机裂纹
    const crackCount = 8;
    const cracks = [];

    for (let i = 0; i < crackCount; i++) {
      const crack = document.createElement("div");
      crack.className = "legendary-crack";

      // 随机起点（靠近中心）
      const startX = 30 + Math.random() * 40; // 30%-70%
      const startY = 30 + Math.random() * 40;

      // 随机方向和长度
      const angle = Math.random() * 360;
      const length = 20 + Math.random() * 35;

      // 裂纹生长动画放慢2倍
      crack.style.cssText = `
        left: ${startX}%;
        top: ${startY}%;
        height: ${1.5 + Math.random() * 1}px;
        --crack-length: ${length}px;
        transform: rotate(${angle}deg);
        animation: crackGrow ${0.6 + Math.random() * 0.6}s ease-out forwards;
        animation-delay: ${i * 120}ms;
      `;

      crackContainer.appendChild(crack);
      cracks.push(crack);

      // 裂纹分叉（放慢2倍）
      if (Math.random() > 0.5) {
        setTimeout(() => {
          const branch = document.createElement("div");
          branch.className = "legendary-crack";
          const branchAngle =
            angle + (Math.random() > 0.5 ? 30 : -30) + Math.random() * 20;
          const branchLength = 10 + Math.random() * 15;
          branch.style.cssText = `
            left: ${startX + Math.cos((angle * Math.PI) / 180) * length * 0.6}%;
            top: ${startY + Math.sin((angle * Math.PI) / 180) * length * 0.02}%;
            height: ${1 + Math.random() * 0.5}px;
            --crack-length: ${branchLength}px;
            transform: rotate(${branchAngle}deg);
            animation: crackGrow 0.4s ease-out forwards;
          `;
          crackContainer.appendChild(branch);
        }, 300 + i * 120); // 放慢2倍
      }
    }

    // 裂纹闪烁效果（放慢2倍：400ms -> 800ms，频率放慢：0.15s -> 0.3s）
    setTimeout(() => {
      cracks.forEach((crack) => {
        crack.style.animation = "crackFlicker 0.3s ease-in-out infinite";
      });
    }, 800);
  }, 1200); // 放慢2倍：600ms -> 1200ms

  // 颤抖阶段3（放慢2倍：900ms -> 1800ms，频率放慢：0.06s -> 0.12s）
  setTimeout(() => {
    card.style.animation =
      "legendaryChargeGlow 2s ease-out forwards, legendaryTremor3 0.12s ease-in-out infinite";
  }, 1800);

  // ========== 阶段3：爆裂瞬间（放慢2倍：2400ms）==========

  setTimeout(() => {
    // 停止粒子生成
    clearInterval(chargeParticleInterval);

    // 创建白色闪光（放慢2倍：0.25s -> 0.5s）
    const flash = document.createElement("div");
    flash.className = "legendary-flash";
    flash.style.animation = "flashBurst 0.5s ease-out forwards";
    overlayEl.appendChild(flash);
    setTimeout(() => flash.remove(), 500);

    // 轻微缩放冲击（放慢2倍）
    overlayEl.style.transform = "scale(1.02)";
    setTimeout(() => {
      overlayEl.style.transition = "transform 0.4s ease-out";
      overlayEl.style.transform = "scale(1)";
    }, 100);

    // 卡片爆裂 - 生成碎片
    card.style.visibility = "hidden";
    card.style.animation = "";

    // 清理蓄力阶段元素
    cleanupElements.forEach((el) => el.remove());
    cleanupElements.length = 0;

    // 生成碎片
    const shardCount = 12;
    for (let i = 0; i < shardCount; i++) {
      const shard = document.createElement("div");
      shard.className = "legendary-shard";

      // 碎片位置和大小
      const col = i % 4;
      const row = Math.floor(i / 4);
      const shardWidth = cardRect.width / 4;
      const shardHeight = cardRect.height / 3;

      // 飞散方向（从中心向外）
      const centerOffsetX = (col - 1.5) * shardWidth;
      const centerOffsetY = (row - 1) * shardHeight;
      const distance = 150 + Math.random() * 100;
      const normalizedX = centerOffsetX / (cardRect.width / 2);
      const normalizedY = centerOffsetY / (cardRect.height / 2);
      const flyX = normalizedX * distance * (1 + Math.random() * 0.5);
      const flyY = normalizedY * distance * (1 + Math.random() * 0.5);
      const rotation = (Math.random() - 0.5) * 720;

      // 碎片动画放慢2倍：0.5s -> 1s
      shard.style.cssText = `
        position: fixed;
        left: ${cardRect.left + col * shardWidth}px;
        top: ${cardRect.top + row * shardHeight}px;
        width: ${shardWidth}px;
        height: ${shardHeight}px;
        --sx: ${flyX}px;
        --sy: ${flyY}px;
        --sr: ${rotation}deg;
        animation: shardExplode 1s ease-out forwards;
        z-index: 99997;
      `;

      overlayEl.appendChild(shard);

      // 碎片消散时创建金色粒子（放慢2倍：200ms -> 400ms，动画0.4s -> 0.8s）
      setTimeout(() => {
        for (let j = 0; j < 3; j++) {
          const sparkle = document.createElement("div");
          sparkle.className = "legendary-charge-particle";
          sparkle.style.cssText = `
            position: fixed;
            left: ${
              cardRect.left + col * shardWidth + flyX * 0.7 + Math.random() * 20
            }px;
            top: ${
              cardRect.top + row * shardHeight + flyY * 0.7 + Math.random() * 20
            }px;
            --px: ${(Math.random() - 0.5) * 40}px;
            --py: ${(Math.random() - 0.5) * 40}px;
            animation: chargeParticleFloat 0.8s ease-out forwards;
            z-index: 99997;
          `;
          overlayEl.appendChild(sparkle);
          setTimeout(() => sparkle.remove(), 800);
        }
      }, 400);

      setTimeout(() => shard.remove(), 1000); // 放慢2倍
    }

    // ========== 阶段4：物品前冲（从卡片位置生成）==========

    setTimeout(() => {
      const itemReveal = document.createElement("div");
      itemReveal.className = "legendary-item-reveal";

      // 从卡片中心位置开始
      itemReveal.style.cssText = `
        left: ${cardCenterX}px;
        top: ${cardCenterY}px;
        transform: translate(-50%, -50%) scale(0.3);
      `;

      // 创建物品图标
      const color = RARITY_COLORS.legendary;
      const iconEl = document.createElement("div");
      iconEl.className = "legendary-item-icon";
      iconEl.style.cssText = `
        font-size: 6rem;
        z-index: 2;
        filter: drop-shadow(0 0 30px ${color}) drop-shadow(0 0 60px ${color});
      `;
      iconEl.textContent = itemData.icon;
      itemReveal.appendChild(iconEl);

      overlayEl.appendChild(itemReveal);

      // 物品从卡片位置冲向屏幕中心（放慢2倍：0.5s -> 1s）
      requestAnimationFrame(() => {
        itemReveal.style.transition = "all 1s cubic-bezier(0.16, 1, 0.3, 1)";
        itemReveal.style.left = "50%";
        itemReveal.style.top = "50%";
        itemReveal.style.transform = "translate(-50%, -50%) scale(1.1)";
        itemReveal.style.filter = "brightness(1.5)";
      });

      // ========== 阶段5：聚焦展示 ==========

      setTimeout(() => {
        // 移除过渡，固定位置
        itemReveal.style.transition = "none";

        // 创建放射光辉（放慢2倍：0.6s -> 1.2s）
        const radiance = document.createElement("div");
        radiance.className = "legendary-radiance";
        radiance.style.animation = "radianceExpand 1.2s ease-out forwards";
        itemReveal.insertBefore(radiance, iconEl);

        // 切换到脉动动画（放慢2倍：1.5s -> 3s）
        setTimeout(() => {
          radiance.style.animation = "radiancePulse 3s ease-in-out infinite";
        }, 1200);

        // 添加环绕漂浮粒子（放慢2倍）
        const floatParticleCount = 12;
        for (let i = 0; i < floatParticleCount; i++) {
          const particle = document.createElement("div");
          particle.className = "legendary-float-particle";
          const startAngle = (i / floatParticleCount) * 360;
          const orbitRadius = 100 + Math.random() * 50;
          particle.style.cssText = `
            --start-angle: ${startAngle}deg;
            --orbit-radius: ${orbitRadius}px;
            animation: particleOrbit ${
              4 + Math.random() * 2
            }s ease-in-out infinite;
            animation-delay: ${i * 0.2}s;
          `;
          itemReveal.appendChild(particle);
        }

        // 显示物品信息（放慢2倍：0.5s -> 1s）
        const infoEl = document.createElement("div");
        infoEl.className = "legendary-item-info";
        infoEl.style.animation = "infoFadeIn 1s ease-out 0.6s both";
        infoEl.innerHTML = `
          <div class="rarity-name" style="color: ${color}; font-size: 0.9rem; font-weight: 700; text-transform: uppercase; text-shadow: 0 0 15px ${color};">
            ✦ ${RARITY_NAMES.legendary} ✦
          </div>
          <div style="color: #fff; font-size: 1.6rem; font-weight: 700; text-shadow: 0 2px 15px rgba(0,0,0,0.5);">
            ${itemData.name}
          </div>
        `;
        itemReveal.appendChild(infoEl);

        // 创建聚焦遮罩 - 突出主体（添加到抽卡界面容器）
        const focusOverlay = document.createElement("div");
        focusOverlay.className = "legendary-focus-overlay";
        focusOverlay.style.animation = "focusOverlayIn 0.8s ease-out forwards";
        overlayEl.appendChild(focusOverlay);

        // ========== 阶段6：回落收束 ==========

        setTimeout(() => {
          const returnScale = cardRect.width / 150;

          // 放射光辉淡出（放慢2倍：0.6s -> 1.2s）
          radiance.style.animation = "radianceFadeOut 1.2s ease-out forwards";

          // 隐藏信息和粒子（放慢2倍：0.3s -> 0.6s）
          infoEl.style.transition = "opacity 0.6s ease-out";
          infoEl.style.opacity = "0";

          // 聚焦遮罩淡出
          focusOverlay.style.animation = "focusOverlayOut 1s ease-out forwards";
          setTimeout(() => focusOverlay.remove(), 1000);

          itemReveal
            .querySelectorAll(".legendary-float-particle")
            .forEach((p) => {
              p.style.transition = "opacity 0.6s ease-out";
              p.style.opacity = "0";
            });

          // 同时：物品回落 + 卡片重生（放慢2倍：0.7s -> 1.4s）
          itemReveal.style.transition =
            "all 1.4s cubic-bezier(0.34, 1.56, 0.64, 1)";
          itemReveal.style.left = `${cardCenterX}px`;
          itemReveal.style.top = `${cardCenterY}px`;
          itemReveal.style.transform = `translate(-50%, -50%) scale(${returnScale})`;
          itemReveal.style.opacity = "0";

          // 同时：卡片直接显示正面（已翻开状态）
          card.classList.add("flipped");
          card.classList.add("rarity-legendary");
          card.style.visibility = "visible";
          card.style.opacity = "0";
          card.style.animation = "cardRegenerateFront 1.4s ease-out forwards";

          // 清理并完成（放慢2倍：0.7s -> 1.4s）
          setTimeout(() => {
            itemReveal.remove();

            // 恢复背景（放慢2倍：0.5s -> 1s）
            overlayEl.style.transition = "background 1s ease";
            overlayEl.style.background = "rgba(0, 0, 0, 0.85)";
            overlayEl.style.transform = "";

            if (onComplete) onComplete();
          }, 1400);
        }, 2600); // 展示时间放慢2倍：1.3s -> 2.6s
      }, 1000); // 前冲完成后进入展示阶段（放慢2倍：0.5s -> 1s）
    }, 400); // 爆裂后开始物品前冲（放慢2倍：0.2s -> 0.4s）
  }, 2400); // 爆裂时间放慢2倍：1.2s -> 2.4s
}

// =================================================================
// 特效系统
// =================================================================

/**
 * 播放下粑粑雨特效
 */
function playPoopRainEffect() {
  const container = document.createElement("div");
  container.id = "poopRainContainer";
  container.style.cssText = `
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    pointer-events: none;
    z-index: 99999;
    overflow: hidden;
  `;

  // 创建样式
  const style = document.createElement("style");
  style.id = "poopRainStyles";
  style.textContent = `
    @keyframes poopFall {
      0% {
        transform: translateY(-50vh) rotate(0deg);
        opacity: 0;
      }
      5% {
        opacity: 1;
      }
      95% {
        opacity: 1;
      }
      100% {
        transform: translateY(calc(100vh + 50px)) rotate(var(--rotate-end, 720deg));
        opacity: 0;
      }
    }
    .poop-emoji {
      position: absolute;
      top: 0;
      font-size: 2rem;
      animation: poopFall ease-in forwards;
      text-shadow: 0 2px 8px rgba(0, 0, 0, 0.3);
      will-change: transform, opacity;
    }
  `;
  document.head.appendChild(style);

  // 生成80个粑粑
  const poopCount = 50;
  for (let i = 0; i < poopCount; i++) {
    setTimeout(() => {
      const poop = document.createElement("div");
      poop.className = "poop-emoji";
      poop.textContent = "💩";

      // 随机水平位置
      const randomX = Math.random() * 100;
      poop.style.left = `${randomX}%`;

      // 随机下落速度（1-3.5秒，更慢）
      const duration = 1 + Math.random() * 2.5;
      poop.style.animationDuration = `${duration}s`;

      // 随机旋转角度（360-1080度）
      const rotation = 360 + Math.random() * 720;
      poop.style.setProperty("--rotate-end", `${rotation}deg`);

      // 随机大小（0.7-1.8倍，变化更大）
      const scale = 0.7 + Math.random() * 1.1;
      poop.style.fontSize = `${2 * scale}rem`;

      container.appendChild(poop);

      // 动画结束后移除元素
      poop.addEventListener("animationend", () => {
        poop.remove();
      });
    }, i * 50); // 每50ms生成一个（更快）
  }

  document.body.appendChild(container);

  // 5秒后移除容器和样式
  setTimeout(() => {
    container.remove();
    const styleEl = document.getElementById("poopRainStyles");
    if (styleEl) styleEl.remove();
  }, 10000);
}
