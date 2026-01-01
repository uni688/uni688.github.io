// =================================================================
// Service Worker - AI English Learning Assistant
// 版本: 0.4.92
// =================================================================
const CACHE_VERSION = "0.4.92";
const STATIC_CACHE_NAME = `english-learning-static-${CACHE_VERSION}`;
const DYNAMIC_CACHE_NAME = `english-learning-dynamic-${CACHE_VERSION}`;
const API_CACHE_NAME = `english-learning-api-${CACHE_VERSION}`;
const CACHE_TIME_STORE = "cache-timestamps"; // 作为单独的 cache 名称

// 缓存配置
const CACHE_CONFIG = {
  maxAge: 7 * 24 * 60 * 60 * 1000, // 缓存最大时长: 7天
};

// 静态资源列表 - 预缓存（尽量只放核心必要资源）
const CORE_STATIC_ASSETS = [
  "/css/style.css",
  "/js/common.js",
  "/js/sw-register.js",
  "/manifest.json",
  "/icons/icon-192x192.png",
  "/icons/icon-512x512.png",
];

// 其他可选静态资源（非必须，失败不阻塞安装）
const OPTIONAL_STATIC_ASSETS = [
  "/css/themes.css",
  "/js/context.js",
  "/js/blank.js",
  "/js/mix.js",
  "/js/ranked.js",
  "/js/admin.js",
  "/js/user-center.js",
  "/js/shop.js",
  "/js/custom-select.js",
  "/js/vocabulary-status-button.js",
  "/js/theme-toggle-button.js",
  "/js/user-info-bar.js",
  "/js/mobile-nav.js",
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

// 以下为工具函数与策略实现

// =================================================================
// 安装事件: 预缓存静态资源（核心资源为必须），若核心资源缓存失败则让 install 失败，避免半残状态
// =================================================================
self.addEventListener("install", (event) => {
  console.log("[SW] 安装中...版本:", CACHE_VERSION);

  event.waitUntil(
    (async () => {
      // 1. 缓存核心资源（必须全部成功）
      const staticCache = await caches.open(STATIC_CACHE_NAME);
      try {
        // 使用 addAll 以便一次性抛错/回滚（如果某个必须资源失败则 install 失败）
        await staticCache.addAll(
          CORE_STATIC_ASSETS.filter((u) => !isServiceWorkerUrl(u))
        );
        console.log("[SW] 核心静态资源缓存成功");
      } catch (err) {
        console.error("[SW] 核心资源缓存失败，安装中断：", err);
        throw err; // 让 install 失败，保留旧 SW
      }

      // 2. 非必须资源采用容错策略，失败不阻塞安装
      try {
        await Promise.allSettled(
          OPTIONAL_STATIC_ASSETS.map(async (url) => {
            if (isServiceWorkerUrl(url)) return; // 不缓存 SW 本身
            try {
              const res = await fetch(url, { cache: "no-cache" });
              if (res && res.ok) {
                await staticCache.put(url, res.clone());
                return { url, success: true };
              } else {
                return { url, success: false, status: res && res.status };
              }
            } catch (e) {
              return { url, success: false, error: e && e.message };
            }
          })
        );
        console.log("[SW] 可选静态资源尝试缓存完成");
      } catch (e) {
        console.warn("[SW] 可选静态资源缓存出错：", e);
      }

      // 3. 安装成功后立即跳过等待，准备激活（核心资源已就绪）
      await self.skipWaiting();
      console.log("[SW] 安装完成，skipWaiting 已触发");
    })()
  );
});

// =================================================================
// 激活事件: 清理旧缓存
// =================================================================
self.addEventListener("activate", (event) => {
  console.log("[SW] 激活中...版本:", CACHE_VERSION);

  event.waitUntil(
    (async () => {
      try {
        const cacheNames = await caches.keys();
        // 保留的缓存名集合
        const keep = new Set([
          STATIC_CACHE_NAME,
          DYNAMIC_CACHE_NAME,
          API_CACHE_NAME,
          CACHE_TIME_STORE,
        ]);

        const toDelete = cacheNames.filter((name) => !keep.has(name));

        await Promise.all(
          toDelete.map((cacheName) => {
            console.log("[SW] 删除旧缓存:", cacheName);
            return caches.delete(cacheName);
          })
        );

        console.log("[SW] 旧缓存清理完成");

        // 立即控制所有客户端
        await self.clients.claim();
        console.log("[SW] 已 claim 客户端");

        // 通知所有客户端（页面）使用新版本
        const clients = await self.clients.matchAll();
        clients.forEach((client) => {
          client.postMessage({ type: "SW_UPDATED", version: CACHE_VERSION });
        });

        console.log("[SW] 激活完成,已通知客户端");
      } catch (err) {
        console.error("[SW] 激活过程出错:", err);
      }
    })()
  );
});

// =================================================================
// 拦截请求: 根据资源类型选择缓存策略
// =================================================================
self.addEventListener("fetch", (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // 仅处理 GET
  if (request.method !== "GET") return;

  // 跳过 chrome-extension
  if (url.protocol === "chrome-extension:") return;

  // 跳过 service worker 脚本自身，以免缓存旧的 SW 文件
  if (isServiceWorkerUrl(request.url)) return;

  // API 请求: Network First
  if (url.origin === API_ORIGIN) {
    event.respondWith(networkFirstStrategy(request, API_CACHE_NAME));
    return;
  }

  // 静态资源: Cache First
  event.respondWith(cacheFirstStrategy(request));
});

// =================================================================
// 缓存策略 1: Cache First (优先缓存)
// =================================================================
async function cacheFirstStrategy(request) {
  try {
    const staticCache = await caches.open(STATIC_CACHE_NAME);
    const dynamicCache = await caches.open(DYNAMIC_CACHE_NAME);

    // 先从静态缓存找
    let cachedResponse = await staticCache.match(request);
    if (!cachedResponse) cachedResponse = await dynamicCache.match(request);

    if (cachedResponse) {
      // 检查是否过期
      const cacheTime = await getCacheTime(request.url);
      if (cacheTime && Date.now() - cacheTime > CACHE_CONFIG.maxAge) {
        console.log("[SW] 缓存已过期,重新请求:", request.url);
        try {
          const networkResponse = await fetch(request);
          if (networkResponse && networkResponse.status === 200) {
            await dynamicCache.put(request, networkResponse.clone());
            await setCacheTime(request.url, Date.now());
            console.log("[SW] 已更新过期缓存:", request.url);
            return networkResponse;
          }
        } catch (err) {
          console.warn("[SW] 网络更新失败,使用过期缓存:", err);
        }
      }

      console.log("[SW] 缓存命中:", request.url);
      return cachedResponse;
    }

    // 缓存未命中 -> 网络请求
    console.log("[SW] 缓存未命中,请求网络:", request.url);
    const networkResponse = await fetch(request);

    if (networkResponse && networkResponse.status === 200) {
      await dynamicCache.put(request, networkResponse.clone());
      await setCacheTime(request.url, Date.now());
      console.log("[SW] 已缓存到动态缓存:", request.url);
    }

    return networkResponse;
  } catch (error) {
    console.error("[SW] Cache First 策略失败:", error);

    if (request.mode === "navigate") {
      const offlineResponse = await caches.match("/offline.html");
      if (offlineResponse) return offlineResponse;
    }

    return new Response("网络错误,无法加载资源", {
      status: 503,
      statusText: "Service Unavailable",
      headers: new Headers({ "Content-Type": "text/plain; charset=utf-8" }),
    });
  }
}
// =================================================================
// 缓存策略 2: Network First (优先网络)
// =================================================================

async function networkFirstStrategy(request, cacheName) {
  try {
    console.log("[SW] Network First: 请求网络", request.url);
    const networkResponse = await fetch(request);

    if (networkResponse && networkResponse.status === 200) {
      const cache = await caches.open(cacheName);
      await cache.put(request, networkResponse.clone());
      console.log("[SW] API 响应已缓存:", request.url);
    }

    return networkResponse;
  } catch (error) {
    console.warn("[SW] 网络请求失败,尝试使用缓存:", error.message);

    // 尝试使用指定缓存
    const cache = await caches.open(cacheName);
    const cachedResponse = await cache.match(request);
    if (cachedResponse) {
      console.log("[SW] 使用缓存的 API 响应:", request.url);
      return cachedResponse;
    }

    // 兜底
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
// 消息处理
// =================================================================
self.addEventListener("message", (event) => {
  console.log("[SW] 收到消息:", event.data);

  if (!event.data) return;

  // 强制跳过等待并激活
  if (event.data.type === "SKIP_WAITING") {
    console.log("[SW] 执行跳过等待");
    self.skipWaiting();
    return;
  }

  // 清理缓存（移除所有缓存）
  if (event.data.type === "CLEAR_CACHE") {
    console.log("[SW] 执行清理缓存");
    event.waitUntil(
      (async () => {
        try {
          const cacheNames = await caches.keys();
          await Promise.all(
            cacheNames.map((cacheName) => {
              console.log("[SW] 删除缓存:", cacheName);
              return caches.delete(cacheName);
            })
          );

          // 通知页面缓存已清理
          const clients = await self.clients.matchAll();
          clients.forEach((client) => {
            client.postMessage({
              type: "CACHE_CLEARED",
              message: "缓存已清理",
            });
          });

          console.log("[SW] 缓存清理完成");
        } catch (err) {
          console.error("[SW] 清理缓存失败:", err);
        }
      })()
    );
    return;
  }

  // 获取缓存信息
  if (event.data.type === "GET_CACHE_INFO") {
    console.log("[SW] 获取缓存信息");
    event.waitUntil(
      (async () => {
        try {
          const cacheNames = await caches.keys();
          const info = await Promise.all(
            cacheNames.map(async (cacheName) => {
              const c = await caches.open(cacheName);
              const keys = await c.keys();
              return { name: cacheName, count: keys.length };
            })
          );

          const clients = await self.clients.matchAll();
          clients.forEach((client) => {
            client.postMessage({ type: "CACHE_INFO", data: info });
          });
        } catch (err) {
          console.error("[SW] 获取缓存信息失败:", err);
        }
      })()
    );
    return;
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
const TIMESTAMP_PREFIX = "__timestamp__:";

async function setCacheTime(url, timestamp) {
  try {
    const cache = await caches.open(CACHE_TIME_STORE);
    const timestampUrl = TIMESTAMP_PREFIX + url;
    const response = new Response(JSON.stringify({ timestamp }), {
      headers: { "Content-Type": "application/json" },
    });
    await cache.put(timestampUrl, response);
  } catch (error) {
    console.warn("[SW] 保存缓存时间失败:", error);
  }
}

async function getCacheTime(url) {
  try {
    const cache = await caches.open(CACHE_TIME_STORE);
    const timestampUrl = TIMESTAMP_PREFIX + url;
    const response = await cache.match(timestampUrl);
    if (response) {
      const data = await response.json();
      return data.timestamp;
    }
  } catch (error) {
    console.warn("[SW] 获取缓存时间失败:", error);
  }
  return null;
}

// 帮助函数：判断是否为 SW 自身或涉及的文件
function isServiceWorkerUrl(url) {
  try {
    const u = typeof url === "string" ? url : url.url || "";
    return (
      u.includes("sw.js") || u.includes("service-worker") || u.includes("sw-")
    );
  } catch (e) {
    return false;
  }
}

console.log("[SW] Service Worker 脚本已加载, 版本:", CACHE_VERSION);
