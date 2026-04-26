const API_URL = ''; // Use same origin for Cloudflare Functions

const apiFetch = async (endpoint, options = {}, retries = 2) => {
  const url = `${API_URL}/api${endpoint}`;

  const token = localStorage.getItem('vhelp_token');
  const headers = {
    'Content-Type': 'application/json',
    ...(token && { 'Authorization': `Bearer ${token}` }),
    ...options.headers
  };

  // Mobile: increased timeout and retry
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 30000); // 30s timeout

  try {
    const response = await fetch(url, {
      ...options,
      headers,
      signal: controller.signal,
      credentials: 'include'
    });
    clearTimeout(timeoutId);

    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      throw new Error(error.error || `HTTP ${response.status}`);
    }

    return response.json();
  } catch (err) {
    clearTimeout(timeoutId);

    // Retry on network errors
    if (retries > 0 && (err.name === 'AbortError' || err.message.includes('fetch'))) {
      console.log(`Retrying ${endpoint}, attempts left: ${retries}`);
      await new Promise(resolve => setTimeout(resolve, 1000)); // 1s delay
      return apiFetch(endpoint, options, retries - 1);
    }

    throw err;
  }
};

export const api = {
  vkAuth: (data) => apiFetch('/auth/vk', { method: 'POST', body: JSON.stringify(data) }),
  getMe: () => apiFetch('/auth/me'),
  getUser: (id) => apiFetch(`/users/${id}`),
  getUserPosts: (id) => apiFetch(`/users/${id}/posts`),
  getUserTrips: () => apiFetch('/trips'),
  getPosts: (page = 1) => apiFetch(`/posts?page=${page}`),
  getPost: (id) => apiFetch(`/posts/${id}`),
  getPostById: (id) => apiFetch(`/posts/${id}`),
  createPost: (data) => apiFetch('/posts', { method: 'POST', body: JSON.stringify(data) }),
  updatePost: (id, data) => apiFetch(`/posts/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deletePost: (id) => apiFetch(`/posts/${id}`, { method: 'DELETE' }),
  likePost: (id) => apiFetch(`/posts/${id}/like`, { method: 'POST' }),
  getComments: (id) => apiFetch(`/posts/${id}/comments`),
  createComment: (id, text) => apiFetch(`/posts/${id}/comments`, { method: 'POST', body: JSON.stringify({ text }) }),
  createTrip: (data) => apiFetch('/trips', { method: 'POST', body: JSON.stringify(data) }),
  deleteTrip: (id) => apiFetch(`/trips/${id}`, { method: 'DELETE' }),
  getTripNotes: (id) => apiFetch(`/trips/${id}/notes`),
  updateProfileBackground: (userId, background) => apiFetch(`/users/${userId}/background`, { method: 'PUT', body: JSON.stringify({ background_image: background }) }),
  searchUsers: (q) => apiFetch(`/users/search?q=${encodeURIComponent(q)}`),
  searchPosts: (q) => apiFetch(`/posts/search?q=${encodeURIComponent(q)}`),
  getTagPosts: (tag) => apiFetch(`/tags/${encodeURIComponent(tag)}/posts`),
  logout: () => { localStorage.removeItem('vhelp_token'); localStorage.removeItem('vhelp_user'); }
};
