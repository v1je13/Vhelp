// src/lib/vk.js
import bridge from '@vkontakte/vk-bridge';

let initPromise = null;

export const vk = {
  bridge, // Экспортируем сам bridge для прямого доступа

  init: async (onAuth) => {
    // Если инициализация уже завершена, возвращаем успешный статус
    if (initPromise) return initPromise;

    initPromise = (async () => {
      console.log('Bridge: Initialization started...');
      
      const isEmbedded = window.location.search.includes('vk_');
      
      if (!isEmbedded) {
        console.warn('Bridge: Not in VK environment - finishing init flow');
        // Даже если мы не в VK, помечаем инициализацию как "завершенную", 
        // чтобы фронтенд убрал лоадер
        return { isEmbedded: false };
      }

      try {
        // Таймаут для инициализации — уменьшаем до 5 секунд для отзывчивости
        const initCall = bridge.send('VKWebAppInit');
        const timeout = new Promise((_, reject) => 
          setTimeout(() => reject(new Error('VK Bridge timeout')), 5000)
        );
        
        await Promise.race([initCall, timeout]);
        console.log('✅ Bridge: VKWebAppInit success');
        
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
          console.warn('⚠️ Bridge: Failed to get user info:', err);
          if (onAuth) {
            onAuth({
              vk_user_id: 'mobile_fallback',
              first_name: 'Mobile',
              last_name: 'User',
              photo: ''
            });
          }
          return { isEmbedded: true, error: 'UserInfo failed' };
        }
        
      } catch (err) {
        console.error('❌ Bridge: Init failed:', err.message);
        
        // Попытка восстановить из localStorage при ошибке
        if (onAuth) {
          const savedUser = localStorage.getItem('vhelp_user');
          if (savedUser) {
            try {
              onAuth(JSON.parse(savedUser));
              console.log('🔄 Bridge: Restored from localStorage');
            } catch (e) {}
          }
        }
        return { isEmbedded: true, error: err.message };
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
      const params = new URLSearchParams(search);
      const authData = {};
      
      // Список важных параметров от VK
      const vkParams = [
        'vk_user_id', 'vk_app_id', 'vk_is_app_user', 
        'vk_are_notifications_enabled', 'vk_language', 
        'vk_ref', 'vk_access_token_settings', 'sign'
      ];

      vkParams.forEach(param => {
        if (params.has(param)) {
          authData[param] = params.get(param);
        }
      });

      // Для совместимости с Auth.jsx, который ожидает uuid
      return {
        ...authData,
        uuid: authData.vk_user_id,
        sign: authData.sign
      };
    } catch (err) {
      console.error('Failed to get auth info:', err);
      throw err;
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
