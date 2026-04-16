// src/components/SearchBar.jsx
import { useState } from 'react';
import { Search, Chip, Spinner } from '@vkontakte/vkui';
import { api } from '../api/client';

export function SearchBar({ onUserSelect }) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  
  const handleSearch = async (value) => {
    setQuery(value);
    if (value.length < 2) {
      setResults([]);
      return;
    }
    
    setLoading(true);
    try {
      const { users } = await api.searchUsers(value);
      setResults(users);
    } catch (err) {
      console.error('Search error:', err);
    } finally {
      setLoading(false);
    }
  };
  
  return (
    <div style={{ padding: 10 }}>
      <Search 
        value={query}
        onChange={e => handleSearch(e.target.value)}
        placeholder="Поиск пользователей..."
      />
      
      {loading && <Spinner size="small" style={{ margin: '10px auto' }} />}
      
      {results.map(user => (
        <Chip 
          key={user.id}
          onClick={() => onUserSelect?.(user)}
          style={{ margin: '5px 0' }}
        >
          {user.firstName} {user.lastName}
        </Chip>
      ))}
    </div>
  );
}
