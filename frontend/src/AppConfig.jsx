// src/AppConfig.jsx
import { useEffect, useState } from 'react';
import vkBridge from '@vkontakte/vk-bridge';
import { AdaptivityProvider, ConfigProvider, AppRoot } from '@vkontakte/vkui';
import '@vkontakte/vkui/dist/vkui.css';

export function AppConfig({ children }) {
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    // Таймаут 2 секунды - если VK Bridge не ответит, продолжаем без него
    const timeoutId = setTimeout(() => {
      console.warn('⏱ VKWebAppInit timeout - running without VK Bridge');
      setIsReady(true);
    }, 2000);

    // Пытаемся инициализировать VK Bridge
    vkBridge.send('VKWebAppInit')
      .then(() => {
        console.log('✅ VK Bridge initialized');
        clearTimeout(timeoutId);
        setIsReady(true);
      })
      .catch((err) => {
        console.warn('⚠️ VKWebAppInit failed:', err);
        clearTimeout(timeoutId);
        setIsReady(true);
      });
  }, []);

  if (!isReady) {
    return (
      <div style={{ 
        display: 'flex', 
        justifyContent: 'center', 
        alignItems: 'center', 
        height: '100vh', 
        fontFamily: 'system-ui',
        background: '#f0f2f5'
      }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ 
            width: 40, 
            height: 40, 
            border: '4px solid #ccc',
            borderTopColor: '#0077FF',
            borderRadius: '50%',
            animation: 'spin 1s linear infinite',
            margin: '0 auto 10px'
          }} />
          <div>Загрузка...</div>
        </div>
        <style>{`
          @keyframes spin {
            to { transform: rotate(360deg); }
          }
        `}</style>
      </div>
    );
  }

  return (
    <ConfigProvider>
      <AdaptivityProvider>
        <AppRoot mode="embedded">
          {children}
        </AppRoot>
      </AdaptivityProvider>
    </ConfigProvider>
  );
}
