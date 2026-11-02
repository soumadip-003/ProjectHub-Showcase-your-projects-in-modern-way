import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import "./SupportChat.css";

const API_URL = "http://localhost:5000/api/chats";
const REFRESH_INTERVAL = 5000;

function formatTime(date) {
  const parsedDate = new Date(date);
  if (Number.isNaN(parsedDate.getTime())) return "";

  return parsedDate.toLocaleTimeString("en-IN", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

function getErrorMessage(data, fallback) {
  return data?.message || fallback;
}

export default function SupportChat({ role, onClose, onUnauthorized }) {
  const isAdmin = role === "admin";
  const [chats, setChats] = useState([]);
  const [selectedChatId, setSelectedChatId] = useState("");
  const [institutionChat, setInstitutionChat] = useState(null);
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");
  const messagesEndRef = useRef(null);

  const token = isAdmin
    ? sessionStorage.getItem("adminToken")
    : localStorage.getItem("institutionToken");

  const selectedChat = useMemo(
    () => chats.find((chat) => chat._id === selectedChatId) || null,
    [chats, selectedChatId]
  );
  const activeChat = isAdmin ? selectedChat : institutionChat;
  const messages = activeChat?.messages || [];

  const loadChats = useCallback(async () => {
    const endpoint = isAdmin ? `${API_URL}/admin` : `${API_URL}/institution`;

    try {
      const response = await fetch(endpoint, {
        headers: { Authorization: `Bearer ${token}` },
        cache: "no-store",
      });
      const data = await response.json().catch(() => ({}));

      if (response.status === 401 || response.status === 403) {
        onUnauthorized();
        return;
      }

      if (!response.ok || !data.success) {
        throw new Error(getErrorMessage(data, "Could not load messages."));
      }

      if (isAdmin) {
        const nextChats = Array.isArray(data.chats) ? data.chats : [];
        setChats(nextChats);
        setSelectedChatId((current) =>
          current && nextChats.some((chat) => chat._id === current)
            ? current
            : nextChats[0]?._id || ""
        );
      } else {
        setInstitutionChat(data.chat || null);
      }

      setError("");
    } catch (err) {
      setError(err.message || "Could not load messages.");
    } finally {
      setLoading(false);
    }
  }, [isAdmin, onUnauthorized, token]);

  useEffect(() => {
    const initialLoadId = window.setTimeout(loadChats, 0);
    const intervalId = window.setInterval(loadChats, REFRESH_INTERVAL);
    return () => {
      window.clearTimeout(initialLoadId);
      window.clearInterval(intervalId);
    };
  }, [loadChats]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages.length, activeChat?._id]);

  const sendMessage = async (event) => {
    event.preventDefault();
    const text = message.trim();

    if (!text || sending) return;
    if (isAdmin && !selectedChatId) return;

    setSending(true);
    setError("");

    try {
      const endpoint = isAdmin
        ? `${API_URL}/${selectedChatId}/messages`
        : `${API_URL}/institution/messages`;
      const response = await fetch(endpoint, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ text }),
      });
      const data = await response.json().catch(() => ({}));

      if (response.status === 401 || response.status === 403) {
        onUnauthorized();
        return;
      }

      if (!response.ok || !data.success) {
        throw new Error(getErrorMessage(data, "Could not send your message."));
      }

      setMessage("");
      if (isAdmin) {
        setChats((current) =>
          current.map((chat) =>
            chat._id === selectedChatId
              ? { ...data.chat, institution: chat.institution }
              : chat
          )
        );
      } else {
        setInstitutionChat(data.chat);
      }
    } catch (err) {
      setError(err.message || "Could not send your message.");
    } finally {
      setSending(false);
    }
  };

  const expiresAt = activeChat?.expiresAt
    ? new Date(activeChat.expiresAt)
    : null;

  return (
    <section className={`support-chat ${isAdmin ? "support-chat-admin" : "support-chat-widget"}`}>
      <header className="support-chat-header">
        <div>
          <strong>{isAdmin ? "Institution Support" : "ProjectHub Support"}</strong>
          <span>
            {isAdmin
              ? selectedChat?.institution?.name || "Select an institution chat"
              : "Replies from the administrator"}
          </span>
        </div>
        {!isAdmin && (
          <button type="button" onClick={onClose} aria-label="Close support chat">
            ×
          </button>
        )}
      </header>

      {isAdmin && (
        <aside className="support-chat-list">
          {chats.length === 0 && !loading && (
            <p className="support-chat-list-empty">No active chats yet.</p>
          )}
          {chats.map((chat) => {
            const latestMessage = chat.messages?.[chat.messages.length - 1];
            return (
              <button
                type="button"
                key={chat._id}
                className={chat._id === selectedChatId ? "selected" : ""}
                onClick={() => setSelectedChatId(chat._id)}
              >
                <strong>{chat.institution?.name || "Institution"}</strong>
                <span>{latestMessage?.text || "New conversation"}</span>
              </button>
            );
          })}
        </aside>
      )}

      <div className="support-chat-body">
        {loading ? (
          <p className="support-chat-placeholder">Loading conversation…</p>
        ) : !activeChat && !isAdmin ? (
          <p className="support-chat-placeholder">
            Send a message to start a conversation with the administrator.
          </p>
        ) : !activeChat && isAdmin ? (
          <p className="support-chat-placeholder">
            Institution conversations will appear here.
          </p>
        ) : messages.length === 0 ? (
          <p className="support-chat-placeholder">No messages in this chat yet.</p>
        ) : (
          messages.map((item, index) => {
            const isOwnMessage = isAdmin
              ? item.sender === "admin"
              : item.sender === "institution";
            return (
              <div
                className={`support-chat-message ${isOwnMessage ? "own" : ""}`}
                key={`${item.sentAt}-${index}`}
              >
                <span>{isOwnMessage ? "You" : isAdmin ? "Institution" : "Admin"}</span>
                <p>{item.text}</p>
                <time>{formatTime(item.sentAt)}</time>
              </div>
            );
          })
        )}
        <div ref={messagesEndRef} />
      </div>

      {error && <p className="support-chat-error" role="alert">{error}</p>}

      {activeChat && expiresAt && (
        <p className="support-chat-expiry">
          This conversation expires at {formatTime(expiresAt)} (24 hours after it started).
        </p>
      )}

      <form className="support-chat-compose" onSubmit={sendMessage}>
        <textarea
          value={message}
          onChange={(event) => setMessage(event.target.value)}
          placeholder="Write a message…"
          maxLength={2000}
          rows={2}
          aria-label="Write a support message"
          disabled={isAdmin && !selectedChatId}
        />
        <button
          type="submit"
          disabled={sending || !message.trim() || (isAdmin && !selectedChatId)}
        >
          {sending ? "Sending…" : "Send"}
        </button>
      </form>
    </section>
  );
}
