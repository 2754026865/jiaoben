// ==UserScript==
// @name         学堂在线（始皇）
// @namespace    http://tampermonkey.net/
// @version      2024-10-15
// @description  Auto play next video on XueTangX
// @author       秦始皇
// @match        https://www.xuetangx.com/*
// @icon         https://storagecdn.xuetangx.com/public_assets/xuetangx/xuetangX2018/7f0a03259697d168b92e4d9d9208116f.loadingbg.gif
// @updateURL    https://raw.githubusercontent.com/2754026865/jiaoben/refs/heads/main/%E5%AD%A6%E5%A0%82%E5%9C%A8%E7%BA%BF%EF%BC%88%E5%A7%8B%E7%9A%87%EF%BC%89.js
// @downloadURL  https://raw.githubusercontent.com/2754026865/jiaoben/refs/heads/main/%E5%AD%A6%E5%A0%82%E5%9C%A8%E7%BA%BF%EF%BC%88%E5%A7%8B%E7%9A%87%EF%BC%89.js
// @grant        none
// ==/UserScript==
(function() {
    'use strict';
    let a = '';
    let b = [];

    function c() {
        if (document.getElementById('logWindow')) return;
        const d = document.createElement('div');
        d.id = 'logWindow';
        d.style.position = 'fixed';
        d.style.bottom = '10px';
        d.style.right = '10px';
        d.style.width = '300px';
        d.style.height = '150px';
        d.style.overflowY = 'scroll';
        d.style.backgroundColor = 'rgba(0, 0, 0, 0.7)';
        d.style.color = 'white';
        d.style.padding = '10px';
        d.style.borderRadius = '5px';
        d.style.fontSize = '12px';
        d.style.zIndex = '9999';
        d.style.cursor = 'move';
        d.innerHTML = '<strong>日志窗口</strong><br>';
        document.body.appendChild(d);
        e(d);
    }

    function f(g) {
        const h = document.getElementById('logWindow');
        const i = new Date().toLocaleTimeString();
        h.innerHTML += `[${i}] ${g}<br>`;
        h.scrollTop = h.scrollHeight;
    }

    function j(g) {
        console.log(`[自动播放脚本] ${g}`);
        f(g);
    }

    function e(k) {
        let l = 0, m = 0, n = 0, o = 0;
        k.onmousedown = function(p) {
            p.preventDefault();
            n = p.clientX;
            o = p.clientY;
            document.onmousemove = q;
            document.onmouseup = r;
        };

        function q(p) {
            p.preventDefault();
            l = n - p.clientX;
            m = o - p.clientY;
            n = p.clientX;
            o = p.clientY;
            k.style.top = (k.offsetTop - m) + "px";
            k.style.left = (k.offsetLeft - l) + "px";
        }

        function r() {
            document.onmouseup = null;
            document.onmousemove = null;
        }
    }

    function s() {
        const t = document.querySelectorAll('ul.first li.detail div.title');
        b = Array.from(t).map((u) => {
            const v = u.querySelector('span.titlespan').innerText.trim();
            return { element: u, title: v, watched: u.querySelector('i.iconfont.percentFull') !== null };
        }).filter(w => !w.title.includes('练习'));
        j(`检测到 ${b.length} 个视频（排除“练习”）`);
    }

    function x() {
        const y = b.find(z => !z.watched);
        if (y) {
            j(`准备播放视频：${y.title}`);
            y.element.click();
        } else {
            j('所有视频已播放完毕');
        }
    }

    function A() {
        const B = document.querySelector('.xt_video_player_play_btn');
        const C = document.querySelector('video');

        if (!C) {
            j('当前为“答题”页，直接点击“下一课”');
            G();
            return;
        }

        const E = document.querySelector('li .title.active .titlespan.noScore');
        if (E) {
            const F = E.innerText.trim();
            if (F !== a) {
                a = F;
                j(`当前播放视频的标题为：${a}`);
            }
        } else {
            j('未找到当前播放视频的标题');
        }

        if (B) {
            const playTip = B.querySelector('.play-btn-tip')?.innerText.trim();
            if (playTip === '暂停') {
                j('视频正在播放');
            } else if (playTip === '播放') {
                j('视频暂停，尝试点击播放按钮');
                const videoElement = document.querySelector('video');
                if (videoElement) {
                    videoElement.play();
                    j('视频播放成功');
                } else {
                    B.click();
                    j('已点击播放按钮恢复视频播放');
                }
            }
        } else {
            j('未找到播放按钮');
        }

        C.removeEventListener('ended', x);
        C.addEventListener('ended', function() {
            j('视频播放结束');
            x();
        });
    }

    function G() {
        const H = document.querySelector('div.control p.next span.textover');
        if (H) {
            const nextLessonText = H.innerText.trim();
            j(`找到“下一课”按钮，单元内容为：${nextLessonText}`);

            if (nextLessonText.includes('下一单元')) {
                j('点击“下一课”按钮');
                H.closest('p.next').click(); // 点击包含“下一课”按钮的父级元素
            } else {
                j('未找到有效的“下一课”单元内容');
            }
        } else {
            j('未找到“下一课”按钮');
        }
    }

    window.addEventListener('load', function() {
        c();
        j('页面加载完成，等待视频加载');
        setTimeout(function() {
            s();
            x();
            setInterval(A, 3000);
        }, 5000);
    });
})();


