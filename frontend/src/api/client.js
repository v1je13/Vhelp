// src/api/client.js
// Принудительно используем HTTPS для API, чтобы Android WebView не блокировал запросы
const API_BASE = (import.meta.env.VITE_API_URL || '').replace('http://', 'https://');

export const api = {
  async request(endpoint, options = {}, retries = 2) {
    const token = localStorage.getItem('vhelp_token');
    
    for (let i = 0; i <= retries; i++) {
      try {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 10000 + (i * 5000)); // Увеличиваем таймаут при ретрае
        
        const res = await fetch(`${API_BASE}${endpoint}`, {
          ...options,
          signal: controller.signal,
          headers: {
            'Content-Type': 'application/json',
            ...(token && { 'Authorization': `Bearer ${token}` }),
            ...options.headers
          }
        });
        
        clearTimeout(timeout);
        
        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          throw new Error(data.error || `Request failed with status ${res.status}`);
        }
        
        return await res.json();
      } catch (err) {
        if (i === retries) {
          console.error('🔥 API Final Error:', err.message);
          throw err;
        }
        console.warn(`⚠️ API Retry ${i + 1}/${retries} for ${endpoint}:`, err.message);
        // Ждем немного перед следующим ретраем
        await new Promise(resolve => setTimeout(resolve, 1000 * (i + 1)));
      }
    }
  },
  
  // 🔐 Авторизация через VK
  async vkAuth(vkData) {
    const res = await this.request('/api/auth/vk', {
      method: 'POST',
      body: JSON.stringify(vkData)
    });
    return res;  // ← Обязательно return!
  },
  
  // 👤 Профиль
  async getMe() {
    return this.request('/api/auth/me');
  },

  async getUserProfile(userId) {
    return this.request(`/api/users/${userId}`);
  },

  async getUserPosts(userId) {
    return this.request(`/api/users/${userId}/posts`);
  },

  // 🌍 Путешествия
  async getUserTrips() {
    return this.request('/api/trips');
  },

  async createTrip(data) {
    return this.request('/api/trips', {
      method: 'POST',
      body: JSON.stringify(data)
    });
  },

  async deleteTrip(tripId) {
    return this.request(`/api/trips/${tripId}`, { method: 'DELETE' });
  },

  async getTripNotes(tripId) {
    return this.request(`/api/trips/${tripId}/notes`);
  },

  // 📰 Посты
  async getPosts(page = 1) {
    return this.request(`/api/posts?page=${page}`);
  },

  async getPostById(postId) {
    return this.request(`/api/posts/${postId}`);
  },
  
  async createPost(data) {
    return this.request('/api/posts', {
      method: 'POST',
      body: JSON.stringify({
        text: data.text || data.content, // Поддержка обоих вариантов имен полей
        images: data.images || [],
        tags: data.tags || [],
        trip_id: data.trip_id || null
      })
    });
  },
  
  async toggleLike(postId) {
    return this.request(`/api/posts/${postId}/like`, { method: 'POST' });
  },

  // ❤️ Лайк поста
  async likePost(postId) {
    return this.request(`/api/posts/${postId}/like`, { method: 'POST' });
  },

  // 
  async getComments(postId) {
    return this.request(`/api/posts/${postId}/comments`);
  },

  async addComment(postId, text) {
    return this.request(`/api/posts/${postId}/comments`, {
      method: 'POST',
      body: JSON.stringify({ text })
    });
  },

  // 
  async searchUsers(query) {
    return this.request(`/api/users/search?q=${encodeURIComponent(query)}`);
  },

  async searchPosts(query) {
    return this.request(`/api/posts/search?q=${encodeURIComponent(query)}`);
  },

  // 🔍 Посты по тэгу
  async getPostsByTag(tag) {
    const res = await this.request(`/api/tags/${encodeURIComponent(tag)}/posts`);
    return res;
  },

  // 
  async uploadPhoto(file) {
    const formData = new FormData();
    formData.append('image', file);
    
    const token = localStorage.getItem('vhelp_token');
    const res = await fetch(`${API_BASE}/api/upload`, {
      method: 'POST',
      headers: {
        ...(token && { 'Authorization': `Bearer ${token}` })
      },
      body: formData
    });
    
    if (!res.ok) throw new Error('Upload failed');
    return res.json();
  },
  
  // 🚪 Выход
  logout() {
    localStorage.removeItem('vhelp_token');
    localStorage.removeItem('vhelp_user');
  },
  
  // 🔁 Проверка токена (опционально, для надёжности)
  async validateToken() {
    try {
      await this.request('/api/auth/me');
      return true;
    } catch {
      this.logout();
      return false;
    }
  }
};
