import { useState, useEffect, useRef } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import { toast } from "sonner";

export function MessagesTab() {
  const [selectedMatch, setSelectedMatch] = useState<any>(null);
  const [newMessage, setNewMessage] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const userMatches = useQuery(api.matching.getUserMatches, { status: "accepted" }) || [];
  const messages = useQuery(
    api.messages.getMatchMessages,
    selectedMatch ? { matchId: selectedMatch._id } : "skip"
  ) || [];

  const sendMessage = useMutation(api.messages.sendMessage);
  const markAsRead = useMutation(api.messages.markMessagesAsRead);

  useEffect(() => {
    if (selectedMatch) {
      markAsRead({ matchId: selectedMatch._id });
    }
  }, [selectedMatch, markAsRead]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || !selectedMatch) return;

    try {
      await sendMessage({
        matchId: selectedMatch._id,
        content: newMessage,
        messageType: "text",
      });
      setNewMessage("");
    } catch (error) {
      toast.error("Failed to send message");
    }
  };

  const formatTime = (timestamp: number) => {
    return new Date(timestamp).toLocaleString();
  };

  return (
    <div className="flex h-full">
      {/* Conversations List */}
      <div className="w-1/3 bg-white border-r border-gray-200">
        <div className="p-4 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900">Messages</h3>
        </div>
        <div className="overflow-y-auto h-full">
          {userMatches.map((match) => (
            <div
              key={match._id}
              onClick={() => setSelectedMatch(match)}
              className={`p-4 border-b border-gray-100 cursor-pointer hover:bg-gray-50 ${
                selectedMatch?._id === match._id ? "bg-blue-50 border-l-4 border-l-blue-500" : ""
              }`}
            >
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-gray-300 rounded-full flex items-center justify-center">
                  <span className="text-sm font-medium text-gray-700">
                    {match.otherUser?.fullName?.charAt(0) || "?"}
                  </span>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 truncate">
                    {match.otherUser?.fullName || "Anonymous"}
                  </p>
                  <p className="text-sm text-gray-500 truncate">{match.subject}</p>
                </div>
              </div>
            </div>
          ))}
          {userMatches.length === 0 && (
            <div className="p-8 text-center text-gray-500">
              <p>No active conversations</p>
              <p className="text-sm mt-1">Accept match requests to start chatting</p>
            </div>
          )}
        </div>
      </div>

      {/* Chat Area */}
      <div className="flex-1 flex flex-col">
        {selectedMatch ? (
          <>
            {/* Chat Header */}
            <div className="p-4 border-b border-gray-200 bg-white">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-gray-300 rounded-full flex items-center justify-center">
                  <span className="text-sm font-medium text-gray-700">
                    {selectedMatch.otherUser?.fullName?.charAt(0) || "?"}
                  </span>
                </div>
                <div>
                  <h4 className="font-semibold text-gray-900">
                    {selectedMatch.otherUser?.fullName || "Anonymous"}
                  </h4>
                  <p className="text-sm text-gray-500">{selectedMatch.subject}</p>
                </div>
              </div>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-gray-50">
              {messages.map((message) => (
                <div
                  key={message._id}
                  className={`flex ${
                    message.senderId === selectedMatch.otherUser?.userId ? "justify-start" : "justify-end"
                  }`}
                >
                  <div
                    className={`max-w-xs lg:max-w-md px-4 py-2 rounded-lg ${
                      message.senderId === selectedMatch.otherUser?.userId
                        ? "bg-white text-gray-900"
                        : "bg-blue-600 text-white"
                    }`}
                  >
                    <p className="text-sm">{message.content}</p>
                    <p
                      className={`text-xs mt-1 ${
                        message.senderId === selectedMatch.otherUser?.userId
                          ? "text-gray-500"
                          : "text-blue-100"
                      }`}
                    >
                      {formatTime(message._creationTime)}
                    </p>
                  </div>
                </div>
              ))}
              <div ref={messagesEndRef} />
            </div>

            {/* Message Input */}
            <form onSubmit={handleSendMessage} className="p-4 bg-white border-t border-gray-200">
              <div className="flex space-x-2">
                <input
                  type="text"
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  placeholder="Type a message..."
                  className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
                <button
                  type="submit"
                  disabled={!newMessage.trim()}
                  className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Send
                </button>
              </div>
            </form>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center bg-gray-50">
            <div className="text-center text-gray-500">
              <p className="text-lg">Select a conversation to start messaging</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
