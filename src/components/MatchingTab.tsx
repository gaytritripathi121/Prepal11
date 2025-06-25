import { useState } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import { toast } from "sonner";

export function MatchingTab() {
  const [filters, setFilters] = useState({
    subject: "",
    university: "",
    urgencyLevel: "",
  });
  const [selectedMatch, setSelectedMatch] = useState<any>(null);
  const [message, setMessage] = useState("");

  const matches = useQuery(api.matching.findMatches, filters) || [];
  const userMatches = useQuery(api.matching.getUserMatches, {}) || [];
  const sendMatchRequest = useMutation(api.matching.sendMatchRequest);
  const respondToMatch = useMutation(api.matching.respondToMatch);

  const handleSendRequest = async () => {
    if (!selectedMatch) return;

    try {
      await sendMatchRequest({
        helperId: selectedMatch.teacherProfile.userId,
        subject: selectedMatch.learningSubject.subject,
        message: message || undefined,
      });
      toast.success("Match request sent!");
      setSelectedMatch(null);
      setMessage("");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to send request");
    }
  };

  const handleResponse = async (matchId: string, response: "accept" | "decline") => {
    try {
      await respondToMatch({ matchId: matchId as any, response });
      toast.success(`Match ${response}ed!`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to respond");
    }
  };

  return (
    <div className="p-6 h-full overflow-y-auto">
      <div className="max-w-6xl mx-auto">
        <h2 className="text-2xl font-bold text-gray-900 mb-6">Find Study Partners</h2>

        {/* Filters */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <h3 className="text-lg font-semibold mb-4">Filter Matches</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Subject</label>
              <input
                type="text"
                value={filters.subject}
                onChange={(e) => setFilters(prev => ({ ...prev, subject: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
                placeholder="e.g., Mathematics"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">University</label>
              <input
                type="text"
                value={filters.university}
                onChange={(e) => setFilters(prev => ({ ...prev, university: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
                placeholder="e.g., MIT"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Urgency</label>
              <select
                value={filters.urgencyLevel}
                onChange={(e) => setFilters(prev => ({ ...prev, urgencyLevel: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
              >
                <option value="">All</option>
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
              </select>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Available Matches */}
          <div className="bg-white rounded-lg shadow-md p-6">
            <h3 className="text-lg font-semibold mb-4">Available Study Partners</h3>
            <div className="space-y-4 max-h-96 overflow-y-auto">
              {matches.map((match, index) => (
                <div key={index} className="border border-gray-200 rounded-lg p-4">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <h4 className="font-semibold text-gray-900">
                        {match.teacherProfile.fullName}
                      </h4>
                      <p className="text-sm text-gray-600">{match.teacherProfile.university}</p>
                      <p className="text-sm text-blue-600 font-medium mt-1">
                        Can teach: {match.teacherSubject.subject}
                      </p>
                      <p className="text-sm text-gray-500">
                        Level: {match.teacherSubject.proficiencyLevel}
                      </p>
                      <div className="flex items-center mt-2">
                        <span className="text-yellow-500">⭐</span>
                        <span className="text-sm text-gray-600 ml-1">
                          {match.teacherProfile.reputation.toFixed(1)} ({match.teacherProfile.totalRatings} reviews)
                        </span>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-sm font-medium text-green-600">
                        {match.compatibilityScore}% match
                      </div>
                      <button
                        onClick={() => setSelectedMatch(match)}
                        className="mt-2 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 text-sm"
                      >
                        Connect
                      </button>
                    </div>
                  </div>
                </div>
              ))}
              {matches.length === 0 && (
                <p className="text-gray-500 text-center py-8">
                  No matches found. Try adjusting your filters.
                </p>
              )}
            </div>
          </div>

          {/* Your Matches */}
          <div className="bg-white rounded-lg shadow-md p-6">
            <h3 className="text-lg font-semibold mb-4">Your Matches</h3>
            <div className="space-y-4 max-h-96 overflow-y-auto">
              {userMatches.map((match) => (
                <div key={match._id} className="border border-gray-200 rounded-lg p-4">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <h4 className="font-semibold text-gray-900">
                        {match.otherUser?.fullName || "Anonymous"}
                      </h4>
                      <p className="text-sm text-gray-600">{match.subject}</p>
                      <p className="text-sm text-gray-500">
                        {match.type === "requested" ? "You requested help" : "They requested your help"}
                      </p>
                      <span className={`inline-block px-2 py-1 rounded-full text-xs font-medium mt-2 ${
                        match.status === "pending" ? "bg-yellow-100 text-yellow-800" :
                        match.status === "accepted" ? "bg-green-100 text-green-800" :
                        match.status === "declined" ? "bg-red-100 text-red-800" :
                        "bg-gray-100 text-gray-800"
                      }`}>
                        {match.status}
                      </span>
                    </div>
                    {match.status === "pending" && match.type === "helping" && (
                      <div className="flex space-x-2">
                        <button
                          onClick={() => handleResponse(match._id, "accept")}
                          className="px-3 py-1 bg-green-600 text-white rounded text-sm hover:bg-green-700"
                        >
                          Accept
                        </button>
                        <button
                          onClick={() => handleResponse(match._id, "decline")}
                          className="px-3 py-1 bg-red-600 text-white rounded text-sm hover:bg-red-700"
                        >
                          Decline
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              ))}
              {userMatches.length === 0 && (
                <p className="text-gray-500 text-center py-8">
                  No matches yet. Start connecting with study partners!
                </p>
              )}
            </div>
          </div>
        </div>

        {/* Match Request Modal */}
        {selectedMatch && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
              <h3 className="text-lg font-semibold mb-4">Send Match Request</h3>
              <p className="text-gray-600 mb-4">
                Send a request to {selectedMatch.teacherProfile.fullName} to learn {selectedMatch.learningSubject.subject}
              </p>
              <textarea
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="Add a personal message (optional)"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 mb-4"
                rows={3}
              />
              <div className="flex space-x-3">
                <button
                  onClick={handleSendRequest}
                  className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                >
                  Send Request
                </button>
                <button
                  onClick={() => setSelectedMatch(null)}
                  className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
