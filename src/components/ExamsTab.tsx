import { useState } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import { toast } from "sonner";

export function ExamsTab() {
  const [showAddExam, setShowAddExam] = useState(false);
  const [newExam, setNewExam] = useState({
    examName: "",
    subject: "",
    examDate: "",
    description: "",
  });

  const exams = useQuery(api.exams.getUserExams) || [];
  const upcomingExams = useQuery(api.exams.getUpcomingExams) || [];
  const addExam = useMutation(api.exams.addExam);
  const updateExam = useMutation(api.exams.updateExam);
  const deleteExam = useMutation(api.exams.deleteExam);

  const handleAddExam = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await addExam({
        examName: newExam.examName,
        subject: newExam.subject,
        examDate: new Date(newExam.examDate).getTime(),
        description: newExam.description || undefined,
      });
      setNewExam({ examName: "", subject: "", examDate: "", description: "" });
      setShowAddExam(false);
      toast.success("Exam added successfully!");
    } catch (error) {
      toast.error("Failed to add exam");
    }
  };

  const handleToggleComplete = async (examId: string, isCompleted: boolean) => {
    try {
      await updateExam({ examId: examId as any, isCompleted: !isCompleted });
      toast.success(isCompleted ? "Exam marked as incomplete" : "Exam marked as complete!");
    } catch (error) {
      toast.error("Failed to update exam");
    }
  };

  const handleDeleteExam = async (examId: string) => {
    if (confirm("Are you sure you want to delete this exam?")) {
      try {
        await deleteExam({ examId: examId as any });
        toast.success("Exam deleted successfully!");
      } catch (error) {
        toast.error("Failed to delete exam");
      }
    }
  };

  const formatDate = (timestamp: number) => {
    return new Date(timestamp).toLocaleDateString();
  };

  const getDaysUntil = (timestamp: number) => {
    const now = new Date().getTime();
    const diff = timestamp - now;
    const days = Math.ceil(diff / (1000 * 60 * 60 * 24));
    return days;
  };

  const getUrgencyColor = (days: number) => {
    if (days < 0) return "text-gray-500";
    if (days <= 3) return "text-red-600";
    if (days <= 7) return "text-orange-600";
    if (days <= 14) return "text-yellow-600";
    return "text-green-600";
  };

  return (
    <div className="p-6 h-full overflow-y-auto">
      <div className="max-w-4xl mx-auto">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold text-gray-900">Exam Tracker</h2>
          <button
            onClick={() => setShowAddExam(true)}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            Add Exam
          </button>
        </div>

        {/* Upcoming Exams Alert */}
        {upcomingExams.length > 0 && (
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6">
            <h3 className="text-lg font-semibold text-yellow-800 mb-2">
              🚨 Upcoming Exams (Next 30 Days)
            </h3>
            <div className="space-y-2">
              {upcomingExams.slice(0, 3).map((exam) => (
                <div key={exam._id} className="flex justify-between items-center">
                  <span className="text-yellow-700">
                    {exam.examName} - {exam.subject}
                  </span>
                  <span className={`font-semibold ${getUrgencyColor(getDaysUntil(exam.examDate))}`}>
                    {getDaysUntil(exam.examDate) === 0 ? "Today!" : 
                     getDaysUntil(exam.examDate) === 1 ? "Tomorrow!" :
                     `${getDaysUntil(exam.examDate)} days`}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Exams List */}
        <div className="bg-white rounded-lg shadow-md">
          <div className="p-6">
            <h3 className="text-lg font-semibold mb-4">All Exams</h3>
            <div className="space-y-4">
              {exams.map((exam) => {
                const daysUntil = getDaysUntil(exam.examDate);
                return (
                  <div
                    key={exam._id}
                    className={`border rounded-lg p-4 ${
                      exam.isCompleted ? "bg-green-50 border-green-200" : "border-gray-200"
                    }`}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center space-x-3">
                          <input
                            type="checkbox"
                            checked={exam.isCompleted}
                            onChange={() => handleToggleComplete(exam._id, exam.isCompleted)}
                            className="w-5 h-5 text-green-600 rounded focus:ring-green-500"
                          />
                          <div>
                            <h4 className={`font-semibold ${
                              exam.isCompleted ? "text-green-800 line-through" : "text-gray-900"
                            }`}>
                              {exam.examName}
                            </h4>
                            <p className="text-sm text-gray-600">{exam.subject}</p>
                            {exam.description && (
                              <p className="text-sm text-gray-500 mt-1">{exam.description}</p>
                            )}
                          </div>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-sm text-gray-600">{formatDate(exam.examDate)}</p>
                        {!exam.isCompleted && (
                          <p className={`text-sm font-semibold ${getUrgencyColor(daysUntil)}`}>
                            {daysUntil < 0 ? `${Math.abs(daysUntil)} days ago` :
                             daysUntil === 0 ? "Today!" :
                             daysUntil === 1 ? "Tomorrow!" :
                             `${daysUntil} days left`}
                          </p>
                        )}
                        <button
                          onClick={() => handleDeleteExam(exam._id)}
                          className="text-red-600 hover:text-red-800 text-sm mt-1"
                        >
                          Delete
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
              {exams.length === 0 && (
                <p className="text-gray-500 text-center py-8">
                  No exams added yet. Click "Add Exam" to get started!
                </p>
              )}
            </div>
          </div>
        </div>

        {/* Add Exam Modal */}
        {showAddExam && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
              <h3 className="text-lg font-semibold mb-4">Add New Exam</h3>
              <form onSubmit={handleAddExam} className="space-y-4">
                <input
                  type="text"
                  placeholder="Exam name"
                  value={newExam.examName}
                  onChange={(e) => setNewExam(prev => ({ ...prev, examName: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
                  required
                />
                <input
                  type="text"
                  placeholder="Subject"
                  value={newExam.subject}
                  onChange={(e) => setNewExam(prev => ({ ...prev, subject: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
                  required
                />
                <input
                  type="date"
                  value={newExam.examDate}
                  onChange={(e) => setNewExam(prev => ({ ...prev, examDate: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
                  required
                />
                <textarea
                  placeholder="Description (optional)"
                  value={newExam.description}
                  onChange={(e) => setNewExam(prev => ({ ...prev, description: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
                  rows={3}
                />
                <div className="flex space-x-3">
                  <button
                    type="submit"
                    className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                  >
                    Add Exam
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowAddExam(false)}
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
