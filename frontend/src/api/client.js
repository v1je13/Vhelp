// src/api/client.js
const API_BASE = import.meta.env.VITE_API_URL; // "https://.../api"

export const api = {
  async request(endpoint, options = {}) {
    const token = localStorage.getItem('vhelp_token');
    const headers = {
      'Content-Type': 'application/json',
      ...(token && { 'Authorization': `Bearer ${token}` }),
      ...options.headers
    };
    
    const res = await fetch(`${API_BASE}${endpoint}`, {
      ...options,
      headers
    });
    
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || `Request failed: ${res.status}`);
    }
    return res.json();
  },
  
  // 🔐 Авторизация через VK
  async vkAuth(vkData) {
    return this.request('/auth/vk', {
      method: 'POST',
      body: JSON.stringify(vkData)
    });
  },
  
  // 👤 Профиль
  async getMe() {
    return this.request('/auth/me');
  },
  
  // 📰 Посты
  async getPosts(page = 1) {
    return this.request(`/posts?page=${page}`);
  },
  
  async createPost(data) {
    return this.request('/posts', {
      method: 'POST',
      body: JSON.stringify(data)
    });
  },
  
  async toggleLike(postId) {
    return this.request(`/posts/${postId}/like`, { method: 'POST' });
  },
  
  // 🚪 Выход
  logout() {
    localStorage.removeItem('vhelp_token');
    localStorage.removeItem('vhelp_user');
  }
};
