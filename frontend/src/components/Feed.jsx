// src/components/Feed.jsx
import { useState, useEffect } from 'react';
import { 
  Card, 
  Avatar, 
  Text, 
  Button, 
  Spinner, 
  Textarea, 
  Input,
  Placeholder
} from '@vkontakte/vkui';
import { api } from '../api/client';
import { vk } from '../lib/vk';

export function Feed({ user, onOpenPost }) {
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [newPost, setNewPost] = useState('');
  const [selectedPhoto, setSelectedPhoto] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [commentTexts, setCommentTexts] = useState({});
  const [comments, setComments] = useState({});
  const [creating, setCreating] = useState(false);

  // 🔥 Функция форматирования даты
  const formatDate = (dateValue) => {
    if (!dateValue) return 'Только что';
    
    // Если это число (timestamp в миллисекундах)
    const timestamp = typeof dateValue === 'number' 
      ? dateValue 
      : new Date(dateValue).getTime();
    
    // Проверка на валидность
    if (isNaN(timestamp) || timestamp < 0) return 'Только что';
    
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / 60000);
    
    // Если меньше минуты
    if (diffMins < 1) return 'Только что';
    if (diffMins < 60) return `${diffMins} мин. назад`;
    
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `${diffHours} ч. назад`;
    
    const diffDays = Math.floor(diffHours / 24);
    if (diffDays < 7) return `${diffDays} дн. назад`;
    
    // Иначе полная дата
    return date.toLocaleString('ru-RU', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  // Загрузка постов
  useEffect(() => {
    const loadPosts = async () => {
      console.log('📡 Загрузка постов...');
      try {
        setLoading(true);
        const data = await api.getPosts(1);
        console.log('✅ Посты получены:', data);
        
        if (data.posts && Array.isArray(data.posts)) {
          console.log('📋 Первый пост:', data.posts[0]);
          setPosts(data.posts);
        } else {
          console.warn('⚠️ posts не массив:', data);
          setPosts([]);
        }
      } catch (err) {
        console.error('❌ Ошибка загрузки постов:', err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };
    
    loadPosts();
  }, []);

  // Загрузка комментариев для каждого поста
  useEffect(() => {
    const loadComments = async (postId) => {
      try {
        const { comments } = await api.getComments(postId);
        setComments(prev => ({ ...prev, [postId]: comments || [] }));
      } catch (err) {
        console.error('Failed to load comments:', err);
      }
    };
    
    posts.forEach(post => {
      if (post.id && !comments[post.id]) {
        loadComments(post.id);
      }
    });
  }, [posts]);

  // 🔥 Функция загрузки фото (через VK Upload API или просто URL):
  const handlePhotoUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    // 🔥 Простой вариант: используем FileReader для локального превью
    // (в продакшене нужно загружать на сервер или использовать VK Upload API)
    const reader = new FileReader();
    reader.onloadend = () => {
      setSelectedPhoto(reader.result);  // base64 data URL
    };
    reader.readAsDataURL(file);
    
    // В реальном приложении здесь нужно:
    // 1. Загрузить фото на сервер (VK Upload API или Cloudflare R2)
    // 2. Получить URL
    // 3. Сохранить URL в selectedPhoto
  };

  // Создание поста
  const handleCreatePost = async () => {
    if (!newPost.trim()) return;
    
    try {
      setCreating(true);
      await api.createPost({ text: newPost });
      setNewPost('');
      
      // Перезагружаем посты
      const data = await api.getPosts(1);
      setPosts(data.posts || []);
      
      await vk.showNotification('✅', 'Пост опубликован', 'success');
    } catch (err) {
      console.error('Create post error:', err);
      await vk.showNotification('❌', 'Не удалось создать пост', 'error');
    } finally {
      setCreating(false);
    }
  };

  // Лайк поста
  const handleLike = async (postId) => {
    console.log('❤️ Like post:', postId);
    
    if (!postId) {
      console.error('❌ Like error: postId is undefined');
      return;
    }
    
    try {
      const result = await api.likePost(postId);
      
      // Обновляем счётчик лайков локально
      setPosts(prev => prev.map(post => 
        post.id === postId 
          ? { ...post, likes_count: result.count }
          : post
      ));
    } catch (err) {
      console.error('Like error:', err);
    }
  };

  // Добавление комментария
  const handleAddComment = async (postId, text) => {
    if (!text.trim()) return;
    
    try {
      const { comment } = await api.addComment(postId, text);
      
      // Обновляем комментарии локально
      setComments(prev => ({
        ...prev,
        [postId]: [...(prev[postId] || []), comment]
      }));
      
      // Очищаем поле ввода для этого поста
      setCommentTexts(prev => ({ ...prev, [postId]: '' }));
      
      await vk.showNotification('✅', 'Комментарий добавлен', 'success');
    } catch (err) {
      console.error('Comment error:', err);
      await vk.showNotification('❌', 'Не удалось добавить комментарий', 'error');
    }
  };

  // Получение текста комментария для поста
  const getCommentText = (postId) => commentTexts[postId] || '';
  
  // Установка текста комментария для поста
  const setCommentTextForPost = (postId, text) => {
    setCommentTexts(prev => ({ ...prev, [postId]: text }));
  };

  if (loading) {
    return (
      <div style={{ padding: 20, textAlign: 'center' }}>
        <Spinner size="large" />
        <div style={{ marginTop: 10 }}>Загрузка...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ padding: 20, color: 'red' }}>
        Ошибка: {error}
        <Button 
          mode="secondary" 
          onClick={() => window.location.reload()}
          style={{ marginTop: 10 }}
        >
          Обновить
        </Button>
      </div>
    );
  }

  if (posts.length === 0) {
    return (
      <div style={{ padding: 20 }}>
        <Placeholder 
          header="Постов пока нет"
          action={
            <Button mode="primary" onClick={() => window.location.reload()}>
              Обновить
            </Button>
          }
        >
          Будьте первым, кто создаст пост!
        </Placeholder>
      </div>
    );
  }

  return (
    <div style={{ padding: 10 }}>
      {/* Форма создания поста */}
      <Card style={{ padding: 15, marginBottom: 20 }}>
        <Text weight="2" style={{ marginBottom: 8 }}>Что у вас новое?</Text>
        
        <Textarea 
          value={newPost}
          onChange={e => setNewPost(e.target.value)}
          placeholder="Напишите что-нибудь..."
          rows={3}
          style={{ marginBottom: 12 }}
        />
        
        {/* 🔥 Превью выбранного фото */}
        {selectedPhoto && (
          <div style={{ position: 'relative', marginBottom: 12 }}>
            <img 
              src={selectedPhoto} 
              alt="Preview" 
              style={{
                width: '100%',
                maxHeight: 300,
                objectFit: 'cover',
                borderRadius: 8
              }}
            />
            <Button
              mode="secondary"
              size="s"
              onClick={() => setSelectedPhoto(null)}
              style={{
                position: 'absolute',
                top: 8,
                right: 8,
                background: 'rgba(0,0,0,0.7)'
              }}
            >
              ✕
            </Button>
          </div>
        )}
        
        {/* 🔥 Кнопки действий */}
        <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
          {/* Скрытый input для выбора файла */}
          <input
            type="file"
            accept="image/*"
            onChange={handlePhotoUpload}
            style={{ display: 'none' }}
            id="photo-upload"
          />
          
          {/* Кнопка выбора фото */}
          <Button
            mode="secondary"
            size="s"
            onClick={() => document.getElementById('photo-upload')?.click()}
            before={<span>📷</span>}
          >
            Добавить фото
          </Button>
        </div>
        
        {/* Кнопка публикации */}
        <Button 
          mode="primary" 
          onClick={async () => {
            if (!newPost.trim()) return;
            
            try {
              setCreating(true);
              
              // 🔥 Создаём пост с фото (если есть)
              await api.createPost({ 
                text: newPost,
                images: selectedPhoto ? [selectedPhoto] : []  // ← отправляем фото
              });
              
              setNewPost('');
              setSelectedPhoto(null);
              
              // Перезагружаем посты
              const data = await api.getPosts(1);
              setPosts(data.posts || []);
              
              await vk.showNotification('✅', 'Пост опубликован', 'success');
            } catch (err) {
              console.error('Create post error:', err);
              await vk.showNotification('❌', 'Не удалось создать пост', 'error');
            } finally {
              setCreating(false);
            }
          }}
          disabled={creating || (!newPost.trim() && !selectedPhoto)}
          stretched
        >
          {creating ? <Spinner size="small" /> : 'Опубликовать'}
        </Button>
      </Card>

      {/* Список постов */}
      {posts.map(post => {
        // 🔥 Отладка поста
        console.log('📋 Rendering post:', {
          id: post.id,
          firstName: post.first_name,
          lastName: post.last_name,
          avatar: post.avatar,
          images: post.images,
          createdAt: post.created_at,
          likesCount: post.likes_count,
          fullPost: post  // ← полный объект для проверки
        });
        
        return (
          <Card 
            key={post.id} 
            style={{ padding: 15, marginBottom: 15 }}
            onClick={() => onOpenPost?.(post.id)}
          >
            {/* 🔥 Шапка поста: автор и дата */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
              {/* Аватар автора */}
              <Avatar 
                src={post.avatar || 'https://vk.com/images/camera_200.png'} 
                size={40}
              />
              
              {/* Имя автора */}
              <div style={{ flex: 1 }}>
                <Text weight="2" style={{ fontSize: 15 }}>
                  {post.first_name || 'Пользователь'} {post.last_name || ''}
                </Text>
                
                {/* Дата */}
                <Text caption style={{ color: '#818c99', fontSize: 12 }}>
                  {formatDate(post.created_at)}
                </Text>
              </div>
            </div>

            {/* Текст поста */}
            <Text style={{ marginBottom: 10, whiteSpace: 'pre-wrap' }}>
              {post.text}
            </Text>

            {/* 🔥 Отображение фото поста */}
            {post.images && post.images !== '[]' && post.images !== 'null' && (
              <div style={{ marginTop: 10 }}>
                {(() => {
                  try {
                    // 🔥 Пробуем распарсить JSON строку
                    let imageUrls = [];
                    
                    if (typeof post.images === 'string') {
                      // Это JSON строка: "[\"url1\",\"url2\"]"
                      imageUrls = JSON.parse(post.images);
                    } else if (Array.isArray(post.images)) {
                      // Это уже массив
                      imageUrls = post.images;
                    }
                    
                    // 🔥 Фильтруем пустые URL
                    imageUrls = imageUrls.filter(url => url && url.trim());
                    
                    if (imageUrls.length > 0) {
                      return (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                          {imageUrls.map((url, idx) => {
                            // 🔥 Проверяем, base64 это или URL
                            const isBase64 = url.startsWith('data:image');
                            
                            return (
                              <div key={idx} style={{ position: 'relative' }}>
                                <img
                                  src={url}
                                  alt={`Post image ${idx + 1}`}
                                  style={{
                                    width: '100%',
                                    maxHeight: 400,
                                    objectFit: 'cover',
                                    borderRadius: 8,
                                    display: 'block',
                                    background: '#f0f2f5'
                                  }}
                                  onLoad={() => {
                                    console.log('✅ Image loaded:', url.substring(0, 50) + '...');
                                  }}
                                  onError={(e) => {
                                    console.error('❌ Failed to load image:', url);
                                    // Показываем заглушку для base64
                                    if (isBase64) {
                                      e.target.style.display = 'none';
                                    }
                                  }}
                                />
                              </div>
                            );
                          })}
                        </div>
                      );
                    }
                    return null;
                  } catch (err) {
                    console.error('Error parsing images:', err, 'Raw value:', post.images);
                    return null;
                  }
                })()}
              </div>
            )}

            {/* Кнопка лайка */}
            <div style={{ marginTop: 12, display: 'flex', gap: 10 }}>
              <Button
                mode="secondary"
                size="s"
                before={<span>❤️</span>}
                onClick={() => handleLike(post.id)}
              >
                {post.likes_count || 0}
              </Button>
            </div>

            {/* Разделитель */}
            <hr style={{ 
              marginTop: 15, 
              marginBottom: 10, 
              border: 'none', 
              borderTop: '1px solid #e7e8ec' 
            }} />

            {/* Комментарии */}
            <div style={{ marginBottom: 10 }}>
              {/* Список комментариев */}
              {(comments[post.id] || []).map(comment => (
                <div key={comment.id} style={{ 
                  display: 'flex', 
                  gap: 10, 
                  marginBottom: 8,
                  padding: 8,
                  background: '#f5f5f5',
                  borderRadius: 6
                }}>
                  <Avatar src={comment.avatar} size={32} />
                  <div style={{ flex: 1 }}>
                    <strong style={{ fontSize: 13 }}>
                      {comment.first_name} {comment.last_name}
                    </strong>
                    <div style={{ fontSize: 14, marginTop: 2 }}>
                      {comment.text}
                    </div>
                    <small style={{ color: '#818c99', fontSize: 11 }}>
                      {formatDate(comment.created_at)}
                    </small>
                  </div>
                </div>
              ))}
            </div>

            {/* Форма добавления комментария */}
            <form 
              onSubmit={async (e) => {
                e.preventDefault();
                await handleAddComment(post.id, getCommentText(post.id));
              }}
              style={{ display: 'flex', gap: 8 }}
            >
              <Input
                value={getCommentText(post.id)}
                onChange={e => setCommentTextForPost(post.id, e.target.value)}
                placeholder="Написать комментарий..."
                style={{ flex: 1 }}
              />
              <Button 
                type="submit" 
                mode="primary" 
                size="s"
                disabled={!getCommentText(post.id)?.trim()}
              >
                ➤
              </Button>
            </form>
          </Card>
        );
      })}
    </div>
  );
}
