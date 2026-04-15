import React, { useState } from "react";
import { Panel, Button, FormItem } from "@vkontakte/vkui";
import api from "../api";
import { useAuth } from "../hooks/useAuth";

export default function CreateStory({ nav, onBack }) {
  const [caption, setCaption] = useState("");
  const [loading, setLoading] = useState(false);
  const { user } = useAuth();

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Для простоты пока без загрузки изображений
    // Можно добавить загрузку изображений позже
    
    try {
      setLoading(true);
      await api.createStory({
        caption: caption || undefined,
        images: [] // Можно добавить загрузку изображений позже
      });
      
      setCaption("");
      onBack();
    } catch (error) {
      console.error('Error creating story:', error);
      alert("Ошибка при создании истории");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Panel nav={nav}>
      <div style={{ padding: '16px', backgroundColor: '#F6F2E9', minHeight: '100vh' }}>
        <h2 style={{ marginBottom: '20px', color: '#000' }}>Создать историю</h2>
        
        <form onSubmit={handleSubmit}>
          <FormItem top="Описание (опционально)">
            <textarea
              value={caption}
              onChange={(e) => setCaption(e.target.value)}
              placeholder="Добавьте описание..."
              rows={3}
              style={{
                width: '100%',
                padding: '12px',
                borderRadius: '8px',
                border: '1px solid #ddd',
                fontSize: '16px',
                fontFamily: '-apple-system, BlinkMacSystemFont, sans-serif'
              }}
            />
          </FormItem>

          <div style={{ 
            padding: '40px', 
            backgroundColor: '#fff', 
            borderRadius: '12px',
            marginBottom: '20px',
            textAlign: 'center',
            color: '#999'
          }}>
            Загрузка изображений скоро будет доступна
          </div>

          <div style={{ display: 'flex', gap: '12px', marginTop: '20px' }}>
            <Button 
              size="l" 
              stretched 
              onClick={onBack}
              appearance="neutral"
              style={{ flex: 1 }}
            >
              Отмена
            </Button>
            <Button 
              size="l" 
              stretched 
              type="submit"
              loading={loading}
              style={{ 
                flex: 1,
                backgroundColor: '#c8d28c',
                color: '#000'
              }}
            >
              Создать
            </Button>
          </div>
        </form>
      </div>
    </Panel>
  );
}
