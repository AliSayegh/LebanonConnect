import { useEffect, useRef, useState } from "react";
import { useParams } from "react-router-dom";
import { motion } from "framer-motion";
import io from "socket.io-client";
import { API_BASE } from "../api";
import { useAuth } from "../auth/useAuth";

export default function Chat({ notify }) {
  const { jobId } = useParams();
  const { token, user } = useAuth();

  const socketRef = useRef(null);
  const [status, setStatus] = useState("connecting...");
  const [chat, setChat] = useState([]);
  const [message, setMessage] = useState("");

  // ✅ Create socket ONCE (prevents re-create + disconnect issues)
  useEffect(() => {
    if (!token) return;

    if (!socketRef.current) {
      socketRef.current = io(API_BASE, {
        auth: { token },
        transports: ["polling", "websocket"], // allow fallback
      });
    }

    const socket = socketRef.current;

    const onConnect = () => {
      setStatus("connected ✅");
      console.log("✅ connected:", socket.id);

      // ✅ Emit join AFTER connection
      if (jobId) {
        console.log("➡️ EMIT joinJobRoom", jobId);
        socket.emit("joinJobRoom", { jobId });
      }
    };

    const onConnectError = (err) => {
      setStatus("connect_error ❌");
      console.log("❌ connect_error:", err?.message);
      notify?.("error", "Socket error", err?.message || "connect_error");
    };

    const onHistory = (msgs) => {
      console.log("📜 chatHistory", msgs);
      setChat(msgs || []);
    };

    const onReceive = (msg) => {
      console.log("💬 receiveJobMessage", msg);
      setChat((prev) => [...prev, msg]);
    };

    const onBlocked = (m) => notify?.("error", "Blocked", m?.message || "Blocked");
    const onError = (m) => notify?.("error", "Chat error", m?.message || "Error");
    const onJoined = (d) => console.log("✅ joinedRoom", d);

    socket.on("connect", onConnect);
    socket.on("connect_error", onConnectError);
    socket.on("chatHistory", onHistory);
    socket.on("receiveJobMessage", onReceive);
    socket.on("blockedMessage", onBlocked);
    socket.on("errorMessage", onError);
    socket.on("joinedRoom", onJoined);

    return () => {
      socket.off("connect", onConnect);
      socket.off("connect_error", onConnectError);
      socket.off("chatHistory", onHistory);
      socket.off("receiveJobMessage", onReceive);
      socket.off("blockedMessage", onBlocked);
      socket.off("errorMessage", onError);
      socket.off("joinedRoom", onJoined);

      // ✅ DO NOT disconnect here (prevents StrictMode double-run issues)
      // We will disconnect only on full page unload/unmount below if you want.
    };
  }, [token, jobId, notify]);

  // ✅ If jobId changes, re-join
  useEffect(() => {
    const socket = socketRef.current;
    if (!socket || !socket.connected || !jobId) return;

    console.log("➡️ RE-JOIN job room", jobId);
    socket.emit("joinJobRoom", { jobId });
  }, [jobId]);

  // ✅ Disconnect only when leaving chat page completely (optional)
  useEffect(() => {
    return () => {
      if (socketRef.current) {
        socketRef.current.disconnect();
        socketRef.current = null;
      }
    };
  }, []);

  const send = () => {
    const socket = socketRef.current;
    if (!socket) return notify?.("error", "Not connected", "Socket not ready");
    if (!message.trim()) return;

    console.log("➡️ EMIT sendJobMessage", { jobId, content: message });
    socket.emit("sendJobMessage", { jobId, content: message.trim() });
    setMessage("");
  };

  return (
    <div className="chatShell">
      <motion.div
        className="chatHeader"
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.25 }}
      >
        <div>
          <div className="chatTitle">Secure Job Chat</div>
          <div className="chatSub">
            {status}
          </div>
        </div>
        <div className="pill">{user?.role}</div>
      </motion.div>

      <div className="chatBody">
        {chat.map((m, i) => {
          const isMe = String(m.senderId) === String(user?.id);
          return (
            <motion.div
              key={m._id || i}
              className={`bubbleRow ${isMe ? "me" : "them"}`}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.15 }}
            >
              <div className={`bubble ${isMe ? "bubbleMe" : "bubbleThem"}`}>
                <div className="bubbleText">{m.content}</div>
              </div>
            </motion.div>
          );
        })}
      </div>

      <div className="chatBar">
        <input
          className="chatInput"
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          placeholder="Type… (contacts blocked)"
          onKeyDown={(e) => e.key === "Enter" && send()}
        />
        <button className="btn primary" onClick={send}>
          Send
        </button>
      </div>
    </div>
  );
}
