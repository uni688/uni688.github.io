// =================================================================
// Service Worker - AI English Learning Assistant
// 版本: 0.3.8
// =================================================================

const CACHE_VERSION = "0.3.8";
const STATIC_CACHE_NAME = `english-learning-static-${CACHE_VERSION}`;
const DYNAMIC_CACHE_NAME = `english-learning-dynamic-${CACHE_VERSION}`;
const API_CACHE_NAME = `english-learning-api-${CACHE_VERSION}`;
const CACHE_TIME_STORE = "cache-timestamps"; // 缓存时间戳存储

// 缓存配置
const CACHE_CONFIG = {
  maxAge: 7 * 24 * 60 * 60 * 1000, // 缓存最大时长: 7天
};

// 静态资源列表 - 预缓存
const STATIC_ASSETS = [
  "/",
  "/index.html",
  "/context.html",
  "/blank.html",
  "/mix.html",
  "/user-center.html",
  "/shop.html",
  "/admin.html",
  "/offline.html",
  "/css/style.css",
  "/js/common.js",
  "/js/api.js",
  "/js/context.js",
  "/js/blank.js",
  "/js/mix.js",
  "/js/admin.js",
  "/js/user-center.js",
  "/js/shop.js",
  // "/js/pjax.js", // PJAX已暂停
  "/js/vocabulary-status-button.js",
  "/js/theme-toggle-button.js",
  "/js/user-info-bar.js",
  "/js/mobile-nav.js",
  "/js/sw-register.js",
  "/manifest.json",
  "/icons/icon-192x192.png",
  "/icons/icon-512x512.png",
  "/icons/icon-72x72.png",
  "/icons/icon-96x96.png",
  "/icons/icon-128x128.png",
  "/icons/icon-144x144.png",
  "/icons/icon-152x152.png",
  "/icons/icon-384x384.png",
  "/icons/icon.svg",
];

// API 域名配置
const API_ORIGIN = "https://aliyun.zaiwen.top";

// =================================================================
// 安装事件: 预缓存静态资源
// =================================================================
self.addEventListener("install", (event) => {
  console.log("[SW] 安装中...版本:", CACHE_VERSION);

  event.waitUntil(
    caches
      .open(STATIC_CACHE_NAME)
      .then((cache) => {
        console.log("[SW] 开始缓存静态资源");
        return cache.addAll(STATIC_ASSETS);
      })
      .then(() => {
        console.log("[SW] 静态资源缓存完成");
        // 强制立即激活,不等待旧的 Service Worker 结束
        return self.skipWaiting();
      })
      .catch((error) => {
        console.error("[SW] 静态资源缓存失败:", error);
        // 即使缓存失败也继续安装,避免阻塞
        return self.skipWaiting();
      })
  );
});

// =================================================================
// 激活事件: 清理旧缓存
// =================================================================
self.addEventListener("activate", (event) => {
  console.log("[SW] 激活中...版本:", CACHE_VERSION);

  event.waitUntil(
    caches
      .keys()
      .then((cacheNames) => {
        return Promise.all(
          cacheNames.map((cacheName) => {
            // 删除不属于当前版本的缓存(保留时间戳缓存)
            if (
              cacheName !== STATIC_CACHE_NAME &&
              cacheName !== DYNAMIC_CACHE_NAME &&
              cacheName !== API_CACHE_NAME &&
              cacheName !== CACHE_TIME_STORE
            ) {
              console.log("[SW] 删除旧缓存:", cacheName);
              return caches.delete(cacheName);
            }
          })
        );
      })
      .then(() => {
        console.log("[SW] 旧缓存清理完成");
        // 立即控制所有客户端
        return self.clients.claim();
      })
      .then(() => {
        console.log("[SW] 激活完成,已接管所有页面");
        // 通知所有客户端刷新页面以使用新版本
        return self.clients.matchAll().then((clients) => {
          clients.forEach((client) => {
            client.postMessage({
              type: "SW_UPDATED",
              version: CACHE_VERSION,
            });
          });
        });
      })
      .catch((error) => {
        console.error("[SW] 激活过程出错:", error);
      })
  );
});

