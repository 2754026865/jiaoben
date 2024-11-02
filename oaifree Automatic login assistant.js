// ==UserScript==
// @name         OAIFree 多Token自动登录助手
// @namespace    http://tampermonkey.net/
// @version      0.4
// @description  支持多个refresh token，用户可随时选择token并自动登录，方便在不同账号之间切换
// @author       You
// @match        https://new.oaifree.com/*
// @grant        GM_xmlhttpRequest
// @grant        GM_setValue
// @grant        GM_getValue 
// @grant        GM_registerMenuCommand
// @connect      token.oaifree.com
// @connect      chat.oaifree.com
// @updateURL    https://raw.githubusercontent.com/2754026865/jiaoben/refs/heads/main/oaifree%20Automatic%20login%20assistant.js
// @downloadURL  https://raw.githubusercontent.com/2754026865/jiaoben/refs/heads/main/oaifree%20Automatic%20login%20assistant.js
// ==/UserScript==

(function() {
    'use strict';
    
    // 配置常量
    const CONFIG = {
        API_ENDPOINTS: {
            REFRESH: 'https://token.oaifree.com/api/auth/refresh',
            REGISTER: 'https://chat.oaifree.com/token/register',
            LOGIN: 'https://new.oaifree.com/auth/login_share'
        },
        STORAGE_KEYS: {
            EXPIRE_AT: 'expire_at',
            SHARE_TOKEN: 'share_token',
            REFRESH_TOKENS: 'refresh_tokens'  // 新增:用于存储令牌
        },
        ERROR_MESSAGES: {
            TOKEN_REFRESH_FAILED: '刷新访问令牌失败',
            SHARE_TOKEN_FAILED: '生成共享令牌失败',
            LOGIN_FAILED: '登录失败，请查看控制台获取详细信息'
        }
    };

    // Token管理类
    class TokenManager {
        constructor() {
            this.refreshTokens = GM_getValue(CONFIG.STORAGE_KEYS.REFRESH_TOKENS, [
                '**************',
                // 添加更多token
            ]);
        }

        // 添加新token
        addToken(token) {
            if (!this.refreshTokens.includes(token)) {
                this.refreshTokens.push(token);
                this.saveTokens();
                this.registerMenuCommands(); // 重新注册菜单
            }
        }

        // 移除token
        removeToken(index) {
            if (index >= 0 && index < this.refreshTokens.length) {
                this.refreshTokens.splice(index, 1);
                this.saveTokens();
                this.registerMenuCommands(); // 重新注册菜单
            }
        }

        // 保存tokens到存储
        saveTokens() {
            GM_setValue(CONFIG.STORAGE_KEYS.REFRESH_TOKENS, this.refreshTokens);
        }

        // 注册菜单命令
        registerMenuCommands() {
            this.refreshTokens.forEach((token, index) => {
                GM_registerMenuCommand(
                    `切换到 Token ${index + 1}`, 
                    () => this.selectTokenAndLogin(index)
                );
            });
            
            // 添加管理菜单
            GM_registerMenuCommand('添加新Token', () => {
                const newToken = prompt('请输入新的Refresh Token:');
                if (newToken) this.addToken(newToken);
            });
        }

        // 检查token是否过期
        isTokenExpired() {
            const expireAt = GM_getValue(CONFIG.STORAGE_KEYS.EXPIRE_AT, 0);
            return isNaN(expireAt) || (Date.now() / 1000) >= expireAt;
        }

        // 生成随机标识符
        generateUniqueIdentifier() {
            return Array.from(
                { length: 8 }, 
                () => Math.floor(Math.random() * 16).toString(16)
            ).join('');
        }

        // API请求工具
        async makeRequest(url, method, data) {
            return new Promise((resolve, reject) => {
                GM_xmlhttpRequest({
                    method,
                    url,
                    headers: {
                        'Content-Type': 'application/x-www-form-urlencoded'
                    },
                    data: new URLSearchParams(data).toString(),
                    onload: (response) => {
                        if (response.status === 200) {
                            try {
                                const data = JSON.parse(response.responseText);
                                resolve(data);
                            } catch (e) {
                                reject(new Error('Invalid JSON response'));
                            }
                        } else {
                            reject(new Error(`HTTP ${response.status}`));
                        }
                    },
                    onerror: (error) => reject(error)
                });
            });
        }

        // 获取访问令牌
        async getAccessToken(refreshToken) {
            try {
                const data = await this.makeRequest(
                    CONFIG.API_ENDPOINTS.REFRESH,
                    'POST',
                    { refresh_token: refreshToken }
                );
                
                if (!data.access_token) {
                    throw new Error('No access token in response');
                }
                
                return data.access_token;
            } catch (error) {
                console.error('Access token error:', error);
                throw new Error(CONFIG.ERROR_MESSAGES.TOKEN_REFRESH_FAILED);
            }
        }

        // 获取共享令牌
        async getShareToken(accessToken) {
            try {
                const data = await this.makeRequest(
                    CONFIG.API_ENDPOINTS.REGISTER,
                    'POST',
                    {
                        unique_name: this.generateUniqueIdentifier(),
                        access_token: accessToken,
                        expires_in: 0,
                        site_limit: '',
                        gpt35_limit: -1,
                        gpt4_limit: -1,
                        show_conversations: true
                    }
                );

                if (!data.token_key) {
                    throw new Error('No token key in response');
                }

                GM_setValue(CONFIG.STORAGE_KEYS.EXPIRE_AT, data.expire_at);
                return data.token_key;
            } catch (error) {
                console.error('Share token error:', error);
                throw new Error(CONFIG.ERROR_MESSAGES.SHARE_TOKEN_FAILED);
            }
        }

        // 执行登录
        autoLogin(shareToken) {
            const loginUrl = `${CONFIG.API_ENDPOINTS.LOGIN}?token=${shareToken}`;
            console.log('Logging in with URL:', loginUrl);
            window.location.href = loginUrl;
        }

        // 选择token并登录
        async selectTokenAndLogin(index) {
            try {
                const refreshToken = this.refreshTokens[index];
                console.log('Using refresh token:', refreshToken);
                
                const accessToken = await this.getAccessToken(refreshToken);
                console.log('Access token obtained');
                
                const shareToken = await this.getShareToken(accessToken);
                console.log('Share token obtained');
                
                GM_setValue(CONFIG.STORAGE_KEYS.SHARE_TOKEN, shareToken);
                this.autoLogin(shareToken);
            } catch (error) {
                console.error('Login failed:', error);
                alert(CONFIG.ERROR_MESSAGES.LOGIN_FAILED);
            }
        }

        // 检查并自动登录
        async checkAndAutoLogin() {
            if (window.location.pathname !== '/auth/login_auth0') return;

            try {
                const shareToken = GM_getValue(CONFIG.STORAGE_KEYS.SHARE_TOKEN);
                if (this.isTokenExpired() || !shareToken) {
                    console.log('Token expired or not found. Please select a token from menu.');
                    return;
                }
                
                console.log('Token valid, auto-logging in...');
                this.autoLogin(shareToken);
            } catch (error) {
                console.error('Auto-login error:', error);
            }
        }
    }

    // 初始化并运行
    const tokenManager = new TokenManager();
    tokenManager.registerMenuCommands();
    tokenManager.checkAndAutoLogin();
})();
