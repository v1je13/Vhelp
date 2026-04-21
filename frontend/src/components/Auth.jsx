// src/components/Auth.jsx
import { useState, useEffect } from 'react';
import { Button, Spinner } from '@vkontakte/vkui';
import { vk } from '../lib/vk';
import { api } from '../api/client';

export function Auth({ onAuthSuccess }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [debugInfo, setDebugInfo] = useState(null);
  
  useEffect(() => {
    vk.init();
  }, []);
  
  const handleVkLogin = async () => {
    if (loading) return;
    setLoading(true);
    setError(null);
    setDebugInfo(null);
    
    // Собираем отладочную инфу на случай ошибки
    const currentDebug = {
      url: window.location.href,
      referrer: document.referrer || 'none',
      userAgent: navigator.userAgent,
      hasVkParams: window.location.href.includes('vk_'),
      bridgeInjected: !!window.AndroidBridge || !!window.webkit?.messageHandlers?.VKWebAppInit || !!window.parent
    };
    
    const watchdog = setTimeout(() => {
      if (loading) {
        setError('Превышено время ожидания. Проверьте, что приложение открыто внутри VK.');
        setDebugInfo(currentDebug);
      }
    }, 15000);
    
    try {
      const initData = await vk.init();
      
      let userData = initData.userData;
      let authInfo = initData.authInfo;

      if (!authInfo || !authInfo.sign) {
        setDebugInfo(currentDebug);
        const missing = !authInfo ? 'authInfo is null' : (!authInfo.sign ? 'sign is missing' : 'unknown');
        throw new Error(`Параметры запуска VK не найдены (${missing}). Откройте приложение через поиск VK или по прямой ссылке на сервис.`);
      }
      
      const vkId = userData?.vk_user_id || userData?.id || authInfo.vk_user_id;
      
      const response = await api.vkAuth({
        vk_user_id: String(vkId),
        sign: authInfo.sign,
        first_name: userData?.first_name || 'User',
        last_name: userData?.last_name || '',
        photo: userData?.photo || userData?.photo_200 || '',
      });
      
      clearTimeout(watchdog);
      localStorage.setItem('vhelp_token', response.token);
      localStorage.setItem('vhelp_user', JSON.stringify(response.user));
      onAuthSuccess?.(response);
    } catch (err) {
      console.error('Auth error:', err);
      setError(err.message);
      setDebugInfo(currentDebug);
      clearTimeout(watchdog);
    } finally {
      setLoading(false);
    }
  };
  
  return (
    <div style={{ padding: 20, textAlign: 'center', maxWidth: 500, margin: '0 auto' }}>
      <div style={{ fontSize: 48, marginBottom: 20 }}>🌍</div>
      <h2 style={{ marginBottom: 10 }}>Добро пожаловать</h2>
      <p style={{ color: 'var(--vkui--color_text_secondary)', marginBottom: 24 }}>
        Для продолжения необходимо авторизоваться через ВКонтакте
      </p>

      {error && (
        <div style={{ 
          backgroundColor: '#FFF2F2', 
          color: '#E64646', 
          padding: 12, 
          borderRadius: 10, 
          marginBottom: 20,
          fontSize: 14,
          textAlign: 'left',
          border: '1px solid #FFE0E0'
        }}>
          <strong>Ошибка:</strong> {error}
        </div>
      )}

      <Button 
        size="l" 
        mode="primary" 
        stretched
        onClick={handleVkLogin}
        disabled={loading}
        before={!loading && <span>🔑</span>}
      >
        {loading ? <Spinner size="regular" /> : 'Войти через VK'}
      </Button>

      {debugInfo && (
        <div style={{ 
          marginTop: 30, 
          padding: 12, 
          backgroundColor: '#f5f5f5', 
          borderRadius: 8, 
          fontSize: 10, 
          textAlign: 'left',
          color: '#666',
          fontFamily: 'monospace',
          wordBreak: 'break-all'
        }}>
          <div style={{ fontWeight: 'bold', marginBottom: 5, fontSize: 11 }}>DЕBUG INFO:</div>
          <div>URL: {debugInfo.url}</div>
          <div>REF: {debugInfo.referrer}</div>
          <div>VK_PARAMS: {debugInfo.hasVkParams ? 'YES' : 'NO'}</div>
          <div>BRIDGE: {debugInfo.bridgeInjected ? 'FOUND' : 'NOT_FOUND'}</div>
        </div>
      )}
    </div>
  );
}
