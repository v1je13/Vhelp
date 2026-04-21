// src/AppConfig.jsx
import { useEffect, useState } from 'react';
import vkBridge from '@vkontakte/vk-bridge';
import { AdaptivityProvider, ConfigProvider, AppRoot } from '@vkontakte/vkui';
import { transformVKBridgeAdaptivity } from './utils/transformVKBridgeAdaptivity';
import { vk } from './lib/vk';
import '@vkontakte/vkui/dist/vkui.css';

export function AppConfig({ children }) {
  const [isReady, setIsReady] = useState(false);
  const [bridgeAdaptivity, setBridgeAdaptivity] = useState({});
  const [appearance, setAppearance] = useState(undefined);

  useEffect(() => {
    // Подписка на события VK Bridge
    const bridgeListener = (e) => {
      const { type, data } = e.detail;
      
      if (type === 'VKWebAppUpdateConfig') {
        setAppearance(data.appearance);
        
        const adaptivity = transformVKBridgeAdaptivity({
          type: 'adaptive',
          viewportWidth: data.viewport_width,
          viewportHeight: data.viewport_height
        });
        setBridgeAdaptivity(adaptivity);
      }
    };
    vkBridge.subscribe(bridgeListener);

    // Инициализация через vk.js
    vk.init().then(() => {
      console.log('AppConfig: vk.init success');
      setIsReady(true);
    }).catch((err) => {
      console.error('AppConfig: vk.init error', err);
      setIsReady(true);
    });

    return () => vkBridge.unsubscribe(bridgeListener);
  }, []);

  if (!isReady) {
    return (
      <div style={{ 
        display: 'flex', 
        justifyContent: 'center', 
        alignItems: 'center', 
        height: '100vh', 
        fontFamily: 'system-ui',
        background: appearance === 'dark' ? '#19191a' : '#f0f2f5',
        color: appearance === 'dark' ? '#fff' : '#000'
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
    <ConfigProvider appearance={appearance}>
      <AdaptivityProvider {...bridgeAdaptivity}>
        <AppRoot mode="embedded">
          {children}
        </AppRoot>
      </AdaptivityProvider>
    </ConfigProvider>
  );
}
