(() => {
    const func = (root, initStatus, changeStatus) => {
        const $ = (s) => {
            let dom = root.querySelectorAll(s);
            return dom.length == 1 ? dom[0] : dom;
        };
        let mainButton = $(".main-button");
        let daytimeBackground = $(".daytime-background");
        let cloud = $(".cloud");
        let cloudList = $(".cloud-son");
        let cloudLight = $(".cloud-light");
        // 原版只有两层云：纯白(.cloud)和浅白(.cloud-light)
        // let cloudFar = $(".cloud-far");  // 已移除第三层云
        let components = $(".components");
        let moon = $(".moon");
        let stars = $(".stars");
        let star = $(".star");
        let halo = $(".halo");
        let isMoved = false;
        let isClicked = false;

        // 根据初始状态设置按钮位置（右侧=开启，左侧=关闭）
        if (initStatus === "enabled") {
            isMoved = true;
            // 立即设置为开启状态（右侧）的外观
            setTimeout(() => {
                mainButton.style.transform = "translateX(110em)";
                mainButton.style.backgroundColor = "rgba(195, 200,210,1)";
                mainButton.style.boxShadow = "3em 3em 5em rgba(0, 0, 0, 0.5), inset  -3em -5em 3em -3em rgba(0, 0, 0, 0.5), inset  4em 5em 2em -2em rgba(255, 255, 210,1)";
                // 保留daytime-background光晕效果
                daytimeBackground[0].style.transform = "translateX(110em)";
                daytimeBackground[1].style.transform = "translateX(80em)";
                daytimeBackground[2].style.transform = "translateX(50em)";
                daytimeBackground[0].style.zIndex = "99";
                daytimeBackground[1].style.zIndex = "98";
                daytimeBackground[2].style.zIndex = "97";
                cloud.style.transform = "translateY(80em)";
                cloudLight.style.transform = "translateY(80em)";
                // cloudFar已移除
                components.style.backgroundColor = "rgba(25,30,50,1)";
                moon[0].style.opacity = "1";
                moon[1].style.opacity = "1";
                moon[2].style.opacity = "1";
                stars.style.transform = "translateY(-62.5em)";
                stars.style.opacity = "1";
                halo.style.opacity = "0";
            }, 0);
        }

        components.onclick = () => {
            if (isMoved) {
                // 从右侧切回左侧：切换为关闭状态
                mainButton.style.transform = "translateX(0)";
                mainButton.style.backgroundColor = "rgba(255, 195, 35,1)";

                mainButton.style.boxShadow =
                    "3em 3em 5em rgba(0, 0, 0, 0.5), inset  -3em -5em 3em -3em rgba(0, 0, 0, 0.5), inset  4em 5em 2em -2em rgba(255, 230, 80,1)";

                daytimeBackground[0].style.transform = "translateX(0)";
                daytimeBackground[1].style.transform = "translateX(0)";
                daytimeBackground[2].style.transform = "translateX(0)";
                cloud.style.transform = "translateY(10em)";
                cloudLight.style.transform = "translateY(10em)";
                components.style.backgroundColor = "rgba(70, 133, 192,1)";

                moon[0].style.opacity = "0";
                moon[1].style.opacity = "0";
                moon[2].style.opacity = "0";

                stars.style.transform = "translateY(-125em)";
                stars.style.opacity = "0";

                // 白天显示光晕
                halo.style.opacity = "1";

                // 右侧为“开启”，当前从右侧切回左侧 => 新状态为“关闭”
                changeStatus("disabled");
            } else {
                // 从左侧切到右侧：切换为开启状态
                mainButton.style.transform = "translateX(110em)";
                mainButton.style.backgroundColor = "rgba(195, 200,210,1)";

                mainButton.style.boxShadow =
                    "3em 3em 5em rgba(0, 0, 0, 0.5), inset  -3em -5em 3em -3em rgba(0, 0, 0, 0.5), inset  4em 5em 2em -2em rgba(255, 255, 210,1)";

                // 保留daytime-background光晕效果
                daytimeBackground[0].style.transform = "translateX(110em)";
                daytimeBackground[1].style.transform = "translateX(80em)";
                daytimeBackground[2].style.transform = "translateX(50em)";
                cloud.style.transform = "translateY(80em)";
                cloudLight.style.transform = "translateY(80em)";
                // cloudFar已移除
                components.style.backgroundColor = "rgba(25,30,50,1)";

                moon[0].style.opacity = "1";
                moon[1].style.opacity = "1";
                moon[2].style.opacity = "1";

                stars.style.transform = "translateY(-62.5em)";
                stars.style.opacity = "1";
                // 夜晚隐藏光晕
                halo.style.opacity = "0";

                // 左侧切到右侧 => 新状态为“开启”
                changeStatus("enabled");
            }

            isClicked = true;

            setTimeout(function () {
                isClicked = false;
            }, 300); // 缩短点击锁定时间
            isMoved = !isMoved;
        };

        mainButton.addEventListener("mousemove", function () {
            if (isClicked) return;

            if (isMoved) {
                mainButton.style.transform = "translateX(100em)";
                daytimeBackground[0].style.transform = "translateX(100em)";
                daytimeBackground[1].style.transform = "translateX(73em)";
                daytimeBackground[2].style.transform = "translateX(46em)";

                star[0].style.top = "10em";
                star[0].style.left = "36em";
                star[1].style.top = "40em";
                star[1].style.left = "87em";
                star[2].style.top = "26em";
                star[2].style.left = "16em";
                star[3].style.top = "38em";
                star[3].style.left = "63em";
                star[4].style.top = "20.5em";
                star[4].style.left = "72em";
                star[5].style.top = "51.5em";
                star[5].style.left = "35em";
            } else {
                mainButton.style.transform = "translateX(10em)";
                daytimeBackground[0].style.transform = "translateX(10em)";
                daytimeBackground[1].style.transform = "translateX(7em)";
                daytimeBackground[2].style.transform = "translateX(4em)";

                cloudList[0].style.right = "-24em";
                cloudList[0].style.bottom = "10em";
                cloudList[1].style.right = "-12em";
                cloudList[1].style.bottom = "-27em";
                cloudList[2].style.right = "17em";
                cloudList[2].style.bottom = "-43em";
                cloudList[3].style.right = "46em";
                cloudList[3].style.bottom = "-39em";
                cloudList[4].style.right = "70em";
                cloudList[4].style.bottom = "-65em";
                cloudList[5].style.right = "109em";
                cloudList[5].style.bottom = "-54em";
                cloudList[6].style.right = "-23em";
                cloudList[6].style.bottom = "10em";
                cloudList[7].style.right = "-11em";
                cloudList[7].style.bottom = "-26em";
                cloudList[8].style.right = "18em";
                cloudList[8].style.bottom = "-42em";
                cloudList[9].style.right = "47em";
                cloudList[9].style.bottom = "-38em";
                cloudList[10].style.right = "74em";
                cloudList[10].style.bottom = "-64em";
                cloudList[11].style.right = "110em";
                cloudList[11].style.bottom = "-55em";
            }
        });

        mainButton.addEventListener("mouseout", function () {
            if (isClicked) {
                return;
            }
            if (isMoved) {
                mainButton.style.transform = "translateX(110em)";
                daytimeBackground[0].style.transform = "translateX(110em)";
                daytimeBackground[1].style.transform = "translateX(80em)";
                daytimeBackground[2].style.transform = "translateX(50em)";

                star[0].style.top = "11em";
                star[0].style.left = "39em";
                star[1].style.top = "39em";
                star[1].style.left = "91em";
                star[2].style.top = "26em";
                star[2].style.left = "19em";
                star[3].style.top = "37em";
                star[3].style.left = "66em";
                star[4].style.top = "21em";
                star[4].style.left = "75em";
                star[5].style.top = "51em";
                star[5].style.left = "38em";
                halo.style.opacity = "0";
            } else {
                mainButton.style.transform = "translateX(0em)";
                daytimeBackground[0].style.transform = "translateX(0em)";
                daytimeBackground[1].style.transform = "translateX(0em)";
                daytimeBackground[2].style.transform = "translateX(0em)";

                cloudList[0].style.right = "-20em";
                cloudList[0].style.bottom = "10em";
                cloudList[1].style.right = "-10em";
                cloudList[1].style.bottom = "-25em";
                cloudList[2].style.right = "20em";
                cloudList[2].style.bottom = "-40em";
                cloudList[3].style.right = "50em";
                cloudList[3].style.bottom = "-35em";
                cloudList[4].style.right = "75em";
                cloudList[4].style.bottom = "-60em";
                cloudList[5].style.right = "110em";
                cloudList[5].style.bottom = "-50em";
                cloudList[6].style.right = "-20em";
                cloudList[6].style.bottom = "10em";
                cloudList[7].style.right = "-10em";
                cloudList[7].style.bottom = "-25em";
                cloudList[8].style.right = "20em";
                cloudList[8].style.bottom = "-40em";
                cloudList[9].style.right = "50em";
                cloudList[9].style.bottom = "-35em";
                cloudList[10].style.right = "75em";
                cloudList[10].style.bottom = "-60em";
                cloudList[11].style.right = "110em";
                cloudList[11].style.bottom = "-50em";
                halo.style.opacity = "1";
            }
        });

        const getRandomDirection = () => {
            const directions = ["2em", "-2em"];
            return directions[Math.floor(Math.random() * directions.length)];
        };

        const moveElementRandomly = (element) => {
            const randomDirectionX = getRandomDirection();
            const randomDirectionY = getRandomDirection();
            element.style.transform = `translate(${randomDirectionX}, ${randomDirectionY})`;
        };

        const cloudSons = root.querySelectorAll(".cloud-son");
        setInterval(() => {
            cloudSons.forEach(moveElementRandomly);  // 仅对所有 .cloud-son 元素执行移动
        }, 600); // 缩短云朵移动间隔        // 无需在最后再次调用onclick，因为我们已经在上面设置了初始状态
    };

    class VocabularyStatusButton extends HTMLElement {
        constructor() {
            super();
        }
        connectedCallback() {
            const initStatus = this.getAttribute("status") || "enabled"; // enabled 或 disabled
            const vocabularyId = this.getAttribute("vocabulary-id");
            const size = +this.getAttribute("size") || 1.5; // 缩小默认尺寸
            const shadow = this.attachShadow({ mode: "closed" });
            const container = document.createElement("div");
            container.setAttribute("class", "container");
            container.setAttribute("style", `font-size: ${(size / 3).toFixed(2)}px`);
            container.innerHTML =
                '<div class="components"><div class="main-button"><div class="halo"></div><div class="moon"></div><div class="moon"></div><div class="moon"></div></div><div class="daytime-background"></div><div class="daytime-background"></div><div class="daytime-background"></div><div class="cloud"><div class="cloud-son"></div><div class="cloud-son"></div><div class="cloud-son"></div><div class="cloud-son"></div><div class="cloud-son"></div><div class="cloud-son"></div></div><div class="cloud-light"><div class="cloud-son"></div><div class="cloud-son"></div><div class="cloud-son"></div><div class="cloud-son"></div><div class="cloud-son"></div><div class="cloud-son"></div></div><div class="stars"><div class="star big"><div class="star-son"></div><div class="star-son"></div><div class="star-son"></div><div class="star-son"></div></div><div class="star big"><div class="star-son"></div><div class="star-son"></div><div class="star-son"></div><div class="star-son"></div></div><div class="star medium"><div class="star-son"></div><div class="star-son"></div><div class="star-son"></div><div class="star-son"></div></div><div class="star medium"><div class="star-son"></div><div class="star-son"></div><div class="star-son"></div><div class="star-son"></div></div><div class="star small"><div class="star-son"></div><div class="star-son"></div><div class="star-son"></div><div class="star-son"></div></div><div class="star small"><div class="star-son"></div><div class="star-son"></div><div class="star-son"></div><div class="star-son"></div></div></div></div>';
            const style = document.createElement("style");
            style.textContent =
                "* { margin: 0; padding: 0; transition: 0.4s; -webkit-tap-highlight-color:rgba(0,0,0,0); } .container { position: relative; top: 0; left: 0; margin: 0; width: 180em; height: 70em; display: inline-block; vertical-align: bottom; transform: translate3d(0, 0, 0); } .components{ position: relative; width: 180em; height: 70em; background-color: rgba(70, 133, 192,1); border-radius: 100em; box-shadow: inset 0 0 5em 3em rgba(0, 0, 0, 0.5); overflow: hidden; transition: 0.4s; transition-timing-function: cubic-bezier( 0,0.5, 1,1); cursor: pointer; box-shadow: 2px 3px 4px rgba(0, 0, 0, 0.15); } .main-button{ z-index: 999; margin: 7.5em 0 0 7.5em; width: 55em; height:55em; background-color: rgba(255, 195, 35,1); border-radius: 50%; box-shadow:3em 3em 5em rgba(0, 0, 0, 0.5), inset -3em -5em 3em -3em rgba(0, 0, 0, 0.5), inset 4em 5em 2em -2em rgba(255, 230, 80,1); transition: 0.6s; transition-timing-function: cubic-bezier(0.56, 1.35, 0.52, 1.00); position: relative; z-index: 999; overflow: visible; } .halo{ position: absolute; inset: -10em; border-radius: 50%; pointer-events: none; background: radial-gradient( circle at 50% 50%, rgba(255,230,120,0.7), rgba(255,200,60,0.35) 45%, rgba(255,200,60,0.0) 70% ); filter: blur(2em); opacity: 1; transition: opacity 0.4s; z-index: 5; } .moon{ position: absolute; background-color: rgba(150, 160, 180, 1); box-shadow:inset 0em 0em 1em 1em rgba(0, 0, 0, 0.3) ; border-radius: 50%; transition: 0.3s; opacity: 0; } .moon:nth-child(2){ top: 7.5em; left: 25em; width: 12.5em; height: 12.5em; } .moon:nth-child(3){ top: 20em; left: 7.5em; width: 20em; height: 20em; } .moon:nth-child(4){ top: 32.5em; left: 32.5em; width: 12.5em; height: 12.5em; } .daytime-background { position: absolute; border-radius: 50%; transition: 0.6s; transition-timing-function: cubic-bezier(0.56, 1.35, 0.52, 1.00); } .daytime-background:nth-child(2){ top: -20em; left: -20em; width: 110em; height:110em; background-color: rgba(255, 255, 255,0.2); z-index: 99; } .daytime-background:nth-child(3){ top: -32.5em; left: -17.5em; width: 135em; height:135em; background-color: rgba(255, 255, 255,0.1); z-index: 98; } .daytime-background:nth-child(4){ top: -45em; left: -15em; width: 160em; height:160em; background-color: rgba(255, 255, 255,0.05); z-index: 97; } .cloud,.cloud-light{ transform: translateY(10em); transition: 0.6s; transition-timing-function: cubic-bezier(0.56, 1.35, 0.52, 1.00); } .cloud-son{ position: absolute; background-color: #fff; border-radius: 50%; z-index: -1; transition: transform 3s,right 0.6s,bottom 0.6s; } .cloud-son:nth-child(6n+1){ right: -20em; bottom: 10em; width: 50em; height: 50em; } .cloud-son:nth-child(6n+2) { right: -10em; bottom: -25em; width: 60em; height: 60em; } .cloud-son:nth-child(6n+3) { right: 20em; bottom: -40em; width: 60em; height: 60em; } .cloud-son:nth-child(6n+4) { right: 50em; bottom: -35em; width: 60em; height: 60em; } .cloud-son:nth-child(6n+5) { right: 75em; bottom: -60em; width: 75em; height: 75em; } .cloud-son:nth-child(6n+6) { right: 110em; bottom: -50em; width: 60em; height: 60em; } .cloud{ z-index: 0; } .cloud-light{ position: absolute; right: 5em; bottom: 20em; opacity: 0.6; z-index: 1; } .stars{ transform: translateY(-125em); z-index: -1; transition: 0.6s; transition-timing-function: cubic-bezier(0.56, 1.35, 0.52, 1.00); } .big { --size: 7.5em; } .medium { --size: 5em; } .small { --size: 3em; } .star { position: absolute; width: calc(2*var(--size)); height: calc(2*var(--size)); } .star:nth-child(1){ top: 11em; left: 39em; animation-name: star; animation-duration: 2.5s; } .star:nth-child(2){ top: 39em; left: 91em; animation-name: star; animation-duration: 3.0s; } .star:nth-child(3){ top: 26em; left: 19em; animation-name: star; animation-duration: 3.5s; } .star:nth-child(4){ top: 37em; left: 66em; animation-name: star; animation-duration: 3.8s; } .star:nth-child(5){ top: 21em; left: 75em; animation-name: star; animation-duration: 2.2s; } .star:nth-child(6){ top: 51em; left: 38em; animation-name: star; animation-duration: 1.8s; } @keyframes star { 0%,20%{ transform: scale(0); } 20%,100% { transform: scale(1); } } .star-son{ float: left; } .star-son:nth-child(1) { --pos: left 0; } .star-son:nth-child(2) { --pos: right 0; } .star-son:nth-child(3) { --pos: 0 bottom; } .star-son:nth-child(4) { --pos: right bottom; } .star-son { width: var(--size); height: var(--size); background-image: radial-gradient(circle var(--size) at var(--pos), transparent var(--size), #fff); } .star{ transform: scale(1); transition-timing-function: cubic-bezier(0.56, 1.35, 0.52, 1.00); transition: 0.6s; animation-iteration-count:infinite; animation-direction: alternate; animation-timing-function: linear; } .twinkle { transform: scale(0); }";
            const changeStatus = (status) => {
                // 触发自定义事件，传递词库ID和新状态（启用冒泡与穿透）
                this.dispatchEvent(new CustomEvent("statuschange", {
                    detail: { vocabularyId: vocabularyId, status: status },
                    bubbles: true,
                    composed: true
                }));
            };
            func(container, initStatus, changeStatus);
            shadow.appendChild(style);
            shadow.appendChild(container);
        }
    }

    customElements.define("vocabulary-status-button", VocabularyStatusButton);
})();