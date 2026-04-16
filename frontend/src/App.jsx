// frontend/src/App.jsx — МИНИМАЛЬНЫЙ ТЕСТ
import { useState, useEffect } from 'react';
import { AppRoot, SplitLayout, SplitCol, View, Panel, PanelHeader, Text } from '@vkontakte/vkui';
import '@vkontakte/vkui/dist/vkui.css';

// Шаг 1: Добавляем только api
import { api } from './api/client';

// Шаг 2: Добавляем только Account
import { Account } from './components/Account';

// 🔥 Feed импорт удалён для упрощения

function App() {
  const [activePanel] = useState('test');
  
  return (
    <AppRoot mode="embedded">
      <SplitLayout>
        <SplitCol>
          <View activePanel={activePanel}>
            <Panel id="test">
              <PanelHeader>Тест</PanelHeader>
              <Text style={{ padding: 20 }}>
                ✅ Если вы видите этот текст — сборка работает!<br/>
                Проблема в импорте одного из компонентов.
              </Text>
            </Panel>
          </View>
        </SplitCol>
      </SplitLayout>
    </AppRoot>
  );
}

export default App;
