/**
 * PJAX (PushState + AJAX) 平滑页面切换
 * 实现类似 GitHub 的无刷新页面切换效果
 *
 * ⚠️ 当前状态: 已暂停使用
 * 所有HTML文件中的引用已被注释,功能已禁用
 */

(function () {
  "use strict";

  // 配置
  const CONFIG = {
    // 需要 PJAX 处理的链接选择器
    linkSelector: 'a[href^="/"]:not([target="_blank"]):not([data-no-pjax])',
    // 内容容器选择器
    containerSelector: ".container",
    // 过渡动画时长（毫秒）
    transitionDuration: 300,
    // 是否启用进度条
    enableProgressBar: true,
    // 缓存大小
    cacheSize: 10,
    // 是否启用 PJAX（可用于快速停用）
    enabled: false,
  };

  // 页面缓存
  const pageCache = new Map();

  // 当前请求控制器
  let currentController = null;

  // 进度条元素
  let progressBar = null;

  // 已加载的脚本资源（用于避免重复加载）
  const loadedScriptUrls = new Set(
    Array.from(document.querySelectorAll("script[src]") || [])
      .map((script) =>
        normalizeUrl(script.getAttribute("src"), window.location.href)
      )
      .filter(Boolean)
  );

  /**
   * 初始化进度条
   */
  function initProgressBar() {
    if (!CONFIG.enableProgressBar || progressBar) return;

    progressBar = document.createElement("div");
    progressBar.className = "pjax-progress-bar";
    progressBar.innerHTML = '<div class="pjax-progress-fill"></div>';
    document.body.appendChild(progressBar);

    // 添加样式
    const style = document.createElement("style");
    style.textContent = `
      .pjax-progress-bar {
        position: fixed;
        top: 0;
        left: 0;
        right: 0;
        height: 3px;
        z-index: 9999;
        opacity: 0;
        transition: opacity 0.2s ease;
      }

      .pjax-progress-bar.active {
        opacity: 1;
      }

      .pjax-progress-fill {
        height: 100%;
        background: linear-gradient(90deg, #6366f1, #8b5cf6);
        box-shadow: 0 0 10px rgba(99, 102, 241, 0.5);
        transition: width 0.3s ease;
        width: 0%;
      }

      /* 页面过渡动画 */
      .pjax-transitioning {
        opacity: 0;
        transform: translateY(10px);
      }

      .pjax-loaded {
        animation: pjaxFadeIn 0.3s ease forwards;
      }

      @keyframes pjaxFadeIn {
        from {
          opacity: 0;
          transform: translateY(10px);
        }
        to {
          opacity: 1;
          transform: translateY(0);
        }
      }
    `;
    document.head.appendChild(style);
  }

  /**
   * 显示进度条
   */
  function showProgress() {
    if (!progressBar) return;
    progressBar.classList.add("active");
    const fill = progressBar.querySelector(".pjax-progress-fill");
    fill.style.width = "30%";

    setTimeout(() => {
      fill.style.width = "60%";
    }, 150);
  }

  /**
   * 完成进度条
   */
  function completeProgress() {
    if (!progressBar) return;
    const fill = progressBar.querySelector(".pjax-progress-fill");
    fill.style.width = "100%";

    setTimeout(() => {
      progressBar.classList.remove("active");
      fill.style.width = "0%";
    }, 300);
  }

  /**
   * 错误进度条
   */
  function errorProgress() {
    if (!progressBar) return;
    progressBar.classList.remove("active");
    const fill = progressBar.querySelector(".pjax-progress-fill");
    fill.style.width = "0%";
  }

  /**
   * 加载页面内容
   */
  async function loadPage(url) {
    const targetUrl = normalizeUrl(url, window.location.href);

    if (!targetUrl) {
      throw new Error("Invalid URL for PJAX navigation");
    }

    // 检查缓存
    if (pageCache.has(targetUrl)) {
      return pageCache.get(targetUrl);
    }

    // 取消之前的请求
    if (currentController) {
      currentController.abort();
    }

    currentController = new AbortController();

    try {
      const response = await fetch(targetUrl, {
        signal: currentController.signal,
        headers: {
          "X-PJAX": "true",
        },
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const html = await response.text();
      const parser = new DOMParser();
      const doc = parser.parseFromString(html, "text/html");

      // 提取内容和标题
      const container = doc.querySelector(CONFIG.containerSelector);
      const title = doc.querySelector("title")?.textContent || "";

      if (!container) {
        throw new Error("Container not found");
      }

      const inlineStyles = Array.from(doc.querySelectorAll("head style")).map(
        (styleEl) => ({
          text: styleEl.textContent || "",
          attributes: Array.from(styleEl.attributes).map(({ name, value }) => ({
            name,
            value,
          })),
        })
      );

      const stylesheets = Array.from(
        doc.querySelectorAll('head link[rel~="stylesheet"]')
      ).map((linkEl) => ({
        href: linkEl.getAttribute("href"),
        absoluteHref: normalizeUrl(linkEl.getAttribute("href"), targetUrl),
        attributes: Array.from(linkEl.attributes).map(({ name, value }) => ({
          name,
          value,
        })),
      }));

      const scripts = Array.from(doc.querySelectorAll("script")).map(
        (scriptEl) => {
          const srcAttr = scriptEl.getAttribute("src");
          return {
            src: srcAttr,
            absoluteSrc: normalizeUrl(srcAttr, targetUrl),
            type: scriptEl.getAttribute("type"),
            async: scriptEl.async,
            defer: scriptEl.defer,
            content: srcAttr ? "" : scriptEl.textContent || "",
          };
        }
      );

      const extras = Array.from(doc.body.children)
        .filter(
          (el) =>
            !el.matches(CONFIG.containerSelector) && el.tagName !== "SCRIPT"
        )
        .map((el) => el.outerHTML);

      const result = {
        url: targetUrl,
        html: container.innerHTML,
        title,
        inlineStyles,
        stylesheets,
        scripts,
        extras,
      };

      // 缓存页面
      if (pageCache.size >= CONFIG.cacheSize) {
        const firstKey = pageCache.keys().next().value;
        pageCache.delete(firstKey);
      }
      pageCache.set(targetUrl, result);

      return result;
    } finally {
      currentController = null;
    }
  }

  /**
   * 更新页面内容
   */
  async function updatePage(url, pushState = true) {
    if (CONFIG.enabled === false) {
      if (typeof url === "string" && url.length > 0) {
        window.location.href = url;
      }
      return false;
    }

    const container = document.querySelector(CONFIG.containerSelector);
    if (!container) return false;

    const targetUrl = normalizeUrl(url, window.location.href);

    try {
      // 显示加载状态
      showProgress();
      container.classList.add("pjax-transitioning");

      // 等待过渡动画
      await new Promise((resolve) =>
        setTimeout(resolve, CONFIG.transitionDuration)
      );

      // 加载新内容
      const pageData = await loadPage(targetUrl || url);
      const resolvedUrl = pageData.url || targetUrl || url;

      applyInlineStyles(pageData.inlineStyles);
      syncStylesheets(pageData.stylesheets);

      // 更新内容
      container.innerHTML = pageData.html;
      applyExtras(pageData.extras);
      document.title = pageData.title;

      // 更新历史记录
      if (pushState) {
        window.history.pushState(
          { pjax: true, url: resolvedUrl },
          pageData.title,
          resolvedUrl
        );
      }

      // 滚动到顶部
      window.scrollTo({ top: 0, behavior: "smooth" });

      // 移除过渡类，添加加载完成类
      container.classList.remove("pjax-transitioning");
      container.classList.add("pjax-loaded");

      setTimeout(() => {
        container.classList.remove("pjax-loaded");
      }, CONFIG.transitionDuration);

      // 完成进度条
      completeProgress();

      // 执行新页面脚本后再重新初始化
      await executePageScripts(pageData.scripts);
      reinitializePage();

      // 触发自定义事件
      window.dispatchEvent(
        new CustomEvent("pjax:success", { detail: { url: resolvedUrl } })
      );

      return true;
    } catch (error) {
      console.error("PJAX error:", error);

      // 错误处理
      errorProgress();
      container.classList.remove("pjax-transitioning");

      // 如果是取消操作，不做处理
      if (error.name === "AbortError") {
        return false;
      }

      // 其他错误，回退到正常导航
      window.location.href = url;
      return false;
    }
  }

  /**
   * 应用新的内联样式
   */
  function applyInlineStyles(styles = []) {
    document.querySelectorAll("style[data-pjax-inline]").forEach((styleEl) => {
      if (styleEl.textContent.includes("pjax-progress-bar")) return;
      styleEl.remove();
    });

    if (!Array.isArray(styles)) return;

    styles.forEach((styleData) => {
      const styleEl = document.createElement("style");
      styleEl.setAttribute("data-pjax-inline", "true");

      if (styleData?.attributes?.length) {
        styleData.attributes.forEach(({ name, value }) => {
          if (name === "data-pjax-inline") return;
          styleEl.setAttribute(name, value);
        });
      }

      styleEl.textContent = styleData?.text || "";
      document.head.appendChild(styleEl);
    });
  }

  /**
   * 同步页面的样式表
   */
  function syncStylesheets(stylesheets = []) {
    document
      .querySelectorAll('link[data-pjax-temp-style="true"]')
      .forEach((link) => link.remove());

    if (!Array.isArray(stylesheets)) return;

    stylesheets.forEach((sheet) => {
      const href = sheet?.href;
      const absoluteHref = sheet?.absoluteHref;
      if (!href && !absoluteHref) {
        return;
      }

      if (findExistingStylesheet(href, absoluteHref)) {
        return;
      }

      const linkEl = document.createElement("link");
      if (sheet?.attributes?.length) {
        sheet.attributes.forEach(({ name, value }) => {
          if (name === "data-pjax-temp-style") return;
          linkEl.setAttribute(name, value);
        });
      } else {
        linkEl.rel = "stylesheet";
        linkEl.href = href || absoluteHref;
      }

      linkEl.setAttribute("data-pjax-temp-style", "true");
      document.head.appendChild(linkEl);
    });
  }

  function findExistingStylesheet(href, absoluteHref) {
    if (href) {
      const directMatch = document.querySelector(
        `link[rel~="stylesheet"][href="${href}"]`
      );
      if (directMatch) {
        return directMatch;
      }
    }

    if (absoluteHref) {
      return Array.from(
        document.querySelectorAll('link[rel~="stylesheet"]')
      ).find(
        (link) =>
          normalizeUrl(link.getAttribute("href"), window.location.href) ===
          absoluteHref
      );
    }

    return null;
  }

  /**
   * 替换页面额外的 DOM 片段（如模态框、提示容器等）
   */
  function applyExtras(extras = []) {
    const extraRoot = ensureExtraRoot();
    if (!extraRoot) return;

    if (!Array.isArray(extras) || extras.length === 0) {
      extraRoot.innerHTML = "";
      return;
    }

    extraRoot.innerHTML = extras.join("");
  }

  /**
   * 顺序执行页面脚本
   */
  async function executePageScripts(scripts = []) {
    if (!Array.isArray(scripts) || scripts.length === 0) return;

    for (const script of scripts) {
      if (script?.src) {
        const srcUrl =
          script.absoluteSrc || normalizeUrl(script.src, window.location.href);
        if (!srcUrl || loadedScriptUrls.has(srcUrl)) {
          continue;
        }
        await loadExternalScript(srcUrl, script);
      } else if (script?.content && shouldExecuteScriptType(script.type)) {
        const inlineScript = document.createElement("script");
        inlineScript.setAttribute("data-pjax-inline-script", "true");
        if (script.type) {
          inlineScript.type = script.type;
        }
        inlineScript.textContent = script.content;
        document.body.appendChild(inlineScript);
        document.body.removeChild(inlineScript);
      }
    }
  }

  function loadExternalScript(srcUrl, scriptInfo = {}) {
    return new Promise((resolve, reject) => {
      const scriptEl = document.createElement("script");
      scriptEl.src = srcUrl;
      if (scriptInfo.type) {
        scriptEl.type = scriptInfo.type;
      }
      if (scriptInfo.defer) {
        scriptEl.defer = true;
      }
      if (scriptInfo.async) {
        scriptEl.async = true;
      } else {
        scriptEl.async = false;
      }

      scriptEl.onload = () => {
        loadedScriptUrls.add(srcUrl);
        resolve();
      };

      scriptEl.onerror = (event) => {
        console.error(`[PJAX] Failed to load script: ${srcUrl}`, event);
        reject(new Error(`Failed to load script: ${srcUrl}`));
      };

      document.body.appendChild(scriptEl);
    });
  }

  /**
   * 确保存在额外内容的挂载容器
   */
  function ensureExtraRoot() {
    let root = document.querySelector("[data-pjax-extra-root]");
    if (root) {
      return root;
    }

    root = document.createElement("div");
    root.setAttribute("data-pjax-extra-root", "true");
    document.body.appendChild(root);

    const snapshot = Array.from(document.body.children);
    snapshot.forEach((child) => {
      if (child === root) return;
      if (child === progressBar) return;
      if (child.matches?.(CONFIG.containerSelector)) return;
      if (child.tagName === "SCRIPT") return;
      if (child.hasAttribute?.("data-pjax-preserve")) return;

      root.appendChild(child);
    });

    return root;
  }

  /**
   * 规范化 URL，返回绝对路径
   */
  function normalizeUrl(url, base = window.location.href) {
    if (!url) return null;
    try {
      return new URL(url, base).href;
    } catch (error) {
      return null;
    }
  }

  function shouldExecuteScriptType(type) {
    if (!type) return true;
    const normalized = type.trim().toLowerCase();
    return [
      "text/javascript",
      "application/javascript",
      "application/x-javascript",
      "module",
    ].includes(normalized);
  }

  /**
   * 重新初始化页面脚本
   */
  function reinitializePage() {
    // 重新初始化通用功能
    if (typeof initializeStorage === "function") {
      initializeStorage();
    }
    if (typeof initializeTheme === "function") {
      initializeTheme();
    }
    if (typeof initThemeToggleButton === "function") {
      initThemeToggleButton();
    }
    if (typeof initMobileNavBar === "function") {
      const currentPage =
        window.location.pathname.split("/").pop().replace(".html", "") ||
        "index";
      initMobileNavBar(currentPage);
    }

    // 页面特定的初始化函数
    if (typeof initUserCenterPage === "function") {
      initUserCenterPage();
    }
    if (typeof initShopPage === "function") {
      initShopPage();
    }

    // 触发 DOMContentLoaded 事件（部分脚本可能监听此事件）
    const event = new Event("DOMContentLoaded", {
      bubbles: true,
      cancelable: true,
    });
    document.dispatchEvent(event);
  }

  /**
   * 处理链接点击
   */
  function handleClick(e) {
    if (CONFIG.enabled === false) {
      return;
    }
    const link = e.target.closest("a");
    if (!link) return;

    // 检查是否是外部链接或特殊链接
    if (
      link.hostname !== window.location.hostname ||
      link.hash ||
      link.hasAttribute("download") ||
      e.metaKey ||
      e.ctrlKey ||
      e.shiftKey ||
      e.altKey ||
      e.button !== 0
    ) {
      return;
    }

    const href = link.getAttribute("href");
    const safeHref = decodeURI(href).trim().toLowerCase();
    if (
      !href ||
      href === "#" ||
      safeHref.startsWith("javascript:") ||
      safeHref.startsWith("data:") ||
      safeHref.startsWith("vbscript:")
    ) {
      return;
    }

    // 阻止默认行为
    e.preventDefault();

    // 如果是当前页面，不做处理
    if (link.href === window.location.href) {
      return;
    }

    // 更新页面
    updatePage(link.href);
  }

  /**
   * 处理浏览器后退/前进
   */
  function handlePopState(e) {
    if (CONFIG.enabled === false) {
      return;
    }
    if (e.state && e.state.pjax) {
      updatePage(e.state.url, false);
    }
  }

  /**
   * 初始化 PJAX
   */
  function init() {
    if (CONFIG.enabled === false) {
      console.warn(
        "[PJAX] Disabled via configuration, falling back to full page loads."
      );
      return;
    }
    // 初始化进度条
    initProgressBar();

    // 初始化额外内容挂载节点
    ensureExtraRoot();

    // 标记当前页面的内联样式（排除 pjax-progress-bar 的样式）
    document.querySelectorAll("head style").forEach((styleEl) => {
      // 不要标记 PJAX 进度条的样式
      if (!styleEl.textContent.includes("pjax-progress-bar")) {
        styleEl.setAttribute("data-pjax-inline", "true");
      }
    });

    // 监听链接点击
    document.addEventListener("click", handleClick);

    // 监听浏览器后退/前进
    window.addEventListener("popstate", handlePopState);

    // 记录初始状态
    window.history.replaceState(
      { pjax: true, url: window.location.href },
      document.title,
      window.location.href
    );

    console.log("[PJAX] Initialized");
  }

  // 页面加载完成后初始化
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }

  // 导出 API
  window.PJAX = {
    navigateTo: (url) => {
      if (CONFIG.enabled === false) {
        if (typeof url === "string" && url.length > 0) {
          window.location.href = url;
        }
        return false;
      }
      return updatePage(url);
    },
    clearCache: () => pageCache.clear(),
    disable: () => {
      document.removeEventListener("click", handleClick);
      window.removeEventListener("popstate", handlePopState);
    },
  };
})();
