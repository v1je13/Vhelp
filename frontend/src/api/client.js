// src/api/client.js
// Принудительно используем HTTPS для API, чтобы Android WebView не блокировал запросы
const API_BASE = (import.meta.env.VITE_API_URL || '').replace('http://', 'https://');

export const api = {
  async request(endpoint, options = {}, retries = 2) {
    const token = localStorage.getItem('vhelp_token');
    
    for (let i = 0; i <= retries; i++) {
      let timeoutId;
      try {
        const controller = new AbortController();
        // Увеличиваем базовый таймаут до 60 секунд для мобильного интернета
        const timeoutMs = 60000 + (i * 10000);
        timeoutId = setTimeout(() => controller.abort(), timeoutMs);
        
        const headers = {
          ...(token && { 'Authorization': `Bearer ${token}` }),
          ...options.headers
        };

        // На мобильных сетях лучше не перегружать заголовки
        // Удаляем Cache-Control, если он может вызвать проблемы с CORS на стороне оператора
        // Если Content-Type не задан явно и это не FormData, ставим json
        if (!headers['Content-Type'] && !(options.body instanceof FormData)) {
          headers['Content-Type'] = 'application/json';
        }
        
        const res = await fetch(`${API_BASE}${endpoint}`, {
          ...options,
          signal: controller.signal,
          headers
        });
        
        clearTimeout(timeoutId);
        
        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          throw new Error(data.error || `Ошибка сервера: ${res.status}`);
        }
        
        return await res.json();
      } catch (err) {
        if (timeoutId) clearTimeout(timeoutId);
        
        const isTimeout = err.name === 'AbortError';
        const errorMessage = isTimeout 
          ? `Превышено время ожидания (${30 + i * 10} сек). Медленное соединение.` 
          : err.message;

        if (i === retries) {
          console.error('🔥 API Final Error:', errorMessage);
          throw new Error(errorMessage);
        }
        
        console.warn(`⚠️ API Retry ${i + 1}/${retries} for ${endpoint}:`, errorMessage);
        await new Promise(resolve => setTimeout(resolve, 2000 * (i + 1)));
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

  // 🖼️ Загрузка фото
  async uploadPhoto(file) {
    const formData = new FormData();
    formData.append('image', file);
    
    // Используем request для единообразия таймаутов и ретраев
    return this.request('/api/upload', {
      method: 'POST',
      body: formData,
      // Для FormData fetch сам установит правильный Content-Type с boundary
      headers: {
        'Content-Type': undefined 
      }
    });
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
