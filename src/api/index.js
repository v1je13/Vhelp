// If Vite environment variable VITE_API_URL is not provided, default to relative API path
// This ensures frontend works when deployed on Vercel (same-origin /api routes)
const API_BASE_URL = import.meta.env.VITE_API_URL || '/api';

class ApiClient {
  constructor() {
    this.token = localStorage.getItem('token');
    this.baseURL = API_BASE_URL;
  }

  setToken(token) {
    this.token = token;
    localStorage.setItem('token', token);
  }

  clearToken() {
    this.token = null;
    localStorage.removeItem('token');
  }

  async request(endpoint, options = {}) {
    const url = `${this.baseURL}${endpoint}`;
    const headers = {
      'Content-Type': 'application/json',
      ...(this.token && { Authorization: `Bearer ${this.token}` }),
      ...options.headers,
    };

    try {
      const response = await fetch(url, {
        ...options,
        headers,
      });

      if (!response.ok) {
        let message = `Request failed with status ${response.status}`;
        try {
          const error = await response.json();
          message = error.message || message;
        } catch (e) {
          // If response is not JSON (e.g., HTML 404), capture raw text for debugging
          try {
            const text = await response.text();
            if (text?.trim()) message = text.trim();
          } catch (_) {
            // ignore
          }
        }
        throw new Error(message);
      }

      return await response.json();
    } catch (error) {
      console.error('API Error:', error);
      throw error;
    }
  }

  // Auth
  async vkAuth(vkData) {
    const data = await this.request('/auth/vk', {
      method: 'POST',
      body: JSON.stringify(vkData),
    });
    this.setToken(data.token);
    return data;
  }

  async getCurrentUser() {
    return await this.request('/auth/me');
  }

  // Posts
  async getPosts(page = 1, limit = 20) {
    return await this.request(`/posts?page=${page}&limit=${limit}`);
  }

  async getPost(id) {
    return await this.request(`/posts/${id}`);
  }

  async createPost(postData) {
    return await this.request('/posts', {
      method: 'POST',
      body: JSON.stringify(postData),
    });
  }

  async updatePost(id, postData) {
    return await this.request(`/posts/${id}`, {
      method: 'PUT',
      body: JSON.stringify(postData),
    });
  }

  async deletePost(id) {
    return await this.request(`/posts/${id}`, {
      method: 'DELETE',
    });
  }

  async getUserPosts(userId) {
    return await this.request(`/posts/user/${userId}`);
  }

  // Comments
  async getPostComments(postId) {
    return await this.request(`/comments/post/${postId}`);
  }

  async createComment(commentData) {
    return await this.request('/comments', {
      method: 'POST',
      body: JSON.stringify(commentData),
    });
  }

  async updateComment(id, commentData) {
    return await this.request(`/comments/${id}`, {
      method: 'PUT',
      body: JSON.stringify(commentData),
    });
  }

  async deleteComment(id) {
    return await this.request(`/comments/${id}`, {
      method: 'DELETE',
    });
  }

  // Likes
  async likePost(postId) {
    return await this.request(`/likes/post/${postId}`, {
      method: 'POST',
    });
  }

  async likeComment(commentId) {
    return await this.request(`/likes/comment/${commentId}`, {
      method: 'POST',
    });
  }

  async checkPostLike(postId) {
    return await this.request(`/likes/post/${postId}/check`);
  }

  async checkCommentLike(commentId) {
    return await this.request(`/likes/comment/${commentId}/check`);
  }

  // Stories
  async getStories() {
    return await this.request('/stories');
  }

  async getUserStories(userId) {
    return await this.request(`/stories/user/${userId}`);
  }

  async getStory(id) {
    return await this.request(`/stories/${id}`);
  }

  async createStory(storyData) {
    return await this.request('/stories', {
      method: 'POST',
      body: JSON.stringify(storyData),
    });
  }

  async viewStory(id) {
    return await this.request(`/stories/${id}/view`, {
      method: 'POST',
    });
  }

  async deleteStory(id) {
    return await this.request(`/stories/${id}`, {
      method: 'DELETE',
    });
  }

  // Users
  async getUser(id) {
    return await this.request(`/users/${id}`);
  }

  async updateUser(id, userData) {
    return await this.request(`/users/${id}`, {
      method: 'PUT',
      body: JSON.stringify(userData),
    });
  }

  async searchUsers(query) {
    return await this.request(`/users/search/${query}`);
  }
}

export const api = new ApiClient();
export default api;
