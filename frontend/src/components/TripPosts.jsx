// src/components/TripPosts.jsx
import { useState, useEffect } from 'react';
import { 
  Panel, 
  PanelHeader, 
  Button,
  Spinner,
  Placeholder,
  Avatar,
  Text
} from '@vkontakte/vkui';
import { api } from '../api/client';

export function TripPosts({ tripId, onBack, onOpenPost }) {
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [tripName, setTripName] = useState('');

  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true);
        const data = await api.getTripNotes(tripId);
        setPosts(data.notes || data.posts || []);
        
        // Получаем название путешествия
        const tripsData = await api.getUserTrips();
        const trip = tripsData.trips?.find(t => t.id === tripId);
        if (trip) setTripName(trip.name);
      } catch (err) {
        console.error('Failed to load trip posts:', err);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [tripId]);

  if (loading) {
    return (
      <Panel id="trip-posts">
        <PanelHeader left={<Button mode="secondary" onClick={onBack} size="s">← Назад</Button>}>
          Загрузка...
        </PanelHeader>
        <div style={{ padding: 20, textAlign: 'center' }}>
          <Spinner size="large" />
        </div>
      </Panel>
    );
  }

  return (
    <Panel id="trip-posts">
      <PanelHeader left={<Button mode="secondary" onClick={onBack} size="s">← Назад</Button>}>
        {tripName || 'Путешествие'}
      </PanelHeader>
      
      <div style={{ padding: 10, paddingBottom: 80 }}>
        {posts.length === 0 ? (
          <Placeholder
            header="Пока нет заметок"
            action={<Button mode="primary" onClick={onBack}>Вернуться к путешествиям</Button>}
          >
            Добавьте первую заметку об этом путешествии
          </Placeholder>
        ) : (
          posts.map(post => (
            <div
              key={post.id}
              onClick={() => onOpenPost?.(post.id)}
              style={{
                background: 'var(--vkui--color_background_content)',
                borderRadius: 12,
                padding: 15,
                marginBottom: 12,
                cursor: 'pointer'
              }}
            >
              {/* Шапка поста */}
              <div style={{ display: 'flex', gap: 10, marginBottom: 10 }}>
                <Avatar src={post.avatar} size={40} />
                <div>
                  <Text weight="2">{post.first_name} {post.last_name}</Text>
                  <Text caption style={{ color: 'var(--vkui--color_text_subhead)' }}>
                    {new Date(post.created_at).toLocaleDateString('ru-RU')}
                  </Text>
                </div>
              </div>

              {/* Текст */}
              <Text style={{ whiteSpace: 'pre-wrap', marginBottom: 10 }}>
                {post.text || post.content}
              </Text>

              {/* Фото */}
              {post.images && post.images !== '[]' && (
                <div>
                  {(() => {
                    try {
                      const urls = typeof post.images === 'string' 
                        ? JSON.parse(post.images) 
                        : post.images;
                      if (Array.isArray(urls) && urls.length > 0) {
                        return urls.slice(0, 3).map((url, idx) => (
                          <img
                            key={idx}
                            src={url}
                            alt=""
                            style={{
                              width: '100%',
                              maxHeight: 300,
                              objectFit: 'cover',
                              borderRadius: 8,
                              marginBottom: idx < urls.length - 1 ? 8 : 0
                            }}
                          />
                        ));
                      }
                    } catch { return null; }
                  })()}
                </div>
              )}

              {/* Лайки */}
              <div style={{ marginTop: 10, display: 'flex', alignItems: 'center', gap: 8 }}>
                <span>❤️</span>
                <Text caption>{post.likes_count || 0}</Text>
              </div>
            </div>
          ))
        )}
      </div>
    </Panel>
  );
}
