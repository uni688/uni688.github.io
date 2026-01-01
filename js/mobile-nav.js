// 全局导航栏组件（适配桌面端和移动端）

/**
 * 初始化导航栏
 * @param {string} activePage - 当前激活的页面名称
 */
function initMobileNavBar(activePage = "index") {
  // 创建导航栏
  const navBar = document.createElement("div");
  navBar.id = "mobileNavBar";
  navBar.className = "mobile-nav-bar";

  const navItems = [
    { id: "index", icon: "🏠", label: "首页", href: "index.html" },
    { id: "practice", icon: "📚", label: "练习", href: "mix.html" },
    { id: "user", icon: "👤", label: "我的", href: "user-center.html" },
    { id: "shop", icon: "🛒", label: "商店", href: "shop.html" },
    { id: "admin", icon: "⚙️", label: "管理", href: "admin.html" },
  ];

  // 滑动控制变量
  let lastScrollY = window.scrollY;
  let lastScrollTime = Date.now();
  let ticking = false;
  let isNavVisible = true;

  navBar.innerHTML = `
    <style>
      .mobile-nav-bar {
        position: fixed;
        left: 50%;
        transform: translateX(-50%);
        background: rgba(255, 255, 255, 0.8);
        backdrop-filter: blur(20px);
        -webkit-backdrop-filter: blur(20px);
        border: 1px solid rgba(226, 232, 240, 0.6);
        padding: 0.75rem 1.5rem;
        z-index: 997;
        box-shadow: 0 8px 32px rgba(0, 0, 0, 0.1);
        transition: all 0.3s ease;
      }

      /* 桌面端样式 - 长条圆形 */
      @media (min-width: 769px) {
        .mobile-nav-bar {
          bottom: 2rem;
          border-radius: 50px;
          max-width: fit-content;
        }

        body {
          padding-bottom: 8rem;
        }
      }

      /* 移动端样式 - 底部全宽 */
      @media (max-width: 768px) {
        .mobile-nav-bar {
          bottom: 0;
          left: 0;
          right: 0;
          transform: translateY(0);
          border-radius: 16px 16px 0 0;
          border-left: none;
          border-right: none;
          border-bottom: none;
          max-width: 100%;
          padding: 0.5rem 0;
          transition: transform 0.3s cubic-bezier(0.4, 0, 0.2, 1);
        }

        .mobile-nav-bar.nav-hidden {
          transform: translateY(100%);
        }

        body {
          padding-bottom: 5rem;
        }

        .container {
          margin-bottom: 5rem;
        }
      }

      .theme_dark .mobile-nav-bar {
        background: rgba(30, 41, 59, 0.85);
        border-color: rgba(100, 116, 139, 0.4);
      }

      .nav-items {
        display: flex;
        justify-content: center;
        align-items: center;
        gap: 1rem;
      }

      @media (max-width: 768px) {
        .nav-items {
          justify-content: space-around;
          gap: 0;
        }
      }

      .nav-item {
        display: flex;
        flex-direction: column;
        align-items: center;
        text-decoration: none;
        color: #64748b;
        font-size: 0.75rem;
        padding: 0.5rem 1rem;
        transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
        border-radius: 12px;
        position: relative;
      }

      @media (min-width: 769px) {
        .nav-item {
          padding: 0.6rem 1.2rem;
        }
      }

      @media (max-width: 768px) {
        .nav-item {
          flex: 1;
          max-width: 80px;
          padding: 0.5rem;
        }

        .nav-item:active {
          transform: scale(0.95);
        }
      }

      .nav-item.active {
        color: var(--primary);
        background: rgba(99, 102, 241, 0.12);
      }

      .nav-item.active::before {
        content: '';
        position: absolute;
        bottom: 0;
        left: 50%;
        transform: translateX(-50%);
        width: 24px;
        height: 3px;
        background: var(--primary);
        border-radius: 2px 2px 0 0;
      }

      @media (min-width: 769px) {
        .nav-item.active::before {
          display: none;
        }
      }

      .theme_dark .nav-item {
        color: #94a3b8;
      }

      .theme_dark .nav-item.active {
        color: var(--primary);
        background: rgba(99, 102, 241, 0.2);
      }

      .theme_dark .nav-item:hover {
        background: rgba(99, 102, 241, 0.15);
      }

      .nav-icon {
        font-size: 1.5rem;
        margin-bottom: 0.25rem;
        transition: transform 0.3s ease;
      }

      @media (min-width: 769px) {
        .nav-item:hover .nav-icon {
          transform: scale(1.1);
        }
      }

      .nav-label {
        white-space: nowrap;
        font-weight: 500;
      }

      @media (min-width: 769px) {
        .nav-label {
          font-size: 0.8rem;
        }
      }
    </style>
    <div class="nav-items">
      ${navItems
        .map(
          (item) => `
        <a href="${item.href}" class="nav-item ${
            activePage === item.id ? "active" : ""
          }">
          <div class="nav-icon">${item.icon}</div>
          <div class="nav-label">${item.label}</div>
        </a>
      `
        )
        .join("")}
    </div>
  `;

  document.body.appendChild(navBar);

  // 滑动处理函数（在外部作用域定义，以便可以移除监听器）
  const handleScroll = () => {
    if (!ticking) {
      window.requestAnimationFrame(() => {
        updateNavVisibility(navBar);
        ticking = false;
      });
      ticking = true;
    }
  };

  // 添加滑动监听（仅移动端）
  if (window.innerWidth <= 768) {
    initScrollBehavior();
  }

  // 监听窗口大小变化
  window.addEventListener("resize", () => {
    if (window.innerWidth <= 768) {
      initScrollBehavior();
    } else {
      // 桌面端：移除滑动监听，重置导航栏
      window.removeEventListener("scroll", handleScroll);
      navBar.classList.remove("nav-hidden");
      isNavVisible = true;
    }
  });

  /**
   * 初始化滑动行为
   */
  function initScrollBehavior() {
    // 添加滑动监听
    window.addEventListener("scroll", handleScroll, { passive: true });
  }

  /**
   * 更新导航栏可见性
   */
  function updateNavVisibility(navBar) {
    const currentScrollY = window.scrollY;
    const currentTime = Date.now();
    const scrollDiff = currentScrollY - lastScrollY;
    const timeDiff = currentTime - lastScrollTime;
    const scrollThreshold = 5; // 滑动阈值，避免过于敏感

    // 滑动距离小于阈值，不做处理
    if (Math.abs(scrollDiff) < scrollThreshold) {
      return;
    }

    // 计算滑动速度 (像素/毫秒)
    const scrollSpeed = Math.abs(scrollDiff) / Math.max(timeDiff, 1);

    // 根据滑动速度调整动画速度
    // 速度范围: 0.1 (慢) ~ 2.0+ (快)
    // 动画时间范围: 0.15s (快速滑动) ~ 0.5s (慢速滑动)
    let transitionDuration;
    if (scrollSpeed > 1.5) {
      // 快速滑动: 0.15秒
      transitionDuration = 0.15;
    } else if (scrollSpeed > 0.8) {
      // 中速滑动: 0.25秒
      transitionDuration = 0.25;
    } else if (scrollSpeed > 0.3) {
      // 慢速滑动: 0.35秒
      transitionDuration = 0.35;
    } else {
      // 非常慢: 0.5秒
      transitionDuration = 0.5;
    }

    // 应用动画速度
    navBar.style.transitionDuration = `${transitionDuration}s`;

    // 在页面顶部时始终显示导航栏
    if (currentScrollY < 50) {
      if (!isNavVisible) {
        navBar.classList.remove("nav-hidden");
        isNavVisible = true;
      }
      lastScrollY = currentScrollY;
      lastScrollTime = currentTime;
      return;
    }

    // 向下滑动：隐藏导航栏
    if (scrollDiff > 0 && isNavVisible) {
      navBar.classList.add("nav-hidden");
      isNavVisible = false;
    }
    // 向上滑动：显示导航栏
    else if (scrollDiff < 0 && !isNavVisible) {
      navBar.classList.remove("nav-hidden");
      isNavVisible = true;
    }

    lastScrollY = currentScrollY;
    lastScrollTime = currentTime;
  }
}

// 自动检测当前页面并初始化导航栏
document.addEventListener("DOMContentLoaded", () => {
  // 获取当前页面路径
  const pathname = window.location.pathname;
  let currentPage = "index";

  // 根据文件名判断当前页面
  if (pathname.includes("mix.html")) {
    currentPage = "practice";
  } else if (pathname.includes("user-center.html")) {
    currentPage = "user";
  } else if (pathname.includes("shop.html")) {
    currentPage = "shop";
  } else if (pathname.includes("admin.html")) {
    currentPage = "admin";
  } else if (
    pathname.includes("context.html") ||
    pathname.includes("blank.html")
  ) {
    currentPage = "practice";
  } else if (
    pathname.includes("index.html") ||
    pathname === "/" ||
    pathname.endsWith("/")
  ) {
    currentPage = "index";
  }

  initMobileNavBar(currentPage);
});
