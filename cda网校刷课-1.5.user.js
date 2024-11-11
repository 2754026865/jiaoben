// ==UserScript==
// @name         cda网校刷课
// @namespace    http://tampermonkey.net/
// @version      1.5
// @description  自动点击"学过了"并跳转到下一任务，同时添加日志窗口
// @author       You
// @match        https://edu.cda.cn/course/*
// @grant        none
// ==/UserScript==
(function() {
    'use strict';

    // 检查是否在主窗口中
    if (window.top !== window.self) {
        console.log('在iframe中，跳过创建日志窗口');
        return;
    }

    // 创建日志窗口
    function createLogWindow() {
        if (document.getElementById('logWindow')) {
            console.log('日志窗口已存在，跳过创建');
            return;
        }

        const logWindow = document.createElement('div');
        logWindow.id = 'logWindow';
        logWindow.style.position = 'fixed';
        logWindow.style.bottom = '10px';
        logWindow.style.right = '10px';
        logWindow.style.width = '300px';
        logWindow.style.height = '150px';
        logWindow.style.overflowY = 'scroll';
        logWindow.style.backgroundColor = 'rgba(0, 0, 0, 0.7)';
        logWindow.style.color = 'white';
        logWindow.style.padding = '10px';
        logWindow.style.borderRadius = '5px';
        logWindow.style.fontSize = '12px';
        logWindow.style.zIndex = '9999';
        logWindow.style.cursor = 'move';
        logWindow.innerHTML = '<strong>日志窗口</strong><br>';
        document.body.appendChild(logWindow);
        makeDraggable(logWindow);
        console.log('日志窗口创建成功');
    }

    // 使日志窗口可拖动
    function makeDraggable(element) {
        let offsetX, offsetY, isDragging = false;

        element.addEventListener('mousedown', function(e) {
            if (e.target === element || element.contains(e.target)) {
                isDragging = true;
                offsetX = e.clientX - element.getBoundingClientRect().left;
                offsetY = e.clientY - element.getBoundingClientRect().top;

                function moveElement(e) {
                    if (isDragging) {
                        const newLeft = e.clientX - offsetX;
                        const newTop = e.clientY - offsetY;

                        const maxX = window.innerWidth - element.offsetWidth;
                        const maxY = window.innerHeight - element.offsetHeight;

                        element.style.left = `${Math.max(0, Math.min(newLeft, maxX))}px`;
                        element.style.top = `${Math.max(0, Math.min(newTop, maxY))}px`;
                    }
                }

                function stopDragging() {
                    isDragging = false;
                    document.removeEventListener('mousemove', moveElement);
                    document.removeEventListener('mouseup', stopDragging);
                }

                document.addEventListener('mousemove', moveElement);
                document.addEventListener('mouseup', stopDragging);
            }
        });
    }

    // 打印日志
    function log(message) {
        const logWindow = document.getElementById('logWindow');
        if (logWindow) {
            const timestamp = new Date().toLocaleTimeString();
            logWindow.innerHTML += `[${timestamp}] ${message}<br>`;
            logWindow.scrollTop = logWindow.scrollHeight;
        }
    }

    // 检查当前视频在列表中的位置
    function checkVideoPosition() {
        const activeItem = document.querySelector('.task-item.task-content.active');
        if (!activeItem) {
            log('未找到当前视频项');
            return { isLast: false, nextVideo: null };
        }

        // 获取所有视频项
        const allItems = Array.from(document.querySelectorAll('.task-item.task-content'));
        const currentIndex = allItems.indexOf(activeItem);

        // 检查是否是最后一个视频
        const isLast = currentIndex === allItems.length - 1;

        // 获取下一个视频的信息
        const nextVideo = !isLast ? allItems[currentIndex + 1] : null;

        // 记录日志
        const currentTitle = activeItem.querySelector('.title').textContent.trim();
        log(`当前视频：${currentTitle}`);
        if (nextVideo) {
            const nextTitle = nextVideo.querySelector('.title').textContent.trim();
            log(`下一个视频：${nextTitle}`);
        }

        return { isLast, nextVideo };
    }

    // 等待元素出现的函数
    function waitForElement(selector, timeout = 10000) {
        return new Promise((resolve, reject) => {
            const startTime = Date.now();

            const checkElement = () => {
                const element = document.querySelector(selector);
                if (element) {
                    resolve(element);
                } else if (Date.now() - startTime >= timeout) {
                    reject(new Error(`等待元素 ${selector} 超时`));
                } else {
                    setTimeout(checkElement, 500);
                }
            };

            checkElement();
        });
    }

    // 查找并点击"学过了"按钮
    async function clickLearnButton() {
        try {
            // 首先检查视频位置
            const { isLast, nextVideo } = checkVideoPosition();
            if (isLast) {
                log('当前视频是最后一个，停止自动点击');
                return;
            }

            // 查找"学过了"按钮
            const learnButton = document.querySelector('.btn.btn-transparent.btn-learn.js-btn-learn');

            if (learnButton) {
                log('找到"学过了"按钮，点击按钮...');
                learnButton.click();

                // 等待3秒让模态窗口完全显示
                log('等待3秒让模态窗口加载...');
                await new Promise(resolve => setTimeout(resolve, 3000));

                try {
                    // 等待下一任务按钮出现
                    log('查找下一任务按钮...');
                    const nextTaskButton = await waitForElement('.modal-footer .btn.btn-primary[href*="/course/"][href*="/task/"][href*="/show"]', 15000);

                    log('找到"下一任务"按钮，等待1秒后点击...');
                    // 再等待1秒确保按钮完全可交互
                    await new Promise(resolve => setTimeout(resolve, 1000));

                    nextTaskButton.click();
                    log('点击"下一任务"完成');

                    // 等待页面跳转后继续检查新页面
                    setTimeout(clickLearnButton, 5000);
                } catch (error) {
                    log('错误：未能找到或点击下一任务按钮，5秒后重试...');
                    setTimeout(clickLearnButton, 5000);
                }
            } else {
                log('未找到"学过了"按钮，5秒后重试...');
                setTimeout(clickLearnButton, 5000);
            }
        } catch (error) {
            log(`发生错误：${error.message}`);
            setTimeout(clickLearnButton, 5000);
        }
    }

    // 主要功能
    function init() {
        // 创建日志窗口
        createLogWindow();
        log('页面加载完成，开始检查视频列表...');
        // 开始查找并点击按钮
        clickLearnButton();
    }

    // 延迟执行主要功能，确保页面完全加载
    setTimeout(init, 5000);
})();