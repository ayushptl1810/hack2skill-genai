export const getApiBaseUrl = () => {
  const env = import.meta.env?.VITE_API_BASE_URL;
  if (env && typeof env === "string" && env.trim()) {
    return env.replace(/\/$/, "");
  }
  return "http://127.0.0.1:7860"; // default local backend
};

export const getWsUrl = () => {
  const envWs = import.meta.env?.VITE_WS_URL;
  if (envWs && typeof envWs === "string" && envWs.trim()) {
    return envWs.endsWith("/ws") ? envWs : `${envWs.replace(/\/$/, "")}/ws`;
  }
  const api = getApiBaseUrl();
  const protocol = api.startsWith("https") ? "wss" : "ws";
  const host = api.replace(/^https?:\/\//, "");
  return `${protocol}://${host}/ws`;
};
