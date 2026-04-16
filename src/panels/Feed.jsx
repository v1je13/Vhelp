import React, { useState, useEffect } from "react";
import { Panel, HorizontalScroll, Button } from "@vkontakte/vkui";
import Loader from "../components/Loader";
import api from "../api";
import { useAuth } from "../hooks/useAuth";

export default function Feed({ nav, onOpenPost, onCreatePost, onCreateStory }) {
  const [loading, setLoading] = useState(true);
  const [posts, setPosts] = useState([]);
  const [stories, setStories] = useState([]);
  const [searchQuery, setSearchQuery] = useState("");
  const { user, login } = useAuth();

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const [postsData, storiesData] = await Promise.all([
          api.getPosts(),
          api.getStories()
        ]);
        setPosts(postsData.posts || []);
        setStories(storiesData || []);
      } catch (error) {
        console.error('Error fetching data:', error);
      } finally {
        setLoading(false);
      }
    };

    if (user) {
      fetchData();
    }
  }, [user]);

  const handleSearchChange = (e) => {
    setSearchQuery(e.target.value);
    console.log("Поиск:", e.target.value);
  };

  const handleLike = async (postId) => {
    try {
      const result = await api.likePost(postId);
      setPosts(posts.map(post => 
        post._id === postId 
          ? { ...post, likesCount: result.likesCount }
          : post
      ));
    } catch (error) {
      console.error('Error liking post:', error);
    }
  };

  return (
    <>
      <style>{`
        .feed-page {
          background-color: #F6F2E9;
          min-height: 100vh;
          font-family: -apple-system, BlinkMacSystemFont, 'Roboto', sans-serif;
          padding-bottom: 20px;
        }

        /* Шапка с поиском */
        .search-header {
          padding: 16px 16px 12px 16px;
          background-color: #F6F2E9;
        }

        .search-panel {
          background-color: #F5F5F5;
          border-radius: 12px;
          padding: 14px 16px;
        }

        .search-input {
          width: 100%;
          border: none;
          outline: none;
          background: transparent;
          font-size: 17px;
          color: #000;
          padding: 0;
          font-family: -apple-system, BlinkMacSystemFont, 'Roboto', sans-serif;
        }

        .search-input::placeholder {
          color: #000;
          opacity: 0.8;
        }

        /* Истории */
        .stories-wrapper {
          padding: 12px 0 12px 0;
        }

        .stories-scroll {
          display: flex;
          gap: 12px;
          padding: 0 16px;
        }

        .story-item {
          display: flex;
          flex-direction: column;
          align-items: center;
          min-width: 64px;
        }

        .story-circle {
          width: 64px;
          height: 64px;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 16px;
          font-weight: 600;
          border: 2px solid #fff;
          box-sizing: border-box;
        }

        .story-add {
          background-color: #F5F5F5;
          font-size: 32px;
          color: #000;
          font-weight: 300;
        }

        .story-initials {
          background-color: #F4D03F;
          color: #000;
        }

        .story-photo {
          width: 64px;
          height: 64px;
          border-radius: 50%;
          object-fit: cover;
          border: 2px solid #fff;
        }

        /* Посты */
        .posts-list {
          padding: 0 16px;
          display: flex;
          flex-direction: column;
          gap: 16px;
        }

        .post-card {
          background: #ffffff;
          border-radius: 16px;
          padding: 16px;
        }

        .post-header {
          display: flex;
          align-items: center;
          margin-bottom: 12px;
        }

        .post-avatar {
          width: 40px;
          height: 40px;
          border-radius: 50%;
          margin-right: 12px;
          object-fit: cover;
        }

        .post-author-name {
          font-size: 16px;
          font-weight: 600;
          color: #000;
        }

        .post-desc {
          font-size: 14px;
          color: #818c99;
          margin-bottom: 4px;
        }

        .post-further {
          font-size: 14px;
          color: #818c99;
          margin-bottom: 12px;
        }

        .post-images-block {
          display: flex;
          gap: 8px;
          height: 160px;
        }

        .post-img-large {
          flex: 1;
          background-color: #E1E3E6;
          border-radius: 12px;
        }

        .post-img-small {
          width: 80px;
          background-color: #E1E3E6;
          border-radius: 12px;
        }
      `}</style>

      <Panel nav={nav} filled={false}>
        <div className="feed-page">
          {/* Шапка с панелью поиска */}
          <div className="search-header">
            {!user && (
              <div style={{ padding: '10px', marginBottom: '10px', backgroundColor: '#fff', borderRadius: '8px' }}>
                <Button 
                  onClick={() => login({
                    vk_user_id: 'test_user_123',
                    vk_first_name: 'Test',
                    vk_last_name: 'User',
                    vk_avatar: '',
                    sign: 'test_sign'
                  })}
                  size="s"
                  style={{ backgroundColor: '#c8d28c', color: '#000' }}
                >
                  Тестовая авторизация
                </Button>
              </div>
            )}
            <div className="search-panel">
              <input
                type="text"
                className="search-input"
                placeholder="Поиск"
                value={searchQuery}
                onChange={handleSearchChange}
              />
            </div>
          </div>

          {/* Истории */}
          <div className="stories-wrapper">
            <HorizontalScroll>
              <div className="stories-scroll">
                {/* Add story button */}
                <div className="story-item" onClick={onCreateStory}>
                  <div className="story-circle story-add" style={{ cursor: 'pointer' }}>+</div>
                </div>
                {/* Stories from backend */}
                {stories.map((story) => (
                  <div key={story._id} className="story-item">
                    {story.images && story.images[0] ? (
                      <img src={story.images[0]} alt="" className="story-photo" />
                    ) : (
                      <div 
                        className="story-circle story-initials"
                        style={{ backgroundColor: '#F4D03F' }}
                      >
                        {story.author?.firstName?.[0]}{story.author?.lastName?.[0]}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </HorizontalScroll>
          </div>

          {/* Посты */}
          <div className="posts-list">
            {posts.map((post) => (
              <div key={post._id} className="post-card">
                <div className="post-header">
                  <img 
                    src={post.author?.avatar || "https://i.pravatar.cc/150?img=1"} 
                    alt="" 
                    className="post-avatar" 
                  />
                  <div className="post-author-name">
                    {post.author?.firstName} {post.author?.lastName}
                  </div>
                </div>
                <div className="post-desc">{post.content}</div>
                {post.location && (
                  <div className="post-further">📍 {post.location}</div>
                )}
                {post.images && post.images.length > 0 && (
                  <div className="post-images-block">
                    <div className="post-img-large" style={{ backgroundImage: `url(${post.images[0]})`, backgroundSize: 'cover', backgroundPosition: 'center' }}></div>
                    {post.images[1] && (
                      <div className="post-img-small" style={{ backgroundImage: `url(${post.images[1]})`, backgroundSize: 'cover', backgroundPosition: 'center' }}></div>
                    )}
                  </div>
                )}
                <div style={{ display: 'flex', gap: '16px', marginTop: '12px', alignItems: 'center' }}>
                  <button 
                    onClick={() => handleLike(post._id)}
                    style={{ 
                      background: 'none', 
                      border: 'none', 
                      cursor: 'pointer', 
                      fontSize: '16px',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '4px'
                    }}
                  >
                    ❤️ {post.likesCount || 0}
                  </button>
                  <button 
                    onClick={() => onOpenPost && onOpenPost(post._id)}
                    style={{ 
                      background: 'none', 
                      border: 'none', 
                      cursor: 'pointer', 
                      fontSize: '16px',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '4px'
                    }}
                  >
                    💬 {post.commentsCount || 0}
                  </button>
                </div>
              </div>
            ))}
          </div>

          {/* Floating create post button */}
          <div style={{ 
            position: 'fixed', 
            bottom: '160px', 
            right: '20px', 
            zIndex: 1000 
          }}>
            <Button 
              onClick={onCreatePost}
              size="l"
              style={{ 
                borderRadius: '50%', 
                width: '60px', 
                height: '60px',
                minWidth: '60px',
                backgroundColor: '#c8d28c',
                color: '#000'
              }}
            >
              +
            </Button>
          </div>
        </div>
      </Panel>
    </>
  );
}