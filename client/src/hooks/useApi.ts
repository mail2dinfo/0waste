import axios from "axios";

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || "http://localhost:4000/api",
});

let interceptorsAttached = false;

export function useApi() {
  if (!interceptorsAttached) {
    api.interceptors.request.use((config) => {
      const userId = window.localStorage.getItem("nowasteUserId");
      if (userId) {
        if (!config.headers) {
          config.headers = {} as any;
        }
        config.headers["x-user-id"] = userId;
      }
      return config;
    });
    interceptorsAttached = true;
  }
  return api;
}

export default api;



