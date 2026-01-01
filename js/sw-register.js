// =================================================================
// Service Worker 注册 & PWA 安装提示管理
// AI English Learning Assistant
// =================================================================

let deferredPrompt = null; // 存储安装提示事件
let isInstallPromptDismissed = false; // 用户是否已拒绝安装
let isPageInteractive = false; // 页面是否已进入交互状态

// 安装提示配置
const INSTALL_PROMPT_CONFIG = {
  showDelay: 30000, // 30秒后显示安装提示
  dismissCooldown: 7 * 24 * 60 * 60 * 1000, // 拒绝后7天内不再显示
};

// =================================================================
// 监听页面交互状态
// =================================================================
// 页面加载完成后,标记为可交互
window.addEventListener("load", () => {
  // 延迟标记,确保用户真正开始使用
  setTimeout(() => {
    isPageInteractive = true;
    console.log("[SW注册] 页面已进入交互状态");
  }, 3000); // 3秒后认为用户开始使用
});

// =================================================================
// Service Worker 注册
// =================================================================
if ("serviceWorker" in navigator) {
  window.addEventListener("load", registerServiceWorker);

  // 监听来自 Service Worker 的消息
  navigator.serviceWorker.addEventListener("message", (event) => {
    if (event.data && event.data.type === "SW_UPDATED") {
      console.log("[SW更新] 收到更新通知，新版本:", event.data.version);

      // 判断是否在交互状态
      if (isPageInteractive) {
        // 用户正在使用,显示更新提示
        showUpdateNotification();
      } else {
        // 页面刚加载,直接静默更新
        console.log("[SW更新] 页面加载中,执行静默更新");
        silentUpdate();
      }
    }
  });
}

async function registerServiceWorker() {
  try {
    console.log("[SW注册] 开始注册 Service Worker...");

    const registration = await navigator.serviceWorker.register("/sw.js", {
      scope: "/",
    });

    console.log("[SW注册] Service Worker 注册成功:", registration.scope);

    // 监听更新
    registration.addEventListener("updatefound", () => {
      console.log("[SW注册] 发现新版本 Service Worker");
      handleServiceWorkerUpdate(registration);
    });

    // 定期检查更新（每小时）
    setInterval(() => {
      console.log("[SW注册] 定期检查更新...");
      registration.update();
    }, 60 * 60 * 1000);

    // 立即检查是否有更新
    registration.update();
  } catch (error) {
    console.error("[SW注册] Service Worker 注册失败:", error);
  }
}

// =================================================================
// Service Worker 更新处理
// =================================================================
function handleServiceWorkerUpdate(registration) {
  const installingWorker = registration.installing;

  if (!installingWorker) return;

  installingWorker.addEventListener("statechange", () => {
    console.log("[SW更新] Service Worker 状态:", installingWorker.state);

    if (
      installingWorker.state === "installed" &&
      navigator.serviceWorker.controller
    ) {
      // 有新版本可用
      console.log("[SW更新] 新版本已安装,等待激活");

      // 判断是否在交互状态
      if (isPageInteractive) {
        // 用户正在使用,显示更新提示
        showUpdateNotification();
      } else {
        // 页面刚加载,直接静默更新
        console.log("[SW更新] 页面加载中,执行静默更新");
        silentUpdate();
      }
    }
  });
}

// 静默更新 - 页面加载时直接更新
function silentUpdate() {
  console.log("[SW更新] 执行静默更新...");

  // 发送跳过等待消息
  if (navigator.serviceWorker.controller) {
    navigator.serviceWorker.controller.postMessage({
      type: "SKIP_WAITING",
    });
  }

  // 静默刷新页面
  setTimeout(() => {
    window.location.reload();
  }, 500);
}

