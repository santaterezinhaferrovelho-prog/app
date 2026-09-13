import axios from "axios";

const configuredBackendUrl = (process.env.REACT_APP_BACKEND_URL || "").trim();
const isLocalBackend = /^(https?:\/\/)?localhost(?::\d+)?$/i.test(configuredBackendUrl);
const browserHost = typeof window !== "undefined" ? window.location.hostname : "localhost";
const browserProtocol = typeof window !== "undefined" ? window.location.protocol : "http:";

export const BACKEND_URL = configuredBackendUrl && !isLocalBackend
  ? configuredBackendUrl
  : browserHost === "localhost" || browserHost === "127.0.0.1"
    ? "http://localhost:8001"
    : `${browserProtocol}//${browserHost}`;
export const API = `${BACKEND_URL}/api`;

const api = axios.create({
  baseURL: API,
  withCredentials: true,
});

// Send Bearer token as fallback (cookies work too)
api.interceptors.request.use((config) => {
  const t = localStorage.getItem("token");
  if (t) config.headers.Authorization = `Bearer ${t}`;
  return config;
});

export function resolveImg(url) {
  if (!url) return null;
  if (url.startsWith("http")) return url;
  return `${BACKEND_URL}${url}`;
}

export function formatBRL(v) {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(v || 0);
}

export default api;
