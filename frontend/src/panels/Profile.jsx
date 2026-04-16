import React, { useState, useEffect } from "react";
import bridge from "@vkontakte/vk-bridge";

const Profile = () => {
  const [userInfo, setUserInfo] = useState(null);
  const [friends, setFriends] = useState([]);
  const [friendsCount, setFriendsCount] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        // Запрашиваем права на доступ к друзьям
        await bridge
          .send("VKWebAppRequestPersonalData", {
            types: ["friends"],
          })
          .catch(() => {
            console.log("Доступ к друзьям не получен");
          });

        // Получаем информацию о пользователе
        const userInfoResponse = await bridge.send("VKWebAppGetUserInfo");
        setUserInfo(userInfoResponse);

        // Получаем друзей с фото
        const friendsResponse = await bridge.send("VKWebAppCallAPIMethod", {
          method: "friends.get",
          params: {
            fields: "photo_100,photo_max,first_name,last_name",
            count: 100,
            v: "5.216",
          },
        });

        console.log("Friends response:", friendsResponse);

        // ВАЖНО: берем общее количество из response.count, а не из items.length
        const totalCount = friendsResponse.response?.count || 0;
        const friendsList = friendsResponse.response?.items || [];

        console.log("Total friends count:", totalCount);
        console.log("Friends with photos:", friendsList);

        setFriendsCount(totalCount);
        setFriends(friendsList);
        setLoading(false);
      } catch (error) {
        console.error("Error fetching data:", error);
        // При ошибке показываем моковые данные
        setFriendsCount(61);
        setFriends([
          {
            id: 1,
            first_name: "Анна",
            last_name: "С.",
            photo_100: "https://i.pravatar.cc/150?img=1",
          },
          {
            id: 2,
            first_name: "Михаил",
            last_name: "В.",
            photo_100: "https://i.pravatar.cc/150?img=3",
          },
        ]);
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  if (loading) {
    return (
      <div
        style={{
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          minHeight: "100vh",
          backgroundColor: "#F6F2E9",
        }}
      >
        <div>Загрузка...</div>
      </div>
    );
  }

  return (
    <>
      <style>{`
        .profile-page {
          background-color: #F6F2E9;
          min-height: 100vh;
          padding-bottom: 80px;
          font-family: -apple-system, BlinkMacSystemFont, 'Roboto', sans-serif;
          color: #000;
        }
        .header-bg {
          height: 140px;
          background-image: url('https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?w=800&h=400&fit=crop');
          background-size: cover;
          background-position: center;
        }
        .profile-card {
          background: #ffffff;
          border-radius: 20px 20px 0 0;
          margin-top: -20px;
          padding: 20px 16px 30px 16px;
          text-align: center;
          position: relative;
          box-shadow: 0px -2px 10px rgba(0,0,0,0.05);
        }
        .avatar-container {
          position: relative;
          margin-top: -55px;
          margin-bottom: 12px;
        }
        .main-avatar {
          width: 100px;
          height: 100px;
          border-radius: 50%;
          border: 4px solid #ffffff;
          object-fit: cover;
          background-color: #ccc;
        }
        .user-name {
          font-size: 20px;
          font-weight: 700;
          margin: 0;
        }
        .stats-container {
          display: flex;
          justify-content: space-between;
          gap: 12px;
          padding: 16px;
        }
        .stat-card {
          background: #ffffff;
          border-radius: 16px;
          flex: 1;
          padding: 12px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          box-shadow: 0 2px 4px rgba(0,0,0,0.03);
        }
        .stat-info {
          display: flex;
          flex-direction: column;
        }
        .stat-count {
          font-size: 18px;
          font-weight: 700;
        }
        .stat-label {
          font-size: 12px;
          color: #818c99;
        }
        .stat-mini-avatars {
          display: flex;
        }
        .stat-mini-avatars img {
          width: 28px;
          height: 28px;
          border-radius: 50%;
          border: 2px solid #fff;
          margin-left: -8px;
          object-fit: cover;
        }
        .stat-mini-avatars img:first-child {
          margin-left: 0;
        }
        .feed-container {
          padding: 0 16px;
          display: flex;
          flex-direction: column;
          gap: 16px;
        }
        .post-card {
          background: #ffffff;
          border-radius: 16px;
          padding: 16px;
          box-shadow: 0 2px 4px rgba(0,0,0,0.03);
        }
        .post-header {
          display: flex;
          align-items: center;
          margin-bottom: 12px;
        }
        .post-author-avatar {
          width: 40px;
          height: 40px;
          border-radius: 50%;
          margin-right: 12px;
          object-fit: cover;
          background-color: #eee;
        }
        .post-author-name {
          font-size: 16px;
          font-weight: 600;
        }
        .post-description {
          font-size: 14px;
          color: #818c99;
          margin-bottom: 12px;
        }
        .post-images {
          display: flex;
          gap: 10px;
          overflow: hidden;
        }
        .post-image {
          border-radius: 12px;
          height: 160px;
          object-fit: cover;
        }
        .post-image-large { flex: 2; }
        .post-image-small { flex: 1; }
        .tab-bar {
          position: fixed;
          bottom: 0;
          left: 0;
          right: 0;
          background-color: #c8d28c;
          height: 60px;
          display: flex;
          justify-content: space-around;
          align-items: center;
          border-radius: 20px 20px 0 0;
          box-shadow: 0 -2px 10px rgba(0,0,0,0.05);
          padding-bottom: env(safe-area-inset-bottom);
        }
        .tab-btn {
          background: #ffffff;
          border: none;
          width: 44px;
          height: 44px;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          font-size: 20px;
        }
      `}</style>

      <div className="profile-page">
        <div className="header-bg"></div>

        <div className="profile-card">
          <div className="avatar-container">
            <img
              src={
                userInfo?.photo_200 ||
                userInfo?.photo_100 ||
                "https://via.placeholder.com/150"
              }
              alt="Avatar"
              className="main-avatar"
            />
          </div>
          <h2 className="user-name">
            {userInfo
              ? `${userInfo.first_name} ${userInfo.last_name}`
              : "Пользователь"}
          </h2>
        </div>

        <div className="stats-container">
          <div className="stat-card">
            <div className="stat-info">
              {/* ВАЖНО: показываем friendsCount, а не friends.length */}
              <span className="stat-count">{friendsCount}</span>
              <span className="stat-label">Друга</span>
            </div>
            <div className="stat-mini-avatars">
              {friends.slice(0, 2).map((friend) => (
                <img
                  key={friend.id}
                  // Пробуем несколько полей с фото по порядку
                  src={
                    friend.photo_max ||
                    friend.photo_200 ||
                    friend.photo_100 ||
                    "https://via.placeholder.com/50"
                  }
                  alt={friend.first_name}
                />
              ))}
            </div>
          </div>

          <div className="stat-card">
            <div className="stat-info">
              <span className="stat-count">0</span>
              <span className="stat-label">Подписки</span>
            </div>
            <div className="stat-mini-avatars">
              {/* Пока пусто - заглушка */}
            </div>
          </div>
        </div>

        <div className="feed-container">
          <div className="post-card">
            <div className="post-header">
              <img
                src={userInfo?.photo_100 || "https://via.placeholder.com/80"}
                alt="Author"
                className="post-author-avatar"
              />
              <span className="post-author-name">
                {userInfo
                  ? `${userInfo.first_name} ${userInfo.last_name}`
                  : "Пользователь"}
              </span>
            </div>
            <div className="post-description">
              Эко-комплекс «Уральские зори» — место, где...
            </div>
            <div className="post-description">Далее</div>
            <div className="post-images">
              <img
                src="https://images.unsplash.com/photo-1576013551627-0cc20bfc082f?w=400&h=300&fit=crop"
                alt="Pool"
                className="post-image post-image-large"
              />
              <img
                src="https://images.unsplash.com/photo-1572331165267-854da2b10ccc?w=400&h=300&fit=crop"
                alt="Interior"
                className="post-image post-image-small"
              />
            </div>
          </div>

          <div className="post-card">
            <div className="post-header">
              <img
                src={userInfo?.photo_100 || "https://via.placeholder.com/80"}
                alt="Author"
                className="post-author-avatar"
              />
              <span className="post-author-name">
                {userInfo
                  ? `${userInfo.first_name} ${userInfo.last_name}`
                  : "Пользователь"}
              </span>
            </div>
            <div className="post-description">
              Путешествие в Касли — это встреча со столицей...
            </div>
            <div className="post-description">Далее</div>
            <div className="post-images">
              <div
                className="post-image post-image-large"
                style={{ backgroundColor: "#e1e3e6" }}
              ></div>
              <div
                className="post-image post-image-small"
                style={{ backgroundColor: "#e1e3e6" }}
              ></div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default Profile;
