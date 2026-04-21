import React, { useState } from "react";
import { Panel, Button, Textarea, FormItem } from "@vkontakte/vkui";
import { api } from "../api/client";
import { useAuth } from "../hooks/useAuth";

export default function CreatePost({ nav, onBack }) {
  const [content, setContent] = useState("");
  const [location, setLocation] = useState("");
  const [loading, setLoading] = useState(false);
  const { user } = useAuth();

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!content.trim()) {
      alert("Пожалуйста, введите текст поста");
      return;
    }

    try {
      setLoading(true);
      await api.createPost({
        text: content,
        location: location || undefined,
        images: [] // Можно добавить загрузку изображений позже
      });
      
      setContent("");
      setLocation("");
      onBack();
    } catch (error) {
      console.error('Error creating post:', error);
      alert("Ошибка при создании поста");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Panel nav={nav}>
      <div style={{ padding: '16px', backgroundColor: '#F6F2E9', minHeight: '100vh' }}>
        <h2 style={{ marginBottom: '20px', color: '#000' }}>Создать пост</h2>
        
        <form onSubmit={handleSubmit}>
          <FormItem top="Текст поста">
            <Textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="Что у вас нового?"
              rows={5}
              style={{ backgroundColor: '#fff' }}
            />
          </FormItem>

          <FormItem top="Местоположение (опционально)">
            <input
              type="text"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              placeholder="📍 Где вы?"
              style={{
                width: '100%',
                padding: '12px',
                borderRadius: '8px',
                border: '1px solid #ddd',
                fontSize: '16px'
              }}
            />
          </FormItem>

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
              Опубликовать
            </Button>
          </div>
        </form>
      </div>
    </Panel>
  );
}
