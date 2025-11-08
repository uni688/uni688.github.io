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
          transform: none;
          border-radius: 16px 16px 0 0;
          border-left: none;
          border-right: none;
          border-bottom: none;
          max-width: 100%;
          padding: 0.5rem 0;
        }

        body {
          padding-bottom: 5rem;
        }

        .container {
          margin-bottom: 5rem;
        }
      }

      [data-theme="dark"] .mobile-nav-bar {
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

      [data-theme="dark"] .nav-item {
        color: #94a3b8;
      }

      [data-theme="dark"] .nav-item.active {
        color: var(--primary);
        background: rgba(99, 102, 241, 0.2);
      }

      [data-theme="dark"] .nav-item:hover {
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
}

// 自动检测当前页面并初始化导航栏
document.addEventListener("DOMContentLoaded", () => {
  const currentPage =
    window.location.pathname.split("/").pop().replace(".html", "") || "index";
  initMobileNavBar(currentPage);
});
