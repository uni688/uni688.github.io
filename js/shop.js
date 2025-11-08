// 商店系统脚本

// 商品数据
const SHOP_DATA = {
  themes: [
    {
      id: "theme_forest",
      name: "森林绿野",
      description: "清新的森林主题，让学习更加放松",
      icon: "🌲",
      price: 500,
      rarity: "common",
    },
    {
      id: "theme_ocean",
      name: "深海蓝调",
      description: "宁静的海洋主题，沉浸式学习体验",
      icon: "🌊",
      price: 800,
      rarity: "rare",
    },
    {
      id: "theme_sunset",
      name: "日落余晖",
      description: "温暖的日落主题，舒适的视觉享受",
      icon: "🌅",
      price: 1000,
      rarity: "rare",
    },
    {
      id: "theme_galaxy",
      name: "星河璀璨",
      description: "梦幻的星空主题，探索知识宇宙",
      icon: "🌌",
      price: 1500,
      rarity: "epic",
    },
    {
      id: "theme_cherry",
      name: "樱花纷飞",
      description: "浪漫的樱花主题，诗意般的学习",
      icon: "🌸",
      price: 2000,
      rarity: "legendary",
    },
  ],
  items: [
    {
      id: "item_hint_boost",
      name: "提示加速器",
      description: "获取提示时额外赠送一个高级提示",
      icon: "💡",
      price: 300,
      rarity: "common",
    },
    {
      id: "item_exp_boost",
      name: "经验倍增卡",
      description: "30分钟内经验值获取翻倍",
      icon: "✨",
      price: 500,
      rarity: "rare",
    },
    {
      id: "item_coin_boost",
      name: "金币加成",
      description: "1小时内金币获取增加50%",
      icon: "💰",
      price: 600,
      rarity: "rare",
    },
    {
      id: "item_lucky_charm",
      name: "幸运符",
      description: "提高抽卡稀有度，持续3次抽卡",
      icon: "🍀",
      price: 1000,
      rarity: "epic",
    },
  ],
};

// 抽卡池配置
const GACHA_POOL = [
  // 普通 (70%)
  ...SHOP_DATA.themes.filter((t) => t.rarity === "common"),
  ...SHOP_DATA.items.filter((i) => i.rarity === "common"),
  // 稀有 (20%)
  ...SHOP_DATA.themes.filter((t) => t.rarity === "rare"),
  ...SHOP_DATA.items.filter((i) => i.rarity === "rare"),
  // 史诗 (8%)
  ...SHOP_DATA.themes.filter((t) => t.rarity === "epic"),
  ...SHOP_DATA.items.filter((i) => i.rarity === "epic"),
  // 传说 (2%)
  ...SHOP_DATA.themes.filter((t) => t.rarity === "legendary"),
];

/**
 * 初始化商店页面
 */
