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
          onAuthData?.({
            vk_user_id: String(data.viewer_id || data.uuid || data.id),
            sign: data.sign,
            first_name: data.first_name,
            last_name: data.last_name,
            photo: data.photo_200 || data.photo_100 || data.photo_max_orig,
            city: data.city,
            country: data.country,
            sex: data.sex,
          });
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
  
  async showNotification(title, message) {
    try {
      await bridge.send('VKWebAppShowSnackbar', { message: `${title}: ${message}` });
    } catch (err) {
      console.warn('Не удалось показать уведомление:', err);
    }
  }
};
