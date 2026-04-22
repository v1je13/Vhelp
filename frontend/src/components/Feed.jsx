// src/components/Feed.jsx
import { useState, useEffect } from 'react';
import {
  Panel,
  PanelHeader,
  Card,
  Avatar,
  Button,
  Spinner,
  Placeholder
} from '@vkontakte/vkui';
import { Icon24Add, Icon24DeleteOutline } from '@vkontakte/icons';
import { api } from '../api/client';
import { vk } from '../lib/vk';

export function Feed({ user, onOpenPost, onCreateTrip, onPostCreated }) {
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const formatDate = (dateValue) => {
    if (!dateValue) return 'Только что';
    const timestamp = typeof dateValue === 'number' ? dateValue : new Date(dateValue).getTime();
    if (isNaN(timestamp) || timestamp < 0) return 'Только что';
    
    const date = new Date(timestamp);
    const diffMins = Math.floor((Date.now() - timestamp) / 60000);
    
    if (diffMins < 1) return 'Только что';
    if (diffMins < 60) return `${diffMins} мин. назад`;
    if (Math.floor(diffMins / 60) < 24) return `${Math.floor(diffMins / 60)} ч. назад`;
    
    return date.toLocaleString('ru-RU', {
      day: '2-digit', month: '2-digit', year: 'numeric',
      hour: '2-digit', minute: '2-digit'
    });
  };

  useEffect(() => {
    const loadPosts = async () => {
      try {
        setLoading(true);
        const data = await api.getPosts(1);
        setPosts(data.posts || []);
      } catch (err) {
        console.error('❌ Ошибка загрузки постов:', err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };
    loadPosts();
  }, [onPostCreated]);

  const handleLike = async (e, postId) => {
    e?.stopPropagation();

    if (!postId) return;

    try {
      const result = await api.likePost(postId);
      setPosts(prev => prev.map(post =>
        post.id === postId ? { ...post, likes_count: result.count || 0 } : post
      ));
    } catch (err) {
      console.error('Like error:', err);
    }
  };

  const handleDeletePost = async (postId, e) => {
    e?.stopPropagation();

    try {
      await api.deletePost(postId);
      setPosts(prev => prev.filter(post => post.id !== postId));
      await vk.showNotification('✅', 'Пост удален', 'success');
    } catch (err) {
      console.error('Delete post error:', err);
      await vk.showNotification('❌', 'Ошибка удаления', 'error');
    }
  };

  if (loading) {
    return (
      <Panel id="feed" style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
        <PanelHeader>Лента</PanelHeader>
        <div style={{ padding: 20, textAlign: 'center' }}>
          <Spinner size="large" />
          <div style={{ marginTop: 10 }}>Загрузка...</div>
        </div>
      </Panel>
    );
  }

  if (error) {
    return (
      <Panel id="feed" style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
        <PanelHeader>Лента</PanelHeader>
        <div style={{ padding: 20, color: 'red' }}>
          Ошибка: {error}
          <Button mode="secondary" onClick={() => window.location.reload()} style={{ marginTop: 10 }}>
            Обновить
          </Button>
        </div>
      </Panel>
    );
  }

  if (posts.length === 0) {
    return (
      <Panel id="feed" style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
        <PanelHeader>Лента</PanelHeader>
        <div style={{ padding: 20 }}>
          <Placeholder 
            header="Постов пока нет"
            action={<Button mode="primary" onClick={() => window.location.reload()}>Обновить</Button>}
          >
            Будьте первым, кто создаст пост!
          </Placeholder>
        </div>
      </Panel>
    );
  }

  return (
    <>
      <Panel id="feed" style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
        <PanelHeader right={<Button mode="primary" size="s" before={<Icon24Add />} onClick={onCreateTrip}>Путешествие</Button>}>Лента</PanelHeader>
        <div style={{
          flex: 1,
          overflowY: 'auto',
          overflowX: 'hidden',
          paddingBottom: '80px'
        }}>
          <div style={{ padding: 10 }}>
      {posts.map(post => {
        const postId = post.id;
        
        return (
          <Card 
            key={postId} 
            style={{ padding: 15, marginBottom: 15, cursor: 'pointer' }}
            onClick={() => onOpenPost?.(postId)}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
              <Avatar src={post.avatar || 'https://vk.com/images/camera_200.png'} size={40} />
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 15, fontWeight: 700 }}>
                  {post.first_name || 'Пользователь'} {post.last_name || ''}
                </div>
                <div style={{ color: '#818c99', fontSize: 12 }}>
                  {formatDate(post.created_at)}
                </div>
              </div>
            </div>

            <div style={{ marginBottom: 10, whiteSpace: 'pre-wrap', fontSize: 14 }}>
              {post.text}
            </div>

            {post.images && post.images !== '[]' && post.images !== 'null' && (
              <div style={{ marginTop: 10 }}>
                {(() => {
                  try {
                    const imageUrls = typeof post.images === 'string' ? JSON.parse(post.images) : post.images;
                    if (Array.isArray(imageUrls) && imageUrls.length > 0) {
                      return imageUrls.slice(0, 1).map((url, idx) => (
                        <img
                          key={idx}
                          src={url}
                          alt=""
                          style={{ width: '100%', maxHeight: 300, objectFit: 'cover', borderRadius: 8, display: 'block' }}
                          onError={(e) => { e.target.style.display = 'none'; }}
                        />
                      ));
                    }
                    return null;
                  } catch { return null; }
                })()}
              </div>
            )}

            <div style={{ marginTop: 12, display: 'flex', gap: 10, alignItems: 'center' }}>
              <Button
                mode="secondary"
                size="s"
                onClick={(e) => handleLike(e, postId)}
                before={<span>❤️</span>}
              >
                {post.likes_count || 0}
              </Button>

              {user && (user.id === post.user_id || user.vkId === post.user_id) && (
                <Button
                  mode="secondary"
                  size="s"
                  before={<Icon24DeleteOutline />}
                  onClick={(e) => handleDeletePost(postId, e)}
                >
                  Удалить
                </Button>
              )}

              <Button
                mode="secondary"
                size="s"
                onClick={(e) => {
                  e.stopPropagation();
                  onOpenPost?.(postId);
                }}
              >
                Подробнее →
              </Button>
            </div>
          </Card>
        );
      })}
      </div>
    </div>
  </Panel>
  </>
  );
}
