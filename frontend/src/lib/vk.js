// src/lib/vk.js
import bridge from '@vkontakte/vk-bridge';

export const vk = {
  async init() {
    bridge.send('VKWebAppInit');
    bridge.subscribe(({ detail: { type, data } }) => {
      console.log('VK Bridge event:', type, data);
    });
  },
  
  async getAuthInfo() {
    return bridge.send('VKWebAppGetAuthInfo');
  },
  
  async getUserInfo() {
    return bridge.send('VKWebAppGetUserInfo');
  }
};
