import { useState, useEffect } from "react";
import vkBridge from "@vkontakte/vk-bridge";

export function useVKUser() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const getUserInfo = async () => {
      try {
        const data = await vkBridge.send("VKWebAppGetUserInfo");
        setUser(data);
        setLoading(false);
      } catch (err) {
        console.error("Failed to get user info:", err);
        setError(err);
        setLoading(false);
      }
    };

    getUserInfo();
  }, []);

  return { user, loading, error };
}