// 显示更新通知 - 用户使用过程中提示更新
function showUpdateNotification() {
  // 如果通知已存在,不重复显示
  if (document.getElementById("updateNotification")) {
    return;
  }

  const notification = document.createElement("div");
  notification.id = "updateNotification";
  notification.className = "update-notification";
  notification.innerHTML = `
    <div class="update-content">
      <p>🎉 发现新版本!</p>
      <button id="updateButton" class="update-btn">立即更新</button>
      <button id="dismissUpdateButton" class="dismiss-btn">稍后</button>
    </div>
  `;

  document.body.appendChild(notification);

  // 立即更新按钮
  document.getElementById("updateButton").addEventListener("click", () => {
    console.log("[SW更新] 用户确认更新");

    // 发送跳过等待消息
    if (navigator.serviceWorker.controller) {
      navigator.serviceWorker.controller.postMessage({
        type: "SKIP_WAITING",
      });
    }

    // 刷新页面以使用新版本
    window.location.reload();
  });

  // 稍后按钮
  document
    .getElementById("dismissUpdateButton")
    .addEventListener("click", () => {
      notification.remove();
    });
}

// =================================================================
// PWA 安装提示管理
// =================================================================
window.addEventListener("beforeinstallprompt", (event) => {
  console.log("[安装提示] beforeinstallprompt 事件触发");

  // 阻止默认的安装提示
  event.preventDefault();

  // 存储事件以供后续使用
  deferredPrompt = event;

  // 检查是否在冷却期内
  if (isInDismissCooldown()) {
    console.log("[安装提示] 在冷却期内,不显示提示");
    return;
  }

  // 延迟显示安装提示 (30秒后)
  setTimeout(() => {
    if (!isInstallPromptDismissed && deferredPrompt) {
      showInstallPrompt();
    }
  }, INSTALL_PROMPT_CONFIG.showDelay);
});

// 显示安装提示
function showInstallPrompt() {
  console.log("[安装提示] 显示安装提示");

  const prompt = document.createElement("div");
  prompt.id = "installPrompt";
  prompt.className = "install-prompt";
  prompt.innerHTML = `
    <div class="install-content">
      <div class="install-icon">📱</div>
      <div class="install-text">
        <p class="install-title">安装到主屏幕</p>
        <p class="install-desc">离线使用,体验更流畅!</p>
      </div>
      <div class="install-actions">
        <button id="installButton" class="install-btn">安装</button>
        <button id="dismissButton" class="dismiss-btn">×</button>
      </div>
    </div>
  `;

  document.body.appendChild(prompt);

  // 安装按钮
  document
    .getElementById("installButton")
    .addEventListener("click", async () => {
      console.log("[安装提示] 用户点击安装");

      if (!deferredPrompt) {
        console.warn("[安装提示] deferredPrompt 不可用");
        return;
      }

      // 显示安装提示
      deferredPrompt.prompt();

      // 等待用户响应
      const { outcome } = await deferredPrompt.userChoice;
      console.log("[安装提示] 用户选择:", outcome);

      if (outcome === "accepted") {
        console.log("[安装提示] 用户接受安装");
      } else {
        console.log("[安装提示] 用户拒绝安装");
        saveDismissTimestamp(); // 记录拒绝时间
      }

      // 清理
      deferredPrompt = null;
      prompt.remove();
    });

  // 关闭按钮
  document.getElementById("dismissButton").addEventListener("click", () => {
    console.log("[安装提示] 用户关闭提示");
    isInstallPromptDismissed = true;
    saveDismissTimestamp(); // 记录关闭时间
    prompt.remove();
    deferredPrompt = null;
  });
}

// 检查是否在冷却期内
function isInDismissCooldown() {
  const dismissTimestamp = localStorage.getItem("installPromptDismissTime");
  if (!dismissTimestamp) return false;

  const now = Date.now();
  const dismissTime = parseInt(dismissTimestamp, 10);
  const cooldownEnd = dismissTime + INSTALL_PROMPT_CONFIG.dismissCooldown;

  return now < cooldownEnd;
}

// 保存拒绝时间戳
function saveDismissTimestamp() {
  localStorage.setItem("installPromptDismissTime", Date.now().toString());
}

