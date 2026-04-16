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
    setLoading(true);
    setError(null);
    
    try {
      // 1. Получаем данные от VK Bridge
      const authInfo = await vk.getAuthInfo();
      const userInfo = await vk.getUserInfo();
      
      // 2. Отправляем на бэкенд
      const response = await api.vkAuth({
        vk_user_id: authInfo.uuid,
        sign: authInfo.sign,
        first_name: userInfo.first_name,
        last_name: userInfo.last_name,
        photo: userInfo.photo_200,
        // ... остальные поля из VK
      });
      
      // 3. Сохраняем токен и пользователя
      localStorage.setItem('vhelp_token', response.token);
      localStorage.setItem('vhelp_user', JSON.stringify(response.user));
      
      // 4. Уведомляем родительский компонент
      onAuthSuccess?.(response.user);
    } catch (err) {
      console.error('Auth error:', err);
      setError(err.message || 'Авторизация не удалась');
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