// =================================================================
// 拦截请求: 根据资源类型选择缓存策略
// =================================================================
self.addEventListener("fetch", (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // 跳过非 GET 请求
  if (request.method !== "GET") {
    return;
  }

  // 跳过 Chrome 扩展请求
  if (url.protocol === "chrome-extension:") {
    return;
  }

  // API 请求: Network First (优先网络,失败使用缓存)
  if (url.origin === API_ORIGIN) {
    event.respondWith(networkFirstStrategy(request, API_CACHE_NAME));
    return;
  }

  // 静态资源: Cache First (优先缓存,失败请求网络)
  event.respondWith(cacheFirstStrategy(request));
});

// =================================================================
// 缓存策略 1: Cache First (优先缓存)
// 适用于: HTML, CSS, JS, 图标等静态资源
// =================================================================
async function cacheFirstStrategy(request) {
  try {
    // 1. 先尝试从缓存读取
    const cachedResponse = await caches.match(request);
    if (cachedResponse) {
      // 检查缓存是否过期
      const cacheTime = await getCacheTime(request.url);
      if (cacheTime && Date.now() - cacheTime > CACHE_CONFIG.maxAge) {
        console.log("[SW] 缓存已过期,重新请求:", request.url);
        // 缓存过期,尝试从网络更新
        try {
          const networkResponse = await fetch(request);
          if (networkResponse && networkResponse.status === 200) {
            const cache = await caches.open(DYNAMIC_CACHE_NAME);
            await cache.put(request, networkResponse.clone());
            await setCacheTime(request.url, Date.now());
            console.log("[SW] 已更新过期缓存:", request.url);
            return networkResponse;
          }
        } catch (error) {
          console.warn("[SW] 网络更新失败,使用过期缓存:", error);
        }
      }

      console.log("[SW] 缓存命中:", request.url);
      return cachedResponse;
    }

    // 2. 缓存未命中,请求网络
    console.log("[SW] 缓存未命中,请求网络:", request.url);
    const networkResponse = await fetch(request);

    // 3. 缓存新资源到动态缓存
    if (networkResponse && networkResponse.status === 200) {
      const cache = await caches.open(DYNAMIC_CACHE_NAME);
      await cache.put(request, networkResponse.clone());
      await setCacheTime(request.url, Date.now());
      console.log("[SW] 已缓存到动态缓存:", request.url);
    }

    return networkResponse;
  } catch (error) {
    console.error("[SW] Cache First 策略失败:", error);

    // 4. 如果是导航请求(HTML页面),返回离线页面
    if (request.mode === "navigate") {
      const offlineResponse = await caches.match("/offline.html");
      if (offlineResponse) {
        return offlineResponse;
      }
    }

    // 5. 其他情况,返回基础错误响应
    return new Response("网络错误,无法加载资源", {
      status: 503,
      statusText: "Service Unavailable",
      headers: new Headers({
        "Content-Type": "text/plain; charset=utf-8",
      }),
    });
  }
}

