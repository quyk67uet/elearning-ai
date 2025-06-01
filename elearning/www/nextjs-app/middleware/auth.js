import axios from "axios";
import { signOut } from "next-auth/react";

/**
 * Middleware cho API requests
 * Tự động thêm JWT token vào Authorization header
 */
export const authMiddleware = async (req, config = {}) => {
  // Sử dụng JWT token từ session thay vì cookie sid
  return {
    ...config,
    withCredentials: false, // Không cần gửi cookies vì dùng JWT
  };
};

/**
 * Lưu thông tin người dùng vào localStorage
 * Bao gồm cả accessToken từ JWT
 */
export const saveAuthData = (userData, accessToken) => {
  if (accessToken) {
    userData.accessToken = accessToken;
  }
  localStorage.setItem("user", JSON.stringify(userData));
};

/**
 * Xử lý đăng nhập từ NextAuth
 */
export const handleNextAuthLogin = async (session) => {
  if (session?.user) {
    const userData = {
      userId: session.user?.userId || session.user?.id || session.user?.email,
      name: session.user?.name,
      email: session.user?.email,
      avatar: session.user?.avatar || session.user?.image,
      roles: session.user?.roles || session.frappeUser?.roles || ["Student"],
      first_name: session.user?.name?.split(" ")[0] || "",
      last_name: session.user?.name?.split(" ").slice(1).join(" ") || "",
      provider: session.user?.provider || "default",
    };

    // Save user data with access token
    saveAuthData(userData, session.accessToken);
    return true;
  }
  return false;
};

/**
 * Client API instance kết nối với Frappe
 */
export const frappeAPI = axios.create({
  baseURL: process.env.NEXT_PUBLIC_FRAPPE_URL || "http://localhost:8000",
  headers: {
    "Content-Type": "application/json",
  },
  withCredentials: false, // Sử dụng JWT thay vì cookies
});

// Thêm interceptor cho request - gắn Authorization header với JWT token
frappeAPI.interceptors.request.use(async (config) => {
  const user = getCurrentUser();
  if (user?.accessToken) {
    config.headers["Authorization"] = `Bearer ${user.accessToken}`;
  }
  return config;
});

/**
 * Kiểm tra trạng thái đăng nhập
 */
export const isAuthenticated = () => {
  // Kiểm tra dựa vào localStorage user và accessToken
  const user = getCurrentUser();
  return !!user && !!user.accessToken;
};

/**
 * Lấy thông tin người dùng hiện tại
 */
export const getCurrentUser = () => {
  const userStr = localStorage.getItem("user");
  if (!userStr) return null;

  try {
    return JSON.parse(userStr);
  } catch (e) {
    return null;
  }
};

/**
 * Đăng xuất
 */
export const logout = async () => {
  // Clear local storage
  localStorage.removeItem("user");

  // Try to log out from Frappe backend using JWT
  try {
    const user = getCurrentUser();
    if (user?.accessToken) {
      await frappeAPI.post("/api/method/logout", {}, {
        headers: {
          "Authorization": `Bearer ${user.accessToken}`
        }
      });
    }
  } catch (error) {
    console.error("Frappe logout error:", error);
  }

  // Also sign out from NextAuth (client-side only)
  if (typeof window !== "undefined") {
    try {
      await signOut({ redirect: true, callbackUrl: '/auth/login' });
    } catch (error) {
      console.error("NextAuth signout error:", error);
    }
  }

  // Return true to indicate successful logout
  return true;
};
