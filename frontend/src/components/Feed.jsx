// src/components/Feed.jsx
import { useState, useEffect } from 'react';
import {
  Panel,
  PanelHeader,
  Card,
  Avatar,
  Button,
  Spinner,
  Textarea,
  Placeholder,
  Input
} from '@vkontakte/vkui';
import { Icon24Add } from '@vkontakte/icons';
import { api } from '../api/client';
import { vk } from '../lib/vk';

export function Feed({ user, onOpenPost, onCreateTrip }) {
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [newPost, setNewPost] = useState('');
  const [selectedPhoto, setSelectedPhoto] = useState(null);
  const [postTags, setPostTags] = useState('');
  const [creating, setCreating] = useState(false);

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
  }, []);

  const handlePhotoUpload = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    const reader = new FileReader();
    reader.onloadend = () => setSelectedPhoto(reader.result);
    reader.readAsDataURL(file);
  };

  const handleCreatePost = async () => {
    if (!newPost.trim() && !selectedPhoto) return;
    
    try {
      setCreating(true);
      await api.createPost({
        text: newPost.trim(),
        images: selectedPhoto ? [selectedPhoto] : [],
        tags: postTags.split(',').map(t => t.trim()).filter(t => t),
      });
      
      setNewPost('');
      setSelectedPhoto(null);
      setPostTags('');
      
      // Сначала уведомляем, потом обновляем ленту
      await vk.showNotification('✅', 'Пост опубликован', 'success');
      
      const data = await api.getPosts(1);
      setPosts(data.posts || []);
    } catch (err) {
      console.error('Create post error:', err);
      const errorMsg = err.message || 'Не удалось создать пост';
      await vk.showNotification('❌', errorMsg, 'error');
    } finally {
      setCreating(false);
    }
  };

  const handleLike = async (e, postId) => {
    e?.stopPropagation();
    
    if (!postId) return;
    
    try {
      const result = await api.likePost(postId);
      setPosts(prev => prev.map(post => 
        post.id === postId ? { ...post, likes_count: result.count } : post
      ));
    } catch (err) {
      console.error('Like error:', err);
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
    <Panel id="feed" style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      <PanelHeader right={<Button mode="primary" size="s" before={<Icon24Add />} onClick={onCreateTrip}>Путешествие</Button>}>Лента</PanelHeader>
      <div style={{ 
        flex: 1, 
        overflowY: 'auto',
        overflowX: 'hidden',
        paddingBottom: '80px'
      }}>
        <div style={{ padding: 10 }}>
      <Card style={{ padding: 15, marginBottom: 20 }}>
        <div style={{ marginBottom: 8, fontWeight: 700 }}>Что у вас новое?</div>

        <Textarea 
          value={newPost}
          onChange={e => setNewPost(e.target.value)}
          placeholder="Напишите что-нибудь..."
          rows={3}
          style={{ marginBottom: 12 }}
        />
        
        {selectedPhoto && (
          <div style={{ position: 'relative', marginBottom: 12 }}>
            <img 
              src={selectedPhoto} 
              alt="Preview" 
              style={{ width: '100%', maxHeight: 300, objectFit: 'cover', borderRadius: 8 }}
            />
            <Button
              mode="secondary"
              size="s"
              onClick={() => setSelectedPhoto(null)}
              style={{ position: 'absolute', top: 8, right: 8, background: 'rgba(0,0,0,0.7)' }}
            >
              ✕
            </Button>
          </div>
        )}
        
        <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
          <input type="file" accept="image/*" onChange={handlePhotoUpload} style={{ display: 'none' }} id="photo-upload" />
          <Button mode="secondary" size="s" onClick={() => document.getElementById('photo-upload')?.click()} before={<span>📷</span>}>
            Добавить фото
          </Button>
        </div>
        
        <div style={{ marginBottom: 12 }}>
          <Input 
            value={postTags} 
            onChange={e => setPostTags(e.target.value)} 
            placeholder="Тэги через запятую (например: Сочи, Лето)" 
          />
        </div>
        
        <Button 
          mode="primary" 
          onClick={handleCreatePost}
          disabled={creating || (!newPost.trim() && !selectedPhoto)}
          stretched
        >
          {creating ? <Spinner size="small" /> : 'Опубликовать'}
        </Button>
      </Card>

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
  );
}
