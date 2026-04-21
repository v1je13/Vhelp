const API_URL = 'https://vhelp-backend.traveldiary-api.workers.dev';

const apiFetch = async (endpoint, options = {}) => {
  const url = `${API_URL}/api${endpoint}`;
  
  const token = localStorage.getItem('vhelp_token');
  const headers = {
    'Content-Type': 'application/json',
    ...(token && { 'Authorization': `Bearer ${token}` }),
    ...options.headers
  };
  
  const response = await fetch(url, {
    ...options,
    headers,
    credentials: 'include'
  });
  
  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(error.error || `HTTP ${response.status}`);
  }
  
  return response.json();
};

export const api = {
  vkAuth: (data) => apiFetch('/auth/vk', { method: 'POST', body: JSON.stringify(data) }),
  getMe: () => apiFetch('/auth/me'),
  getUser: (id) => apiFetch(`/users/${id}`),
  getUserPosts: (id) => apiFetch(`/users/${id}/posts`),
  getUserTrips: () => apiFetch('/trips'),
  getPosts: (page = 1) => apiFetch(`/posts?page=${page}`),
  getPost: (id) => apiFetch(`/posts/${id}`),
  createPost: (data) => apiFetch('/posts', { method: 'POST', body: JSON.stringify(data) }),
  likePost: (id) => apiFetch(`/posts/${id}/like`, { method: 'POST' }),
  getComments: (id) => apiFetch(`/posts/${id}/comments`),
  createComment: (id, text) => apiFetch(`/posts/${id}/comments`, { method: 'POST', body: JSON.stringify({ text }) }),
  createTrip: (data) => apiFetch('/trips', { method: 'POST', body: JSON.stringify(data) }),
  deleteTrip: (id) => apiFetch(`/trips/${id}`, { method: 'DELETE' }),
  getTripNotes: (id) => apiFetch(`/trips/${id}/notes`),
  searchUsers: (q) => apiFetch(`/users/search?q=${encodeURIComponent(q)}`),
  searchPosts: (q) => apiFetch(`/posts/search?q=${encodeURIComponent(q)}`),
  getTagPosts: (tag) => apiFetch(`/tags/${encodeURIComponent(tag)}/posts`),
  logout: () => { localStorage.removeItem('vhelp_token'); localStorage.removeItem('vhelp_user'); }
};
