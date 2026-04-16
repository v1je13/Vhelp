// src/components/SearchBar.jsx
import { useState } from 'react';
import { Search, Chip, Spinner, Avatar } from '@vkontakte/vkui';
import { api } from '../api/client';

export function SearchBar({ onUserSelect, onPostSelect, type = 'all' }) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searchType, setSearchType] = useState(type); // 'users', 'posts', 'all'
  
  const handleSearch = async (value) => {
    setQuery(value);
    if (value.length < 2) {
      setResults([]);
      return;
    }
    
    setLoading(true);
    try {
      if (searchType === 'users' || searchType === 'all') {
        const { users } = await api.searchUsers(value);
        if (users?.length) {
          setResults(users.map(u => ({ type: 'user', ...u })));
          return;
        }
      }
      if (searchType === 'posts' || searchType === 'all') {
        const { posts } = await api.searchPosts(value);
        if (posts?.length) {
          setResults(posts.map(p => ({ type: 'post', ...p })));
          return;
        }
      }
      setResults([]);
    } catch (err) {
      console.error('Search error:', err);
    } finally {
      setLoading(false);
    }
  };
  
  return (
    <div style={{ padding: 10, background: '#f5f5f5', borderRadius: 8 }}>
      {/* Переключатель типа поиска */}
      <div style={{ display: 'flex', gap: 5, marginBottom: 10, flexWrap: 'wrap' }}>
        {['all', 'users', 'posts'].map(t => (
          <Chip
            key={t}
            selected={searchType === t}
            onClick={() => { setSearchType(t); handleSearch(query); }}
            size="s"
          >
            {t === 'all' ? 'Всё' : t === 'users' ? 'Пользователи' : 'Посты'}
          </Chip>
        ))}
      </div>
      
      {/* Поле поиска */}
      <Search
        value={query}
        onChange={e => handleSearch(e.target.value)}
        placeholder="Поиск..."
        style={{ marginBottom: 10 }}
      />
      
      {/* Индикатор загрузки */}
      {loading && <Spinner size="small" style={{ margin: '10px auto' }} />}
      
      {/* Результаты */}
      <div style={{ maxHeight: 300, overflowY: 'auto' }}>
        {results.map(item => (
          <div
            key={`${item.type}-${item.id}`}
            onClick={() => {
              if (item.type === 'user') onUserSelect?.(item);
              if (item.type === 'post') onPostSelect?.(item);
              setQuery('');
              setResults([]);
            }}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 10,
              padding: 8,
              borderRadius: 6,
              cursor: 'pointer',
              background: '#fff',
              marginBottom: 5
            }}
          >
            {item.type === 'user' && (
              <>
                <Avatar src={item.avatar} size={40} />
                <div>
                  <strong>{item.first_name} {item.last_name}</strong>
                  {item.bio && <div style={{ fontSize: 12, color: '#818c99' }}>{item.bio}</div>}
                </div>
              </>
            )}
            {item.type === 'post' && (
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 13, color: '#818c99', marginBottom: 4 }}>
                  {item.first_name} {item.last_name} • {new Date(item.created_at).toLocaleDateString()}
                </div>
                <div>{item.text?.substring(0, 100)}{item.text?.length > 100 ? '...' : ''}</div>
              </div>
            )}
          </div>
        ))}
        {query.length >= 2 && !loading && results.length === 0 && (
          <div style={{ textAlign: 'center', color: '#818c99', padding: 10 }}>
            Ничего не найдено
          </div>
        )}
      </div>
    </div>
  );
}
