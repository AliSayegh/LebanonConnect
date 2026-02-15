import axios from "axios";

export const API_BASE = "http://localhost:5000";

export const api = (token) =>
  axios.create({
    baseURL: API_BASE,
    headers: token ? { Authorization: `Bearer ${token}` } : {}
  });
