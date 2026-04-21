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
      
      const search = window.location.search;
      const hash = window.location.hash;
      // Проверка на наличие параметров VK
      const hasVkParams = href.includes('vk_');
      
      try {
        console.log('Bridge: Sending VKWebAppInit...');
        // Попытка инициализации в любом случае, но с таймаутом
        const initCall = bridge.send('VKWebAppInit');
        const timeout = new Promise((_, reject) => 
          setTimeout(() => reject(new Error('VK Bridge timeout')), 5000)
        );
        
        await Promise.race([initCall, timeout]);
        console.log('✅ Bridge: VKWebAppInit success');
        
        // Если инициализация прошла, считаем что мы в VK
        const isEmbedded = true;

        // Получение данных пользователя
        try {
          const userInfoPromise = bridge.send('VKWebAppGetUserInfo');
          const authInfoPromise = vk.getAuthInfo();
          
          const bridgeTimeout = new Promise((_, reject) => 
            setTimeout(() => reject(new Error('Bridge data timeout')), 5000)
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
          console.warn('⚠️ Bridge: Failed to get user data, but bridge is alive:', err.message);
          const authInfo = await vk.getAuthInfo();
          return { isEmbedded: true, authInfo, error: err.message };
        }
        
      } catch (err) {
        // Если инициализация упала (таймаут или ошибка), проверяем параметры URL
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
  
  // � Получить данные пользователя
  async getUserInfo() {
    try {
      return await bridge.send('VKWebAppGetUserInfo');
    } catch (err) {
      console.error('Failed to get user info:', err);
      throw err;
    }
  },

  // 🔑 Получить данные авторизации (launch params)
  async getAuthInfo() {
    try {
      const search = window.location.search;
      const hash = window.location.hash;
      
      // Объединяем параметры из search и hash (на случай использования HashRouter)
      const searchParams = new URLSearchParams(search);
      
      // Для hash нужно убрать символ '#' и всё что до знака '?' внутри хэша
      // Также убираем ведущие слеши, которые могут мешать URLSearchParams
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
        // Приоритет параметрам из URL (search), затем из хэша
        const value = searchParams.get(param) || hashParams.get(param);
        if (value) {
          authData[param] = value;
        }
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
  
  // �� Показать уведомление
  async showNotification(title, message, type = 'info') {
    try {
      await bridge.send('VKWebAppShowSnackbar', {
        message: `${title}: ${message}`,
        duration: 3000,
        type: type // 'info', 'success', 'error'
      });
    } catch (err) {
      // Fallback для браузеров
      if ('Notification' in window && Notification.permission === 'granted') {
        new Notification(title, { body: message });
      } else {
        console.log(`🔔 ${title}: ${message}`);
      }
    }
  },
  
  // 🔔 Запросить разрешение на уведомления
  async requestNotificationPermission() {
    try {
      const result = await bridge.send('VKWebAppSubscribeStoryApp', {});
      return result.result;
    } catch {
      return false;
    }
  },
  
  // 📤 Загрузка фото через VK
  async uploadPhoto(file) {
    try {
      // 1. Получаем URL для загрузки
      const uploadUrl = await bridge.send('VKWebAppGetUploadServer', {
        group_id: 0, // 0 = пользователь
        album_id: 'wall' // или 'messages' для чатов
      });
      
      // 2. Загружаем файл на сервер VK
      const formData = new FormData();
      formData.append('file', file);
      
      const uploadResponse = await fetch(uploadUrl.upload_url, {
        method: 'POST',
        body: formData
      });
      const uploadData = await uploadResponse.json();
      
      // 3. Сохраняем фото
      const saveResponse = await bridge.send('VKWebAppSaveWallPhoto', {
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
