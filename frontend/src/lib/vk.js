// src/lib/vk.js
import bridge from '@vkontakte/vk-bridge';

export const vk = {
  init(onAuthData) {
    console.log('🌉 Инициализация VK Bridge...');
    
    // 1. Отправляем инициализацию
    bridge.send('VKWebAppInit')
      .then((data) => {
        console.log('✅ VKWebAppInit успешен:', data);
      })
      .catch((err) => {
        console.error('❌ VKWebAppInit ошибка:', err);
      });
    
    // 2. Подписываемся на ВСЕ события для отладки
    const unsubscribe = bridge.subscribe((event) => {
      console.log('📡 VK Bridge событие:', event);
      
      const { type, data } = event.detail || event;
      
      // Проверяем разные типы событий с данными пользователя
      if (type === 'VKWebAppUpdateConfig' || 
          type === 'VKWebAppGetUserInfoResult' ||
          type === 'VKWebAppInitDone') {
        
        console.log('👤 Данные пользователя:', data);
        
        if (data?.viewer_id || data?.uuid || data?.id) {
          console.log('✅ Найдены данные для авторизации');
          
          // Создаём базовый объект
          const authData = {
            vk_user_id: String(data.viewer_id || data.uuid || data.id),
            first_name: data.first_name,
            last_name: data.last_name,
            photo: data.photo_200 || data.photo_100,
          };

          // Добавляем sign ТОЛЬКО если он есть
          if (data.sign) {
            authData.sign = data.sign;
          }

          onAuthData?.(authData);
        }
      }
      
      // Логируем ошибки
      if (type.includes('Error') || type.includes('Failed')) {
        console.error('❌ VK Bridge ошибка:', type, data);
      }
    });
    
    // 3. Запрашиваем инфо о пользователе (альтернативный способ)
    setTimeout(() => {
      console.log('🔄 Запрос VKWebAppGetUserInfo...');
      bridge.send('VKWebAppGetUserInfo')
        .then((data) => {
          console.log('✅ VKWebAppGetUserInfo ответ:', data);
          if (data?.id) {
            onAuthData?.({
              vk_user_id: String(data.id),
              first_name: data.first_name,
              last_name: data.last_name,
              photo: data.photo_200,
            });
          }
        })
        .catch((err) => {
          console.warn('⚠️ VKWebAppGetUserInfo ошибка (это нормально):', err);
        });
    }, 1000);
    
    return unsubscribe;
  },
  
  // 🔔 Показать уведомление
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