function initShopPage() {
  initializeStorage();
  initializeUserProfile();
  initializeInventory();
  updateCoinDisplay();
  loadShopItems();
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
 * 更新金币显示
 */
function updateCoinDisplay() {
  const profile = getUserProfile();
  document.getElementById("coinBalance").textContent = profile.coins;
}

/**
 * 切换标签页
 */
function switchTab(tabName) {
  // 更新标签按钮状态
  document.querySelectorAll(".tab-btn").forEach((btn) => {
    btn.classList.remove("active");
    if (btn.dataset.tab === tabName) {
      btn.classList.add("active");
    }
  });

  // 切换内容显示
  document.querySelectorAll(".tab-content").forEach((content) => {
    content.style.display = "none";
  });
  document.getElementById(`tab-${tabName}`).style.display = "block";

  // 加载对应内容
  if (tabName === "inventory") {
    loadInventory();
  }
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

  SHOP_DATA.themes.forEach((theme) => {
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

  SHOP_DATA.items.forEach((item) => {
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

  const rarityColors = {
    common: "#94a3b8",
    rare: "#3b82f6",
    epic: "#a855f7",
    legendary: "#f59e0b",
  };

  card.innerHTML = `
    <div class="item-preview" style="background: linear-gradient(135deg, ${
      rarityColors[item.rarity]
    }20, ${rarityColors[item.rarity]}40);">
      ${item.icon}
    </div>
    <div class="item-info">
      <div class="item-name">${item.name}</div>
      <div class="item-desc">${item.description}</div>
      <div class="item-footer">
        <div class="item-price">${item.price} 💰</div>
        ${
          isOwned
            ? '<span class="owned-badge">已拥有</span>'
            : `<button class="buy-btn" onclick="buyItem('${item.id}', '${type}')">购买</button>`
        }
      </div>
    </div>
  `;

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

  // 检查金币是否足够
  if (profile.coins < item.price) {
    showToast("金币不足！", "error");
    return;
  }

  // 扣除金币
  const success = deductCoins(item.price);
  if (!success) return;

  // 添加到物品库
  const inventory = initializeInventory();
  if (!inventory.owned.includes(itemId)) {
    inventory.owned.push(itemId);
    safeSetItem(STORAGE_KEYS.USER_INVENTORY, inventory);
  }

  showToast(`🎉 成功购买 ${item.name}！`, "success");

  // 刷新显示
  updateCoinDisplay();
  loadShopItems();
}

/**
 * 加载我的物品
 */
function loadInventory() {
  const container = document.getElementById("inventoryGrid");
  const inventory = initializeInventory();
  const allItems = [...SHOP_DATA.themes, ...SHOP_DATA.items];

  container.innerHTML = "";

  if (inventory.owned.length === 0) {
    container.innerHTML = `
      <p style="grid-column: 1/-1; text-align: center; color: #64748b; padding: 3rem;">
        还没有购买任何物品<br>
        快去商店看看吧！
      </p>
    `;
    return;
  }

  inventory.owned.forEach((itemId) => {
    const item = allItems.find((i) => i.id === itemId);
    if (!item) return;

    const card = document.createElement("div");
    card.className = "shop-item";

    const isEquipped = inventory.equipped === itemId;
    const isTheme = itemId.startsWith("theme_");

    card.innerHTML = `
      <div class="item-preview">
        ${item.icon}
      </div>
      <div class="item-info">
        <div class="item-name">${item.name}</div>
        <div class="item-desc">${item.description}</div>
        <div class="item-footer">
          ${
            isTheme
              ? isEquipped
                ? '<span class="owned-badge" style="background: #10b981;">使用中</span>'
                : `<button class="buy-btn" onclick="equipTheme('${itemId}')">装备</button>`
              : `<button class="buy-btn" onclick="useItem('${itemId}')">使用</button>`
          }
        </div>
      </div>
    `;

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

  showToast("主题已装备！刷新页面生效", "success");
  loadInventory();
}

/**
 * 使用道具
 */
function useItem(itemId) {
  showToast("道具效果功能开发中...", "info");
  // TODO: 实现道具效果
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
    if (!inventory.owned.includes(item.id)) {
      inventory.owned.push(item.id);
      safeSetItem(STORAGE_KEYS.USER_INVENTORY, inventory);
    }
  }

  // 显示抽卡结果
  showGachaResults(results);

  // 刷新显示
  updateCoinDisplay();
}

/**
 * 执行单次抽卡
 */
function performGacha() {
  const rarityRates = {
    common: 0.7,
    rare: 0.2,
    epic: 0.08,
    legendary: 0.02,
  };

  const random = Math.random();
  let rarity;

  if (random < rarityRates.legendary) {
    rarity = "legendary";
  } else if (random < rarityRates.legendary + rarityRates.epic) {
    rarity = "epic";
  } else if (
    random <
    rarityRates.legendary + rarityRates.epic + rarityRates.rare
  ) {
    rarity = "rare";
  } else {
    rarity = "common";
  }

  // 从对应稀有度池中随机选择
  const pool = GACHA_POOL.filter((item) => item.rarity === rarity);
  return pool[Math.floor(Math.random() * pool.length)];
}

/**
 * 显示抽卡结果
 */
function showGachaResults(results) {
  const overlay = document.createElement("div");
  overlay.style.cssText = `
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background: rgba(0,0,0,0.7);
    z-index: 9999;
  `;

  const rarityColors = {
    common: "#94a3b8",
    rare: "#3b82f6",
    epic: "#a855f7",
    legendary: "#f59e0b",
  };

  const rarityNames = {
    common: "普通",
    rare: "稀有",
    epic: "史诗",
    legendary: "传说",
  };

  const resultHTML = results
    .map(
      (item) => `
    <div class="result-item">${item.icon}</div>
    <h3 style="color: ${rarityColors[item.rarity]}; margin: 0.5rem 0;">
      ${rarityNames[item.rarity]} - ${item.name}
    </h3>
  `
    )
    .join("");

  const popup = document.createElement("div");
  popup.className = "gacha-result";
  popup.innerHTML = `
    <h2 style="color: var(--primary); margin-bottom: 1rem;">
      🎊 恭喜获得
    </h2>
    ${resultHTML}
    <button class="btn" onclick="this.parentElement.parentElement.remove()"
      style="margin-top: 2rem; background: var(--primary);">
      太棒了！
    </button>
  `;

  overlay.appendChild(popup);
  document.body.appendChild(overlay);

  // 5秒后自动关闭
  setTimeout(() => {
    overlay.remove();
  }, 5000);
}