// =================================================================
// 缓存策略 2: Network First (优先网络)
// 适用于: API 请求,需要最新数据
// =================================================================
async function networkFirstStrategy(request, cacheName) {
  try {
    // 1. 先尝试网络请求
    console.log("[SW] Network First: 请求网络", request.url);
    const networkResponse = await fetch(request);

    // 2. 网络请求成功,缓存响应
    if (networkResponse && networkResponse.status === 200) {
      const cache = await caches.open(cacheName);
      cache.put(request, networkResponse.clone());
      console.log("[SW] API 响应已缓存:", request.url);
    }

    return networkResponse;
  } catch (error) {
    console.warn("[SW] 网络请求失败,尝试使用缓存:", error.message);

    // 3. 网络失败,尝试使用缓存
    const cachedResponse = await caches.match(request);
    if (cachedResponse) {
      console.log("[SW] 使用缓存的 API 响应:", request.url);
      return cachedResponse;
    }

    // 4. 缓存也没有,返回错误响应
    console.error("[SW] 网络和缓存都失败:", request.url);
    return new Response(
      JSON.stringify({
        error: "网络连接失败",
        message: "请检查网络连接后重试",
        offline: true,
      }),
      {
        status: 503,
        statusText: "Service Unavailable",
        headers: new Headers({
          "Content-Type": "application/json; charset=utf-8",
        }),
      }
    );
  }
}

// =================================================================
// 消息处理: 接收来自页面的指令
// =================================================================
self.addEventListener("message", (event) => {
  console.log("[SW] 收到消息:", event.data);

  // 跳过等待,立即激活新版本
  if (event.data && event.data.type === "SKIP_WAITING") {
    console.log("[SW] 执行跳过等待");
    self.skipWaiting();
  }

  // 清理缓存
  if (event.data && event.data.type === "CLEAR_CACHE") {
    console.log("[SW] 执行清理缓存");
    event.waitUntil(
      caches
        .keys()
        .then((cacheNames) => {
          return Promise.all(
            cacheNames.map((cacheName) => {
              console.log("[SW] 删除缓存:", cacheName);
              return caches.delete(cacheName);
            })
          );
        })
        .then(() => {
          console.log("[SW] 缓存清理完成");
          // 通知页面缓存已清理
          self.clients.matchAll().then((clients) => {
            clients.forEach((client) => {
              client.postMessage({
                type: "CACHE_CLEARED",
                message: "缓存已清理",
              });
            });
          });
        })
    );
  }

  // 获取缓存信息
  if (event.data && event.data.type === "GET_CACHE_INFO") {
    console.log("[SW] 获取缓存信息");
    event.waitUntil(
      caches
        .keys()
        .then((cacheNames) => {
          return Promise.all(
            cacheNames.map(async (cacheName) => {
              const cache = await caches.open(cacheName);
              const keys = await cache.keys();
              return {
                name: cacheName,
                count: keys.length,
              };
            })
          );
        })
        .then((cacheInfo) => {
          console.log("[SW] 缓存信息:", cacheInfo);
          // 通知页面缓存信息
          self.clients.matchAll().then((clients) => {
            clients.forEach((client) => {
              client.postMessage({
                type: "CACHE_INFO",
                data: cacheInfo,
              });
            });
          });
        })
    );
  }
});

// =================================================================
// 后台同步: 暂时不实施
// =================================================================
// self.addEventListener('sync', (event) => {
//   console.log('[SW] 后台同步:', event.tag);
// });

// =================================================================
// 推送通知: 暂时不实施
// =================================================================
// self.addEventListener('push', (event) => {
//   console.log('[SW] 推送通知:', event);
// });

// =================================================================
// 缓存时间管理工具
// =================================================================

// 保存缓存时间
async function setCacheTime(url, timestamp) {
  try {
    const cache = await caches.open(CACHE_TIME_STORE);
    const response = new Response(JSON.stringify({ timestamp }), {
      headers: { "Content-Type": "application/json" },
    });
    await cache.put(url, response);
  } catch (error) {
    console.warn("[SW] 保存缓存时间失败:", error);
  }
}

// 获取缓存时间
async function getCacheTime(url) {
  try {
    const cache = await caches.open(CACHE_TIME_STORE);
    const response = await cache.match(url);
    if (response) {
      const data = await response.json();
      return data.timestamp;
    }
  } catch (error) {
    console.warn("[SW] 获取缓存时间失败:", error);
  }
  return null;
}

console.log("[SW] Service Worker 脚本已加载,版本:", CACHE_VERSION);
