// src/api/client.js
const API_BASE = import.meta.env.VITE_API_URL; // "https://.../api"

export const api = {
  async request(endpoint, options = {}) {
    const API_BASE = import.meta.env.VITE_API_URL;
    
    // 🔥 Читаем токен ПЕРЕД запросом (он может появиться после авторизации)
    const token = localStorage.getItem('vhelp_token');
    
    console.log('🔐 [API] Запрос:', endpoint, { 
      hasToken: !!token, 
      tokenStart: token ? token.substring(0, 20) + '...' : null 
    });
    
    const res = await fetch(`${API_BASE}${endpoint}`, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        // 🔥 Добавляем Authorization ТОЛЬКО если токен есть
        ...(token && { 
          'Authorization': `Bearer ${token}`  // ← префикс "Bearer " обязателен!
        }),
        ...options.headers
      }
    });
    
    const data = await res.json();
    
    if (!res.ok) {
      console.error('❌ [API] Ошибка:', res.status, data);
      throw new Error(data.error || 'Request failed');
    }
    
    return data;
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
      body: JSON.stringify(data)
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
