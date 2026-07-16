import { io } from "socket.io-client";

const URL = import.meta.env.VITE_SERVER_URL || "https://pes-arena-backend.onrender.com";

export const socket = io(URL, { autoConnect: true });