// 监听 PWA 安装成功
window.addEventListener("appinstalled", (event) => {
  console.log("[PWA] 应用安装成功", event);

  // 移除安装提示 (如果还在显示)
  const prompt = document.getElementById("installPrompt");
  if (prompt) {
    prompt.remove();
  }

  // 清除拒绝记录
  localStorage.removeItem("installPromptDismissTime");

  // 可选: 显示感谢提示
  showInstallSuccessMessage();
});

// 显示安装成功消息
function showInstallSuccessMessage() {
  const message = document.createElement("div");
  message.className = "install-success-message";
  message.textContent = "✅ 安装成功!现在可以离线使用了";
  document.body.appendChild(message);

  setTimeout(() => {
    message.remove();
  }, 3000);
}

// =================================================================
// 在线/离线状态管理
// =================================================================
window.addEventListener("online", handleOnline);
window.addEventListener("offline", handleOffline);

// 页面加载时检查初始状态
window.addEventListener("load", () => {
  if (!navigator.onLine) {
    handleOffline();
  }
});

// 在线处理
function handleOnline() {
  console.log("[网络状态] 恢复在线");

  // 移除离线模式样式
  document.body.classList.remove("offline-mode");

  // 显示恢复在线提示
  showTemporaryMessage("✅ 网络已恢复", "success");
}

// 离线处理
function handleOffline() {
  console.log("[网络状态] 进入离线模式");

  // 添加离线模式样式
  document.body.classList.add("offline-mode");

  // 显示离线提示
  showTemporaryMessage("⚠️ 网络已断开，进入离线模式", "warning");
}

// 显示临时消息
function showTemporaryMessage(text, type = "info") {
  const message = document.createElement("div");
  message.className = `temporary-message temporary-message-${type}`;
  message.textContent = text;
  document.body.appendChild(message);

  setTimeout(() => {
    message.remove();
  }, 3000);
}

// =================================================================
// 缓存管理工具 (供管理页面使用)
// =================================================================
window.cacheManager = {
  // 清除所有缓存
  async clearAll() {
    if (!navigator.serviceWorker.controller) {
      console.warn("[缓存管理] Service Worker 未激活");
      return false;
    }

    try {
      console.log("[缓存管理] 清除所有缓存...");

      // 发送清理消息给 Service Worker
      navigator.serviceWorker.controller.postMessage({
        type: "CLEAR_CACHE",
      });

      // 等待响应
      return new Promise((resolve) => {
        const handleMessage = (event) => {
          if (event.data && event.data.type === "CACHE_CLEARED") {
            console.log("[缓存管理] 缓存已清除");
            navigator.serviceWorker.removeEventListener(
              "message",
              handleMessage
            );
            resolve(true);
          }
        };

        navigator.serviceWorker.addEventListener("message", handleMessage);

        // 超时处理
        setTimeout(() => {
          navigator.serviceWorker.removeEventListener("message", handleMessage);
          resolve(false);
        }, 5000);
      });
    } catch (error) {
      console.error("[缓存管理] 清除缓存失败:", error);
      return false;
    }
  },

  // 获取缓存信息
  async getInfo() {
    if (!navigator.serviceWorker.controller) {
      console.warn("[缓存管理] Service Worker 未激活");
      return null;
    }

    try {
      console.log("[缓存管理] 获取缓存信息...");

      // 发送获取信息消息给 Service Worker
      navigator.serviceWorker.controller.postMessage({
        type: "GET_CACHE_INFO",
      });

      // 等待响应
      return new Promise((resolve) => {
        const handleMessage = (event) => {
          if (event.data && event.data.type === "CACHE_INFO") {
            console.log("[缓存管理] 缓存信息:", event.data.data);
            navigator.serviceWorker.removeEventListener(
              "message",
              handleMessage
            );
            resolve(event.data.data);
          }
        };

        navigator.serviceWorker.addEventListener("message", handleMessage);

        // 超时处理
        setTimeout(() => {
          navigator.serviceWorker.removeEventListener("message", handleMessage);
          resolve(null);
        }, 5000);
      });
    } catch (error) {
      console.error("[缓存管理] 获取缓存信息失败:", error);
      return null;
    }
  },
};

console.log("[SW注册] Service Worker 注册脚本已加载");
