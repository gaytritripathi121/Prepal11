import { useState } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import { toast } from "sonner";

export function ProfileTab() {
  const [activeSection, setActiveSection] = useState("profile");
  const [showAddSubject, setShowAddSubject] = useState(false);
  const [newSubject, setNewSubject] = useState({
    subject: "",
    type: "learn" as "teach" | "learn",
    proficiencyLevel: "beginner" as "beginner" | "intermediate" | "advanced",
    urgencyLevel: "medium" as "low" | "medium" | "high",
    examDate: "",
    tags: "",
  });

  const userProfile = useQuery(api.users.getCurrentUserProfile);
  const userSubjects = useQuery(api.users.getUserSubjects, {}) || [];
  const notifications = useQuery(api.notifications.getUserNotifications, {}) || [];
  const leaderboard = useQuery(api.users.getLeaderboard, {}) || [];

  const addSubject = useMutation(api.users.addOrUpdateSubject);
  const removeSubject = useMutation(api.users.removeSubject);
  const markNotificationAsRead = useMutation(api.notifications.markNotificationAsRead);
  const markAllAsRead = useMutation(api.notifications.markAllNotificationsAsRead);

  const handleAddSubject = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await addSubject({
        subject: newSubject.subject,
        type: newSubject.type,
        proficiencyLevel: newSubject.proficiencyLevel,
        urgencyLevel: newSubject.urgencyLevel,
        examDate: newSubject.examDate ? new Date(newSubject.examDate).getTime() : undefined,
        tags: newSubject.tags.split(",").map(tag => tag.trim()).filter(Boolean),
      });
      setNewSubject({
        subject: "",
        type: "learn",
        proficiencyLevel: "beginner",
        urgencyLevel: "medium",
        examDate: "",
        tags: "",
      });
      setShowAddSubject(false);
      toast.success("Subject added successfully!");
    } catch (error) {
      toast.error("Failed to add subject");
    }
  };

  const handleRemoveSubject = async (subjectId: string) => {
    try {
      await removeSubject({ subjectId: subjectId as any });
      toast.success("Subject removed!");
    } catch (error) {
      toast.error("Failed to remove subject");
    }
  };

  const handleMarkAsRead = async (notificationId: string) => {
    try {
      await markNotificationAsRead({ notificationId: notificationId as any });
    } catch (error) {
      toast.error("Failed to mark as read");
    }
  };

  const handleMarkAllAsRead = async () => {
    try {
      await markAllAsRead();
      toast.success("All notifications marked as read!");
    } catch (error) {
      toast.error("Failed to mark all as read");
    }
  };

  const formatTime = (timestamp: number) => {
    return new Date(timestamp).toLocaleDateString();
  };

  const sections = [
    { id: "profile", label: "Profile", icon: "👤" },
    { id: "subjects", label: "My Subjects", icon: "📚" },
    { id: "notifications", label: "Notifications", icon: "🔔" },
    { id: "leaderboard", label: "Leaderboard", icon: "🏆" },
  ];

  return (
    <div className="p-6 h-full overflow-y-auto">
      <div className="max-w-6xl mx-auto">
        <h2 className="text-2xl font-bold text-gray-900 mb-6">Profile & Settings</h2>

        {/* Section Navigation */}
        <div className="bg-white rounded-lg shadow-md mb-6">
          <div className="flex border-b border-gray-200">
            {sections.map((section) => (
              <button
                key={section.id}
                onClick={() => setActiveSection(section.id)}
                className={`flex items-center space-x-2 px-6 py-4 font-medium transition-colors ${
                  activeSection === section.id
                    ? "text-blue-600 border-b-2 border-blue-600"
                    : "text-gray-600 hover:text-gray-900"
                }`}
              >
                <span>{section.icon}</span>
                <span>{section.label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Profile Section */}
        {activeSection === "profile" && (
          <div className="bg-white rounded-lg shadow-md p-6">
            <h3 className="text-lg font-semibold mb-4">Profile Information</h3>
            {userProfile?.profile ? (
              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Full Name</label>
                    <p className="mt-1 text-gray-900">{userProfile.profile.fullName}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Username</label>
                    <p className="mt-1 text-gray-900">@{userProfile.profile.username}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">University</label>
                    <p className="mt-1 text-gray-900">{userProfile.profile.university}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Year of Study</label>
                    <p className="mt-1 text-gray-900">{userProfile.profile.yearOfStudy}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">State/Region</label>
                    <p className="mt-1 text-gray-900">{userProfile.profile.stateRegion}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Student ID</label>
                    <p className="mt-1 text-gray-900">{userProfile.profile.studentId}</p>
                  </div>
                </div>
                {userProfile.profile.bio && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Bio</label>
                    <p className="mt-1 text-gray-900">{userProfile.profile.bio}</p>
                  </div>
                )}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-4 border-t">
                  <div className="text-center">
                    <div className="text-2xl font-bold text-blue-600">{userProfile.profile.points}</div>
                    <div className="text-sm text-gray-600">Points</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-green-600">
                      {userProfile.profile.reputation.toFixed(1)}
                    </div>
                    <div className="text-sm text-gray-600">Rating</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-purple-600">{userProfile.profile.totalRatings}</div>
                    <div className="text-sm text-gray-600">Reviews</div>
                  </div>
                </div>
              </div>
            ) : (
              <p className="text-gray-500">Profile not found</p>
            )}
          </div>
        )}

        {/* Subjects Section */}
        {activeSection === "subjects" && (
          <div className="space-y-6">
            <div className="flex justify-between items-center">
              <h3 className="text-lg font-semibold">My Subjects</h3>
              <button
                onClick={() => setShowAddSubject(true)}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                Add Subject
              </button>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Teaching Subjects */}
              <div className="bg-white rounded-lg shadow-md p-6">
                <h4 className="font-semibold text-green-700 mb-4">📚 Teaching</h4>
                <div className="space-y-3">
                  {userSubjects.filter(s => s.type === "teach").map((subject) => (
                    <div key={subject._id} className="border border-gray-200 rounded-lg p-3">
                      <div className="flex justify-between items-start">
                        <div className="flex-1">
                          <h5 className="font-medium text-gray-900">{subject.subject}</h5>
                          <p className="text-sm text-gray-600">
                            Level: {subject.proficiencyLevel} • Urgency: {subject.urgencyLevel}
                          </p>
                          {subject.tags.length > 0 && (
                            <div className="flex flex-wrap gap-1 mt-2">
                              {subject.tags.map((tag, index) => (
                                <span key={index} className="bg-green-100 text-green-800 px-2 py-1 rounded text-xs">
                                  #{tag}
                                </span>
                              ))}
                            </div>
                          )}
                        </div>
                        <button
                          onClick={() => handleRemoveSubject(subject._id)}
                          className="text-red-600 hover:text-red-800 text-sm"
                        >
                          Remove
                        </button>
                      </div>
                    </div>
                  ))}
                  {userSubjects.filter(s => s.type === "teach").length === 0 && (
                    <p className="text-gray-500 text-center py-4">No teaching subjects yet</p>
                  )}
                </div>
              </div>

              {/* Learning Subjects */}
              <div className="bg-white rounded-lg shadow-md p-6">
                <h4 className="font-semibold text-blue-700 mb-4">🎓 Learning</h4>
                <div className="space-y-3">
                  {userSubjects.filter(s => s.type === "learn").map((subject) => (
                    <div key={subject._id} className="border border-gray-200 rounded-lg p-3">
                      <div className="flex justify-between items-start">
                        <div className="flex-1">
                          <h5 className="font-medium text-gray-900">{subject.subject}</h5>
                          <p className="text-sm text-gray-600">
                            Level: {subject.proficiencyLevel} • Urgency: {subject.urgencyLevel}
                          </p>
                          {subject.examDate && (
                            <p className="text-sm text-orange-600">
                              Exam: {formatTime(subject.examDate)}
                            </p>
                          )}
                          {subject.tags.length > 0 && (
                            <div className="flex flex-wrap gap-1 mt-2">
                              {subject.tags.map((tag, index) => (
                                <span key={index} className="bg-blue-100 text-blue-800 px-2 py-1 rounded text-xs">
                                  #{tag}
                                </span>
                              ))}
                            </div>
                          )}
                        </div>
                        <button
                          onClick={() => handleRemoveSubject(subject._id)}
                          className="text-red-600 hover:text-red-800 text-sm"
                        >
                          Remove
                        </button>
                      </div>
                    </div>
                  ))}
                  {userSubjects.filter(s => s.type === "learn").length === 0 && (
                    <p className="text-gray-500 text-center py-4">No learning subjects yet</p>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Notifications Section */}
        {activeSection === "notifications" && (
          <div className="bg-white rounded-lg shadow-md p-6">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold">Notifications</h3>
              {notifications.some(n => !n.isRead) && (
                <button
                  onClick={handleMarkAllAsRead}
                  className="text-blue-600 hover:text-blue-800 text-sm"
                >
                  Mark all as read
                </button>
              )}
            </div>
            <div className="space-y-3 max-h-96 overflow-y-auto">
              {notifications.map((notification) => (
                <div
                  key={notification._id}
                  className={`border rounded-lg p-4 ${
                    notification.isRead ? "bg-gray-50" : "bg-blue-50 border-blue-200"
                  }`}
                >
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <h4 className="font-medium text-gray-900">{notification.title}</h4>
                      <p className="text-sm text-gray-600 mt-1">{notification.message}</p>
                      <p className="text-xs text-gray-500 mt-2">
                        {formatTime(notification._creationTime)}
                      </p>
                    </div>
                    {!notification.isRead && (
                      <button
                        onClick={() => handleMarkAsRead(notification._id)}
                        className="text-blue-600 hover:text-blue-800 text-sm"
                      >
                        Mark as read
                      </button>
                    )}
                  </div>
                </div>
              ))}
              {notifications.length === 0 && (
                <p className="text-gray-500 text-center py-8">No notifications yet</p>
              )}
            </div>
          </div>
        )}

        {/* Leaderboard Section */}
        {activeSection === "leaderboard" && (
          <div className="bg-white rounded-lg shadow-md p-6">
            <h3 className="text-lg font-semibold mb-4">🏆 Top Contributors</h3>
            <div className="space-y-3">
              {leaderboard.map((user, index) => (
                <div key={user._id} className="flex items-center space-x-4 p-3 border border-gray-200 rounded-lg">
                  <div className="flex-shrink-0">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center text-white font-bold ${
                      index === 0 ? "bg-yellow-500" :
                      index === 1 ? "bg-gray-400" :
                      index === 2 ? "bg-orange-500" :
                      "bg-blue-500"
                    }`}>
                      {index + 1}
                    </div>
                  </div>
                  <div className="flex-1">
                    <h4 className="font-medium text-gray-900">{user.fullName}</h4>
                    <p className="text-sm text-gray-600">{user.university}</p>
                  </div>
                  <div className="text-right">
                    <div className="font-bold text-blue-600">{user.points} pts</div>
                    <div className="text-sm text-gray-500">
                      ⭐ {user.reputation.toFixed(1)} ({user.totalRatings})
                    </div>
                  </div>
                </div>
              ))}
              {leaderboard.length === 0 && (
                <p className="text-gray-500 text-center py-8">No contributors yet</p>
              )}
            </div>
          </div>
        )}

        {/* Add Subject Modal */}
        {showAddSubject && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
              <h3 className="text-lg font-semibold mb-4">Add Subject</h3>
              <form onSubmit={handleAddSubject} className="space-y-4">
                <input
                  type="text"
                  placeholder="Subject name"
                  value={newSubject.subject}
                  onChange={(e) => setNewSubject(prev => ({ ...prev, subject: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
                  required
                />
                <select
                  value={newSubject.type}
                  onChange={(e) => setNewSubject(prev => ({ ...prev, type: e.target.value as "teach" | "learn" }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
                >
                  <option value="learn">Want to Learn</option>
                  <option value="teach">Can Teach</option>
                </select>
                <select
                  value={newSubject.proficiencyLevel}
                  onChange={(e) => setNewSubject(prev => ({ ...prev, proficiencyLevel: e.target.value as any }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
                >
                  <option value="beginner">Beginner</option>
                  <option value="intermediate">Intermediate</option>
                  <option value="advanced">Advanced</option>
                </select>
                <select
                  value={newSubject.urgencyLevel}
                  onChange={(e) => setNewSubject(prev => ({ ...prev, urgencyLevel: e.target.value as any }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
                >
                  <option value="low">Low Urgency</option>
                  <option value="medium">Medium Urgency</option>
                  <option value="high">High Urgency</option>
                </select>
                {newSubject.type === "learn" && (
                  <input
                    type="date"
                    placeholder="Exam date (optional)"
                    value={newSubject.examDate}
                    onChange={(e) => setNewSubject(prev => ({ ...prev, examDate: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
                  />
                )}
                <input
                  type="text"
                  placeholder="Tags (comma separated)"
                  value={newSubject.tags}
                  onChange={(e) => setNewSubject(prev => ({ ...prev, tags: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
                />
                <div className="flex space-x-3">
                  <button
                    type="submit"
                    className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                  >
                    Add Subject
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowAddSubject(false)}
                    className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
