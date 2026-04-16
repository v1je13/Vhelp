// src/api/client.js
const API_BASE = import.meta.env.VITE_API_URL; // "https://.../api"

export const api = {
  async request(endpoint, options = {}) {
    const API_BASE = import.meta.env.VITE_API_URL;
    const token = localStorage.getItem('vhelp_token');
    
    console.log('� API Request:', {
      url: `${API_BASE}${endpoint}`,
      method: options.method || 'GET',
      hasToken: !!token,
      tokenLength: token?.length || 0,
      userAgent: navigator.userAgent,
      connection: navigator.connection?.effectiveType || 'unknown'
    });
    
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 15000); // 15 сек для мобильных
      
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
      
      console.log('📥 API Response:', {
        status: res.status,
        ok: res.ok,
        url: res.url
      });
      
      const data = await res.json();
      
      if (!res.ok) {
        console.error('❌ API Error:', data);
        throw new Error(data.error || 'Request failed');
      }
      
      return data;
    } catch (err) {
      console.error('🔥 API Fetch Error:', {
        message: err.message,
        name: err.name,
        endpoint,
        isAbort: err.name === 'AbortError',
        isNetworkError: err.message.includes('Failed to fetch')
      });
      throw err;
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
