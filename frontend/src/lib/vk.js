// src/lib/vk.js
import bridge from '@vkontakte/vk-bridge';

export const vk = {
  // Инициализация + подписка на события
  init(onAuthData) {
    // 1. Инициализируем бридж
    bridge.send('VKWebAppInit').catch(err => console.warn('VKWebAppInit error:', err));
    
    // 2. Подписываемся на события авторизации
    const unsubscribe = bridge.subscribe(({ detail: { type, data } }) => {
      console.log('VK Bridge event:', type, data);
      
      // Событие с данными пользователя (срабатывает при открытии мини-аппа)
      if (type === 'VKWebAppUpdateConfig' || type === 'VKWebAppGetUserInfoResult') {
        // Проверяем, есть ли данные для авторизации
        if (data?.viewer_id || data?.uuid) {
          onAuthData?.({
            vk_user_id: String(data.viewer_id || data.uuid),
            sign: data.sign,
            first_name: data.first_name,
            last_name: data.last_name,
            photo: data.photo_200 || data.photo_100 || data.photo_max_orig,
            city: data.city,
            country: data.country,
            sex: data.sex,
            // ... любые другие поля, которые вам нужны
          });
        }
      }
      
      // Обработка ошибок
      if (type.includes('Error') || type.includes('Failed')) {
        console.error('VK Bridge error:', type, data);
      }
    });
    
    // 3. Запрашиваем инфо о пользователе (для надёжности)
    bridge.send('VKWebAppGetUserInfo').catch(err => {
      console.warn('VKWebAppGetUserInfo not available:', err);
      // Это не критично — данные могут прийти через VKWebAppUpdateConfig
    });
    
    return unsubscribe; // функция для отписки, если нужно
  },
  
  // Полезные хелперы
  async openLink(url) {
    return bridge.send('VKWebAppOpenLink', { url });
  },
  
  async showNotification(title, message) {
    return bridge.send('VKWebAppShowSnackbar', { message: `${title}: ${message}` });
  }
};
