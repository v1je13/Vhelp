// src/components/Feed.jsx
import { useState, useEffect } from 'react';
import { Card, Avatar, Text, Button, Spinner, Textarea, Input } from '@vkontakte/vkui';
import { api } from '../api/client';
import { vk } from '../lib/vk';

export function Feed({ user }) {
  const [posts, setPosts] = useState([]);
  const [comments, setComments] = useState({}); // postId -> comments array
  const [commentText, setCommentText] = useState('');
  const [newPost, setNewPost] = useState('');
  const [newImage, setNewImage] = useState(null);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(1);
  
  const loadPosts = async () => {
    try {
      const data = await api.getPosts(page);
      setPosts(prev => page === 1 ? data.posts : [...prev, ...data.posts]);
    } catch (err) {
      console.error('Failed to load posts:', err);
    }
  };
  
  useEffect(() => {
    loadPosts();
  }, [page]);
  
  useEffect(() => {
    const loadComments = async (postId) => {
      try {
        const { comments } = await api.getComments(postId);
        setComments(prev => ({ ...prev, [postId]: comments }));
      } catch (err) {
        console.error('Failed to load comments:', err);
      }
    };
    
    // Загружаем для всех видимых постов
    posts.forEach(post => {
      if (post.id && !comments[post.id]) {
        loadComments(post.id);
      }
    });
  }, [posts]);
  
  const handleCreatePost = async () => {
    if (!newPost.trim() || loading) return;
    setLoading(true);
    
    try {
      const { post } = await api.createPost({ text: newPost, images: newImage ? [newImage] : [] });
      setPosts(prev => [post, ...prev]);
      setNewPost('');
      setNewImage(null);
    } catch (err) {
      console.error('Create post error:', err);
      alert('Не удалось создать пост');
    } finally {
      setLoading(false);
    }
  };
  
  const handleLike = async (postId) => {
    // 🔥 Проверка перед запросом
    if (!postId) {
      console.error('❌ Like error: postId is missing');
      await vk.showNotification('Ошибка', 'Не удалось лайкнуть', 'error');
      return;
    }
    
    console.log('❤️ Like post:', postId);  // ← добавь лог
    
    try {
      const { liked, count } = await api.toggleLike(postId);  // ← убедись, что postId передаётся
      setPosts(prev => prev.map(p => 
        p.id === postId ? { ...p, likes: liked ? [...(p.likes||[]), user.id] : p.likes.filter(id => id !== user.id), likesCount: count } : p
      ));
    } catch (err) {
      console.error('❌ Like failed:', err);
    }
  };

  const loadComments = async (postId) => {
    try {
      const { comments: postComments } = await api.getComments(postId);
      setComments(prev => ({ ...prev, [postId]: postComments }));
    } catch (err) {
      console.error('Load comments error:', err);
    }
  };

  const handleAddComment = async (postId, text) => {
    if (!text.trim()) return;
    try {
      const { comment } = await api.addComment(postId, text);
      setComments(prev => ({ ...prev, [postId]: [...(prev[postId] || []), comment] }));
      await vk.showNotification('✅ Готово', 'Комментарий добавлен', 'success');
    } catch (err) {
      console.error('Add comment error:', err);
      await vk.showNotification('❌ Ошибка', 'Не удалось добавить комментарий', 'error');
    }
  };
  
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
        <div style={{ marginBottom: 12, display: 'flex', alignItems: 'center' }}>
          <input 
            type="file" 
            accept="image/*" 
            onChange={async (e) => {
              const file = e.target.files?.[0];
              if (!file) return;
              
              try {
                setLoading(true);
                const photoUrl = await vk.uploadPhoto(file);
                setNewImage(photoUrl);
                await vk.showNotification('Успех', 'Фото загружено');
              } catch (err) {
                await vk.showNotification('Ошибка', err.message);
              } finally {
                setLoading(false);
              }
            }}
            style={{ display: 'none' }}
            id="photo-input"
          />
          <label htmlFor="photo-input" style={{ cursor: 'pointer', marginRight: 10, fontSize: 24 }}>
            📷
          </label>
          {newImage && <Text caption style={{ marginLeft: 10 }}>Фото выбрано ✓</Text>}
        </div>
        <Button 
          mode="primary" 
          onClick={handleCreatePost}
          disabled={loading || !newPost.trim()}
          stretched
        >
          {loading ? <Spinner size="small" /> : 'Опубликовать'}
        </Button>
      </Card>
      
      {/* Лента постов */}
      {posts.map(post => (
        <Card key={post.id} style={{ padding: 15, marginBottom: 10 }}>
          <div style={{ display: 'flex', alignItems: 'center', marginBottom: 10 }}>
            <Avatar src={post.userId?.avatar} size={40} />
            <div style={{ marginLeft: 10 }}>
              <Text weight="2">{post.userId?.firstName} {post.userId?.lastName}</Text>
              <Text caption>{new Date(post.createdAt).toLocaleDateString()}</Text>
            </div>
          </div>
          <Text>{post.text}</Text>
          {post.images?.[0] && <img src={post.images[0]} style={{ width: '100%', borderRadius: 8, marginTop: 10 }} />}
          <div style={{ marginTop: 10, display: 'flex', gap: 20 }}>
            <Button 
              mode={post.likes?.includes(user?.id) ? 'primary' : 'secondary'}
              size="s"
              onClick={(e) => {
                e.stopPropagation(); // предотврати всплытие, если нужно
                if (!post?.id) {
                  console.error('❌ Like: post.id is undefined', post);
                  return;
                }
                handleLike(post.id);
              }}
            >
              ❤️ {post.likes?.length || 0}
            </Button>
          </div>
          
          {/* Комментарии */}
          <div style={{ marginTop: 15, borderTop: '1px solid #eee', paddingTop: 10 }}>
            <div style={{ marginBottom: 10 }}>
              {comments[post.id]?.map(comment => (
                <div key={comment.id} style={{ display: 'flex', gap: 10, marginBottom: 8 }}>
                  <Avatar src={comment.avatar} size={32} />
                  <div>
                    <Text weight="2" style={{ fontSize: 14 }}>{comment.first_name} {comment.last_name}</Text>
                    <div style={{ fontSize: 14 }}>{comment.text}</div>
                    <Text caption style={{ color: '#818c99' }}>
                      {new Date(comment.created_at).toLocaleString()}
                    </Text>
                  </div>
                </div>
              ))}
            </div>
            
            <form 
              onSubmit={async (e) => {
                e.preventDefault();
                await handleAddComment(post.id, commentText);
                setCommentText('');
              }}
              style={{ display: 'flex', gap: 8 }}
            >
              <Input
                value={commentText}
                onChange={e => setCommentText(e.target.value)}
                placeholder="Написать комментарий..."
                style={{ flex: 1 }}
              />
              <Button 
                type="submit" 
                mode="primary" 
                size="s"
                disabled={!commentText.trim()}
              >
                ➤
              </Button>
            </form>
          </div>
        </Card>
      ))}
      
      {loading && <Spinner style={{ margin: '20px auto' }} />}
      
      {/* Пагинация */}
      <Button 
        mode="secondary" 
        onClick={() => setPage(p => p + 1)}
        disabled={loading}
        stretched
        style={{ marginTop: 20 }}
      >
        Загрузить ещё
      </Button>
    </div>
  );
}
