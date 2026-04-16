// src/components/Feed.jsx
import { useState, useEffect } from 'react';
import { Card, Avatar, Text, Button, Spinner, Textarea } from '@vkontakte/vkui';
import { api } from '../api/client';

export function Feed({ user }) {
  const [posts, setPosts] = useState([]);
  const [newPost, setNewPost] = useState('');
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
  
  const handleCreatePost = async () => {
    if (!newPost.trim() || loading) return;
    setLoading(true);
    
    try {
      const { post } = await api.createPost({ text: newPost });
      setPosts(prev => [post, ...prev]);
      setNewPost('');
    } catch (err) {
      console.error('Create post error:', err);
      alert('Не удалось создать пост');
    } finally {
      setLoading(false);
    }
  };
  
  const handleLike = async (postId) => {
    try {
      const { liked, count } = await api.toggleLike(postId);
      setPosts(prev => prev.map(p => 
        p._id === postId ? { ...p, likes: liked ? [...(p.likes||[]), user.id] : p.likes.filter(id => id !== user.id), likesCount: count } : p
      ));
    } catch (err) {
      console.error('Like error:', err);
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
        <Card key={post._id} style={{ padding: 15, marginBottom: 10 }}>
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
              onClick={() => handleLike(post._id)}
            >
              ❤️ {post.likes?.length || 0}
            </Button>
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
