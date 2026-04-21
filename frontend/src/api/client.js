// src/api/client.js
// Принудительно используем HTTPS для API, чтобы Android WebView не блокировал запросы
const API_BASE = (import.meta.env.VITE_API_URL || '').replace('http://', 'https://');

const fetchWithRetry = async (url, options = {}, retries = 3) => {
  for (let i = 0; i < retries; i++) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 15000); // 15 сек таймаут

    try {
      const response = await fetch(url, {
        ...options,
        signal: controller.signal,
        // Важно для Android WebView:
        credentials: 'include',
        headers: {
          ...options.headers,
          'Cache-Control': 'no-cache',
          'Pragma': 'no-cache'
        }
      });
      clearTimeout(timeout);
      return response;
    } catch (err) {
      clearTimeout(timeout);
      if (i === retries - 1) throw err;
      // Экспоненциальная задержка перед повтором
      await new Promise(r => setTimeout(r, 2000 * (i + 1)));
    }
  }
};

export const api = {
  async request(endpoint, options = {}) {
    const token = localStorage.getItem('vhelp_token');
    const headers = {
      ...(token && { 'Authorization': `Bearer ${token}` }),
      ...options.headers
    };

    // Если Content-Type не задан явно и это не FormData, ставим json
    if (!headers['Content-Type'] && !(options.body instanceof FormData)) {
      headers['Content-Type'] = 'application/json';
    }

    try {
      const res = await fetchWithRetry(`${API_BASE}${endpoint}`, {
        ...options,
        headers
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || `Ошибка сервера: ${res.status}`);
      }

      return await res.json();
    } catch (err) {
      const isTimeout = err.name === 'AbortError';
      const errorMessage = isTimeout 
        ? 'Превышено время ожидания (15 сек). Медленное соединение.' 
        : err.message;
      
      console.error(`🔥 API Error for ${endpoint}:`, errorMessage);
      throw new Error(errorMessage);
    }
  },
  
  // 🔐 Авторизация через VK
  async vkAuth(vkData) {
    const res = await this.request('/api/auth/vk', {
      method: 'POST',
      body: JSON.stringify(vkData)
    });
    return res;
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
        text: data.text || data.content,
        images: data.images || [],
        tags: data.tags || [],
        trip_id: data.trip_id || null
      })
    });
  },
  
  async toggleLike(postId) {
    return this.request(`/api/posts/${postId}/like`, { method: 'POST' });
  },

  async likePost(postId) {
    return this.request(`/api/posts/${postId}/like`, { method: 'POST' });
  },

  async getComments(postId) {
    return this.request(`/api/posts/${postId}/comments`);
  },

  async addComment(postId, text) {
    return this.request(`/api/posts/${postId}/comments`, {
      method: 'POST',
      body: JSON.stringify({ text })
    });
  },

  async searchUsers(query) {
    return this.request(`/api/users/search?q=${encodeURIComponent(query)}`);
  },

  async searchPosts(query) {
    return this.request(`/api/posts/search?q=${encodeURIComponent(query)}`);
  },

  async getPostsByTag(tag) {
    return this.request(`/api/tags/${encodeURIComponent(tag)}/posts`);
  },

  async uploadPhoto(file) {
    const formData = new FormData();
    formData.append('image', file);
    
    return this.request('/api/upload', {
      method: 'POST',
      body: formData,
      headers: {
        'Content-Type': undefined 
      }
    });
  },
  
  logout() {
    localStorage.removeItem('vhelp_token');
    localStorage.removeItem('vhelp_user');
  },
  
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
