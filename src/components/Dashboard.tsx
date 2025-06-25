import { useState } from "react";
import { useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import { MatchingTab } from "./MatchingTab";
import { MessagesTab } from "./MessagesTab";
import { ForumTab } from "./ForumTab";
import { ResourcesTab } from "./ResourcesTab";
import { ExamsTab } from "./ExamsTab";
import { ProfileTab } from "./ProfileTab";

export function Dashboard() {
  const [activeTab, setActiveTab] = useState("matching");
  const unreadMessages = useQuery(api.messages.getUnreadMessageCount) || 0;
  const unreadNotifications = useQuery(api.notifications.getUnreadNotificationCount) || 0;

  const tabs = [
    { id: "matching", label: "Find Study Partners", icon: "👥" },
    { id: "messages", label: "Messages", icon: "💬", badge: unreadMessages },
    { id: "forum", label: "Discussion Forum", icon: "💭" },
    { id: "resources", label: "Study Resources", icon: "📚" },
    { id: "exams", label: "Exam Tracker", icon: "📅" },
    { id: "profile", label: "Profile", icon: "👤", badge: unreadNotifications },
  ];

  return (
    <div className="flex h-screen bg-gray-50">
      {/* Sidebar */}
      <div className="w-64 bg-white shadow-lg">
        <div className="p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Dashboard</h3>
          <nav className="space-y-2">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`w-full flex items-center justify-between px-4 py-3 text-left rounded-lg transition-colors ${
                  activeTab === tab.id
                    ? "bg-blue-50 text-blue-700 border-l-4 border-blue-700"
                    : "text-gray-600 hover:bg-gray-50"
                }`}
              >
                <div className="flex items-center space-x-3">
                  <span className="text-xl">{tab.icon}</span>
                  <span className="font-medium">{tab.label}</span>
                </div>
                {tab.badge && tab.badge > 0 && (
                  <span className="bg-red-500 text-white text-xs rounded-full px-2 py-1 min-w-[20px] text-center">
                    {tab.badge}
                  </span>
                )}
              </button>
            ))}
          </nav>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 overflow-hidden">
        {activeTab === "matching" && <MatchingTab />}
        {activeTab === "messages" && <MessagesTab />}
        {activeTab === "forum" && <ForumTab />}
        {activeTab === "resources" && <ResourcesTab />}
        {activeTab === "exams" && <ExamsTab />}
        {activeTab === "profile" && <ProfileTab />}
      </div>
    </div>
  );
}
