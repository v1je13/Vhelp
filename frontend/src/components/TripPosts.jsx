// src/components/TripPosts.jsx
import { useState, useEffect } from 'react';
import { Panel, PanelHeader, Spinner, Text, Avatar, Button } from '@vkontakte/vkui';
import { api } from '../api/client';

export function TripPosts({ tag, onBack }) {
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true);
        const data = await api.getPostsByTag(tag);
        setPosts(data.posts || []);
      } catch (err) {
        console.error('Failed to load trip posts:', err);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [tag]);

  if (loading) return <Panel id="trip-posts"><PanelHeader left={<Button mode="secondary" onClick={onBack} size="s">← Назад</Button>}>{tag}</PanelHeader><div style={{padding:20,textAlign:'center'}}><Spinner size="large"/></div></Panel>;

  return (
    <Panel id="trip-posts">
      <PanelHeader left={<Button mode="secondary" onClick={onBack} size="s">← Назад</Button>}>{tag}</PanelHeader>
      <div style={{ padding: 10, paddingBottom: 80 }}>
        {posts.length === 0 ? (
          <div style={{textAlign:'center', padding: 40, color: '#818c99'}}>В этом путешествии пока нет постов</div>
        ) : (
          posts.map(post => (
            <div key={post.id} style={{ background: 'var(--vkui--color_background_content)', borderRadius: 12, padding: 15, marginBottom: 12 }}>
              <div style={{ display: 'flex', gap: 10, marginBottom: 10 }}>
                <Avatar src={post.avatar} size={40} />
                <div>
                  <Text weight="2">{post.first_name} {post.last_name}</Text>
                  <Text caption style={{color:'#818c99'}}>{new Date(post.created_at).toLocaleDateString()}</Text>
                </div>
              </div>
              <Text style={{whiteSpace:'pre-wrap'}}>{post.text}</Text>
              {post.images && post.images !== '[]' && (
                <img src={JSON.parse(post.images)[0]} style={{width:'100%', maxHeight:300, objectFit:'cover', borderRadius:8, marginTop:10}} alt="" />
              )}
            </div>
          ))
        )}
      </div>
    </Panel>
  );
}
