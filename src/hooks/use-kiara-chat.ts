import { useCallback, useState } from "react";
import { createMessage, sendChat, type ChatMessage } from "@/lib/kiara-chat";

export function useKiaraChat(initialGreeting: string) {
  const [messages, setMessages] = useState<ChatMessage[]>(() => [
    createMessage("assistant", initialGreeting),
  ]);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const send = useCallback(
    async (text: string) => {
      const trimmed = text.trim().slice(0, 1000);
      if (!trimmed || sending) return;
      const userMsg = createMessage("user", trimmed);
      const next = [...messages, userMsg];
      setMessages(next);
      setSending(true);
      setError(null);

      const replyId = createMessage("assistant", "").id;
      let started = false;

      try {
        await sendChat(next, (chunk) => {
          if (!started) {
            started = true;
            setMessages((prev) => [
              ...prev,
              { id: replyId, role: "assistant", content: chunk, createdAt: Date.now() },
            ]);
            setSending(false);
            return;
          }
          setMessages((prev) =>
            prev.map((m) => (m.id === replyId ? { ...m, content: m.content + chunk } : m)),
          );
        });
      } catch (e) {
        setError((e as Error).message);
        setMessages((prev) => [
          ...prev.filter((m) => m.id !== replyId || m.content.trim()),
          createMessage(
            "assistant",
            "Ups, mi conexión falló. Escríbenos por WhatsApp mientras me recompongo 🐾",
          ),
        ]);
      } finally {
        setSending(false);
      }
    },
    [messages, sending],
  );

  const reset = useCallback((greeting: string) => {
    setMessages([createMessage("assistant", greeting)]);
    setError(null);
  }, []);

  return { messages, sending, error, send, reset };
}
