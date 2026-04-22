// src/lib/vk.js
import bridge from '@vkontakte/vk-bridge';

let initPromise = null;

export const vk = {
  bridge, // Экспортируем сам bridge для прямого доступа

  init: async (onAuth) => {
    if (initPromise) return initPromise;

    initPromise = (async () => {
      const href = window.location.href;
      console.log('Bridge: Init started. URL:', href);
      
      const hasVkParams = href.includes('vk_');
      
      try {
        console.log('Bridge: Waiting for VK Bridge and sending VKWebAppInit...');
        
        // Для Android важно использовать window.VKBridge если он есть, 
        // или дождаться инициализации стандартного bridge
        const currentBridge = window.VKBridge || bridge;
        
        const initCall = currentBridge.send('VKWebAppInit');
        const timeout = new Promise((_, reject) => 
          setTimeout(() => reject(new Error('VK Bridge timeout')), 7000)
        );
        
        await Promise.race([initCall, timeout]);
        console.log('✅ Bridge: VKWebAppInit success');
        
        // Получение данных пользователя
        try {
          const userInfoPromise = currentBridge.send('VKWebAppGetUserInfo');
          const authInfoPromise = vk.getAuthInfo();
          
          const bridgeTimeout = new Promise((_, reject) => 
            setTimeout(() => reject(new Error('Bridge data timeout')), 7000)
          );

          const [userInfo, authInfo] = await Promise.race([
            Promise.all([userInfoPromise, authInfoPromise]),
            bridgeTimeout
          ]);
          
          console.log('👤 Bridge: User and Auth info received');
          
          const userData = {
            vk_user_id: String(userInfo.id),
            first_name: userInfo.first_name,
            last_name: userInfo.last_name,
            photo: userInfo.photo_200,
            sign: authInfo.sign
          };

          if (onAuth) onAuth(userData);
          return { isEmbedded: true, userData, authInfo };

        } catch (err) {
          console.warn('⚠️ Bridge: Failed to get user data:', err.message);
          const authInfo = await vk.getAuthInfo();
          return { isEmbedded: true, authInfo, error: err.message };
        }
        
      } catch (err) {
        if (hasVkParams) {
          console.error('❌ Bridge: Init failed but URL has VK params:', err.message);
          const authInfo = await vk.getAuthInfo();
          return { isEmbedded: true, authInfo, error: err.message };
        }
        
        console.warn('Bridge: Not in VK environment or Bridge not responding');
        return { isEmbedded: false, error: err.message };
      }
    })();

    return initPromise;
  },
  
  async getUserInfo() {
    try {
      const currentBridge = window.VKBridge || bridge;
      return await currentBridge.send('VKWebAppGetUserInfo');
    } catch (err) {
      console.error('Failed to get user info:', err);
      throw err;
    }
  },

  async getAuthInfo() {
    try {
      const search = window.location.search;
      const hash = window.location.hash;
      console.log('Bridge: Parsing params. Search:', search, 'Hash:', hash);
      
      const searchParams = new URLSearchParams(search);
      const hashClean = hash.replace(/^#\/?/, '');
      const hashPart = hashClean.includes('?') ? hashClean.split('?')[1] : hashClean;
      const hashParams = new URLSearchParams(hashPart);
      
      const authData = {};
      const vkParams = [
        'vk_user_id', 'vk_app_id', 'vk_is_app_user', 
        'vk_are_notifications_enabled', 'vk_language', 
        'vk_ref', 'vk_access_token_settings', 'sign'
      ];

      vkParams.forEach(param => {
        const value = searchParams.get(param) || hashParams.get(param);
        if (value) {
          authData[param] = value;
        }
      });

      console.log('Bridge: Parsed authData:', { 
        hasUserId: !!authData.vk_user_id, 
        hasSign: !!authData.sign,
        paramsCount: Object.keys(authData).length 
      });

      return {
        ...authData,
        uuid: authData.vk_user_id,
        sign: authData.sign
      };
    } catch (err) {
      console.error('Failed to get auth info:', err);
      return {};
    }
  },
  
  async showNotification(title, message, type = 'info') {
    try {
      const currentBridge = window.VKBridge || bridge;
      await currentBridge.send('VKWebAppShowSnackbar', {
        message: `${title}: ${message}`,
        duration: 3000,
        type: type
      });
    } catch (err) {
      if ('Notification' in window && Notification.permission === 'granted') {
        new Notification(title, { body: message });
      } else {
        console.log(`🔔 ${title}: ${message}`);
      }
    }
  },

  async showConfirmBox(message) {
    try {
      const currentBridge = window.VKBridge || bridge;
      const result = await currentBridge.send('VKWebAppShowAlertBox', {
        title: 'Подтверждение',
        text: message,
        button_text: 'OK',
        negative_button_text: 'Отмена'
      });
      return result.result === true || result.button === 'OK';
    } catch (err) {
      console.warn('VKWebAppShowAlertBox failed, falling back to window.confirm:', err);
      return window.confirm(message);
    }
  },
  
  async requestNotificationPermission() {
    try {
      const currentBridge = window.VKBridge || bridge;
      const result = await currentBridge.send('VKWebAppSubscribeStoryApp', {});
      return result.result;
    } catch {
      return false;
    }
  },
  
  async uploadPhoto(file) {
    try {
      const currentBridge = window.VKBridge || bridge;
      const uploadUrl = await currentBridge.send('VKWebAppGetUploadServer', {
        group_id: 0,
        album_id: 'wall'
      });
      
      const formData = new FormData();
      formData.append('file', file);
      
      const uploadResponse = await fetch(uploadUrl.upload_url, {
        method: 'POST',
        body: formData
      });
      const uploadData = await uploadResponse.json();
      
      const saveResponse = await currentBridge.send('VKWebAppSaveWallPhoto', {
        photo: uploadData.photo,
        server: uploadData.server,
        hash: uploadData.hash,
        group_id: 0
      });
      
      return saveResponse.photos?.[0]?.sizes?.[0]?.url;
    } catch (err) {
      console.error('VK photo upload error:', err);
      throw new Error('Failed to upload photo');
    }
  }
};
