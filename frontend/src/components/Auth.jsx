// src/components/Auth.jsx
import { useState, useEffect } from 'react';
import { Button, Spinner } from '@vkontakte/vkui';
import { vk } from '../lib/vk';
import { api } from '../api/client';

export function Auth({ onAuthSuccess }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  
  useEffect(() => {
    vk.init();
  }, []);
  
  const handleVkLogin = async () => {
    if (loading) return;
    setLoading(true);
    setError(null);
    
    // Watchdog для предотвращения вечной загрузки в UI
    const watchdog = setTimeout(() => {
      if (loading) {
        console.warn('Auth: Watchdog triggered - login is taking too long');
        setError('Авторизация занимает слишком много времени. Попробуйте еще раз или обновите страницу.');
      }
    }, 20000);
    
    try {
      console.log('Auth: Manual login started');
      
      // 1. Пытаемся получить данные
      const initData = await vk.init();
      console.log('Auth: vk.init finished', !!initData.userData);
      
      let userData = initData.userData;
      let authInfo = initData.authInfo;

      if (!userData || !authInfo) {
        console.log('Auth: Data missing, fetching manually...');
        const results = await Promise.all([
          vk.getUserInfo().catch(e => { console.error('getUserInfo failed', e); return null; }),
          vk.getAuthInfo()
        ]);
        userData = results[0];
        authInfo = results[1];
      }
      
      if (!authInfo || !authInfo.sign) {
        throw new Error('Не удалось получить параметры запуска VK. Откройте приложение внутри ВКонтакте.');
      }

      // Если userData все еще нет (например, getUserInfo не сработал), 
      // пробуем авторизоваться хотя бы по ID из authInfo
      const vkId = userData?.vk_user_id || userData?.id || authInfo.vk_user_id;
      
      if (!vkId) {
        throw new Error('Не удалось определить ваш VK ID.');
      }
      
      // 2. Отправляем на бэкенд
      console.log('Auth: Calling api.vkAuth...');
      const response = await api.vkAuth({
        vk_user_id: String(vkId),
        sign: authInfo.sign,
        first_name: userData?.first_name || 'User',
        last_name: userData?.last_name || '',
        photo: userData?.photo || userData?.photo_200 || '',
      });
      
      console.log('Auth: Backend login success');
      clearTimeout(watchdog);
      
      localStorage.setItem('vhelp_token', response.token);
      localStorage.setItem('vhelp_user', JSON.stringify(response.user));
      
      onAuthSuccess?.(response);
    } catch (err) {
      console.error('Auth error:', err);
      setError(err.message || 'Авторизация не удалась. Проверьте интернет-соединение.');
      clearTimeout(watchdog);
    } finally {
      setLoading(false);
    }
  };
  
  return (
    <div style={{ padding: 20, textAlign: 'center' }}>
      {error && <div style={{ color: 'red', marginBottom: 10 }}>{error}</div>}
      <Button 
        size="l" 
        mode="primary" 
        onClick={handleVkLogin}
        disabled={loading}
      >
        {loading ? <Spinner size="regular" /> : 'Войти через VK'}
      </Button>
    </div>
  );
}
