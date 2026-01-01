// =================================================================
// 自定义下拉选择组件
// 版本: 0.4.58
// 说明: 替代原生 select 元素，提供符合项目主题的下拉菜单样式
// =================================================================

// 防止重复加载
if (window.CustomSelect) {
  console.warn("[custom-select.js] CustomSelect 已定义，跳过重复初始化");
} else {
  /**
   * 自定义下拉选择组件类
   * 将原生 select 元素转换为可自定义样式的下拉菜单
   */
  var CustomSelect = (window.CustomSelect = class CustomSelect {
    /**
     * @param {HTMLSelectElement} selectElement - 原生 select 元素
     * @param {Object} options - 配置选项
     */
    constructor(selectElement, options = {}) {
      if (!selectElement || selectElement.tagName !== "SELECT") {
        console.warn("CustomSelect: 需要传入一个 select 元素");
        return;
      }

      // 检查是否已经初始化过
      if (selectElement.dataset.customSelectInit === "true") {
        return;
      }

      this.select = selectElement;
      this.options = {
        placeholder: options.placeholder || "请选择...",
        searchable: options.searchable || false,
        maxHeight: options.maxHeight || "280px",
        ...options,
      };

      this.isOpen = false;
      this.selectedIndex = this.select.selectedIndex;
      this.wrapper = null;
      this.trigger = null;
      this.dropdown = null;

      this.init();
    }

    /**
     * 初始化组件
     */
    init() {
      this.createWrapper();
      this.createTrigger();
      this.createDropdown();
      this.bindEvents();
      this.updateSelectedDisplay();

      // 标记已初始化
      this.select.dataset.customSelectInit = "true";
    }

    /**
     * 创建包装容器
     */
    createWrapper() {
      this.wrapper = document.createElement("div");
      this.wrapper.className = "custom-select-wrapper";

      // 继承原 select 的类名
      if (this.select.className) {
        this.wrapper.classList.add(
          ...this.select.className.split(" ").filter((c) => c)
        );
      }

      // 插入到 select 之前
      this.select.parentNode.insertBefore(this.wrapper, this.select);
      // 隐藏原生 select（保持在 DOM 中以维持表单功能）
      this.select.style.display = "none";
      this.wrapper.appendChild(this.select);
    }

    /**
     * 创建触发按钮
     */
    createTrigger() {
      this.trigger = document.createElement("div");
      this.trigger.className = "custom-select-trigger";
      this.trigger.setAttribute("tabindex", "0");
      this.trigger.setAttribute("role", "combobox");
      this.trigger.setAttribute("aria-haspopup", "listbox");
      this.trigger.setAttribute("aria-expanded", "false");

      // 显示文本
      const displayText = document.createElement("span");
      displayText.className = "custom-select-display";
      this.trigger.appendChild(displayText);

      // 箭头图标
      const arrow = document.createElement("span");
      arrow.className = "custom-select-arrow";
      arrow.innerHTML = `<svg width="12" height="12" viewBox="0 0 12 12" fill="none">
      <path d="M2.5 4.5L6 8L9.5 4.5" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
    </svg>`;
      this.trigger.appendChild(arrow);

      this.wrapper.appendChild(this.trigger);
    }

    /**
     * 创建下拉菜单
     */
    createDropdown() {
      this.dropdown = document.createElement("div");
      this.dropdown.className = "custom-select-dropdown";
      this.dropdown.setAttribute("role", "listbox");
      this.dropdown.style.maxHeight = this.options.maxHeight;

      // 创建选项列表
      this.renderOptions();

      // 将下拉菜单挂载到 body，避免层叠上下文问题
      document.body.appendChild(this.dropdown);
    }

    /**
     * 渲染选项列表
     */
    renderOptions() {
      this.dropdown.innerHTML = "";

      const options = this.select.options;
      for (let i = 0; i < options.length; i++) {
        const opt = options[i];
        const item = document.createElement("div");
        item.className = "custom-select-option";
        item.setAttribute("role", "option");
        item.setAttribute("data-value", opt.value);
        item.setAttribute("data-index", i);
        item.textContent = opt.textContent;

        if (i === this.selectedIndex) {
          item.classList.add("selected");
          item.setAttribute("aria-selected", "true");
        }

        if (opt.disabled) {
          item.classList.add("disabled");
          item.setAttribute("aria-disabled", "true");
        }

        this.dropdown.appendChild(item);
      }
    }

    /**
     * 绑定事件
     */
    bindEvents() {
      // 点击触发器
      this.trigger.addEventListener("click", (e) => {
        e.stopPropagation();
        this.toggle();
      });

      // 键盘导航
      this.trigger.addEventListener("keydown", (e) => {
        this.handleKeydown(e);
      });

      // 点击选项
      this.dropdown.addEventListener("click", (e) => {
        const option = e.target.closest(".custom-select-option");
        if (option && !option.classList.contains("disabled")) {
          const index = parseInt(option.dataset.index, 10);
          this.selectOption(index);
        }
      });

      // 点击外部关闭
      document.addEventListener("click", (e) => {
        if (
          !this.wrapper.contains(e.target) &&
          !this.dropdown.contains(e.target)
        ) {
          this.close();
        }
      });

      // 监听原 select 的 change 事件（外部代码可能直接修改 select）
      this.select.addEventListener("change", () => {
        this.selectedIndex = this.select.selectedIndex;
        this.updateSelectedDisplay();
        this.updateOptionsState();
      });

      // 监听窗口滚动/调整大小时重新定位
      window.addEventListener("scroll", () => {
        if (this.isOpen) {
          this.positionDropdown();
        }
      });
    }

    /**
     * 键盘导航处理
     */
    handleKeydown(e) {
      switch (e.key) {
        case "Enter":
        case " ":
          e.preventDefault();
          if (this.isOpen) {
            // 选择当前高亮项
            const highlighted = this.dropdown.querySelector(
              ".custom-select-option.highlighted"
            );
            if (highlighted) {
              const index = parseInt(highlighted.dataset.index, 10);
              this.selectOption(index);
            }
          } else {
            this.open();
          }
          break;
        case "Escape":
          this.close();
          break;
        case "ArrowDown":
          e.preventDefault();
          if (!this.isOpen) {
            this.open();
          } else {
            this.highlightNext();
          }
          break;
        case "ArrowUp":
          e.preventDefault();
          if (this.isOpen) {
            this.highlightPrev();
          }
          break;
        case "Tab":
          this.close();
          break;
      }
    }

    /**
     * 高亮下一个选项
     */
    highlightNext() {
      const options = this.dropdown.querySelectorAll(
        ".custom-select-option:not(.disabled)"
      );
      const current = this.dropdown.querySelector(
        ".custom-select-option.highlighted"
      );
      let nextIndex = 0;

      if (current) {
        const currentIdx = Array.from(options).indexOf(current);
        nextIndex = (currentIdx + 1) % options.length;
        current.classList.remove("highlighted");
      }

      options[nextIndex]?.classList.add("highlighted");
      options[nextIndex]?.scrollIntoView({ block: "nearest" });
    }

    /**
     * 高亮上一个选项
     */
    highlightPrev() {
      const options = this.dropdown.querySelectorAll(
        ".custom-select-option:not(.disabled)"
      );
      const current = this.dropdown.querySelector(
        ".custom-select-option.highlighted"
      );
      let prevIndex = options.length - 1;

      if (current) {
        const currentIdx = Array.from(options).indexOf(current);
        prevIndex = (currentIdx - 1 + options.length) % options.length;
        current.classList.remove("highlighted");
      }

      options[prevIndex]?.classList.add("highlighted");
      options[prevIndex]?.scrollIntoView({ block: "nearest" });
    }

    /**
     * 切换下拉菜单
     */
    toggle() {
      if (this.isOpen) {
        this.close();
      } else {
        this.open();
      }
    }

    /**
     * 打开下拉菜单
     */
    open() {
      if (this.select.disabled) return;

      this.isOpen = true;
      this.wrapper.classList.add("open");
      this.dropdown.classList.add("open");
      this.trigger.setAttribute("aria-expanded", "true");
      this.positionDropdown();

      // 高亮当前选中项
      const selectedOption = this.dropdown.querySelector(
        ".custom-select-option.selected"
      );
      if (selectedOption) {
        selectedOption.classList.add("highlighted");
        selectedOption.scrollIntoView({ block: "nearest" });
      }
    }

    /**
     * 关闭下拉菜单
     */
    close() {
      this.isOpen = false;
      this.wrapper.classList.remove("open");
      this.dropdown.classList.remove("open");
      this.trigger.setAttribute("aria-expanded", "false");

      // 移除高亮
      const highlighted = this.dropdown.querySelector(
        ".custom-select-option.highlighted"
      );
      if (highlighted) {
        highlighted.classList.remove("highlighted");
      }
    }

    /**
     * 定位下拉菜单（使用 fixed 定位，智能判断向上或向下展开）
     */
    positionDropdown() {
      const triggerRect = this.trigger.getBoundingClientRect();
      const dropdownHeight = this.dropdown.scrollHeight || 200;
      const viewportHeight = window.innerHeight;
      const spaceBelow = viewportHeight - triggerRect.bottom;
      const spaceAbove = triggerRect.top;

      // 设置宽度与触发器一致
      this.dropdown.style.width = `${triggerRect.width}px`;
      this.dropdown.style.left = `${triggerRect.left}px`;

      // 重置位置类
      this.dropdown.classList.remove("dropdown-up", "dropdown-down");

      // 如果下方空间不足且上方空间充足，则向上展开
      if (spaceBelow < dropdownHeight + 8 && spaceAbove > spaceBelow) {
        this.dropdown.classList.add("dropdown-up");
        this.dropdown.style.top = "auto";
        this.dropdown.style.bottom = `${
          viewportHeight - triggerRect.top + 4
        }px`;
      } else {
        this.dropdown.classList.add("dropdown-down");
        this.dropdown.style.top = `${triggerRect.bottom + 4}px`;
        this.dropdown.style.bottom = "auto";
      }
    }

    /**
     * 选择选项
     */
    selectOption(index) {
      if (index < 0 || index >= this.select.options.length) return;

      const option = this.select.options[index];
      if (option.disabled) return;

      this.selectedIndex = index;
      this.select.selectedIndex = index;

      // 触发原生 change 事件
      const event = new Event("change", { bubbles: true });
      this.select.dispatchEvent(event);

      this.updateSelectedDisplay();
      this.updateOptionsState();
      this.close();
    }

    /**
     * 更新显示文本
     */
    updateSelectedDisplay() {
      const display = this.trigger.querySelector(".custom-select-display");
      const selectedOption = this.select.options[this.select.selectedIndex];

      if (selectedOption) {
        display.textContent = selectedOption.textContent;
        display.classList.remove("placeholder");
      } else {
        display.textContent = this.options.placeholder;
        display.classList.add("placeholder");
      }
    }

    /**
     * 更新选项状态
     */
    updateOptionsState() {
      const options = this.dropdown.querySelectorAll(".custom-select-option");
      options.forEach((opt, i) => {
        opt.classList.toggle("selected", i === this.select.selectedIndex);
        opt.setAttribute(
          "aria-selected",
          i === this.select.selectedIndex ? "true" : "false"
        );
      });
    }

    /**
     * 刷新选项（当原 select 的 options 动态变化时调用）
     */
    refresh() {
      this.selectedIndex = this.select.selectedIndex;
      this.renderOptions();
      this.updateSelectedDisplay();
    }

    /**
     * 销毁组件
     */
    destroy() {
      if (!this.wrapper) return;

      // 恢复原 select 显示
      this.select.style.display = "";
      this.select.dataset.customSelectInit = "";

      // 移除下拉菜单（已挂载到 body）
      if (this.dropdown && this.dropdown.parentNode) {
        this.dropdown.remove();
      }

      // 移除包装器中的自定义元素
      this.wrapper.parentNode.insertBefore(this.select, this.wrapper);
      this.wrapper.remove();

      this.wrapper = null;
      this.trigger = null;
      this.dropdown = null;
    }
  });

  /**
   * 初始化页面上所有 select 元素为自定义下拉
   * @param {string} selector - CSS 选择器，默认为 'select'
   * @param {Object} options - 配置选项
   * @returns {CustomSelect[]} 返回所有实例
   */
  function initCustomSelects(selector = "select", options = {}) {
    const selects = document.querySelectorAll(selector);
    const instances = [];

    selects.forEach((select) => {
      // 跳过已初始化的
      if (select.dataset.customSelectInit === "true") return;
      // 跳过有 data-native 属性的（保持原生）
      if (select.dataset.native === "true") return;

      const instance = new CustomSelect(select, options);
      instances.push(instance);
    });

    return instances;
  }

  /**
   * 刷新指定 select 元素的自定义下拉
   * @param {HTMLSelectElement} selectElement
   */
  function refreshCustomSelect(selectElement) {
    if (!selectElement) return;

    // 查找对应的包装器
    const wrapper = selectElement.closest(".custom-select-wrapper");
    if (wrapper && wrapper._customSelectInstance) {
      wrapper._customSelectInstance.refresh();
    } else {
      // 如果没有实例，重新初始化
      const parent = selectElement.parentNode;
      if (parent && parent.classList.contains("custom-select-wrapper")) {
        // 已经在包装器中，需要先销毁再重建
        // 简单方式：重新渲染选项
        const dropdown = parent.querySelector(".custom-select-dropdown");
        if (dropdown) {
          dropdown.innerHTML = "";
          const options = selectElement.options;
          for (let i = 0; i < options.length; i++) {
            const opt = options[i];
            const item = document.createElement("div");
            item.className = "custom-select-option";
            item.setAttribute("role", "option");
            item.setAttribute("data-value", opt.value);
            item.setAttribute("data-index", i);
            item.textContent = opt.textContent;

            if (i === selectElement.selectedIndex) {
              item.classList.add("selected");
              item.setAttribute("aria-selected", "true");
            }

            if (opt.disabled) {
              item.classList.add("disabled");
              item.setAttribute("aria-disabled", "true");
            }

            dropdown.appendChild(item);
          }

          // 更新显示文本
          const display = parent.querySelector(".custom-select-display");
          const selectedOption =
            selectElement.options[selectElement.selectedIndex];
          if (display && selectedOption) {
            display.textContent = selectedOption.textContent;
          }
        }
      }
    }
  }

  // 导出到全局
  window.CustomSelect = CustomSelect;
  window.initCustomSelects = initCustomSelects;
  window.refreshCustomSelect = refreshCustomSelect;

  // 关闭重复加载保护的代码块
}
