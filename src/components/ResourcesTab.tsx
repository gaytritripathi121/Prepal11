import { useState } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import { toast } from "sonner";

export function ResourcesTab() {
  const [showUpload, setShowUpload] = useState(false);
  const [filters, setFilters] = useState({
    subject: "",
    searchQuery: "",
  });
  const [uploadData, setUploadData] = useState({
    title: "",
    description: "",
    subject: "",
    yearOfStudy: "",
    tags: "",
    isPublic: true,
  });
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);

  const resources = useQuery(api.resources.getResources, filters) || [];
  const userResources = useQuery(api.resources.getUserResources) || [];
  const uploadResource = useMutation(api.resources.uploadResource);
  const generateUploadUrl = useMutation(api.messages.generateUploadUrl);
  const downloadResource = useMutation(api.resources.downloadResource);

  const handleFileUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedFile) return;

    setIsUploading(true);
    try {
      // Get upload URL
      const uploadUrl = await generateUploadUrl();
      
      // Upload file
      const result = await fetch(uploadUrl, {
        method: "POST",
        headers: { "Content-Type": selectedFile.type },
        body: selectedFile,
      });
      
      if (!result.ok) throw new Error("Upload failed");
      
      const { storageId } = await result.json();

      // Save resource metadata
      await uploadResource({
        title: uploadData.title,
        description: uploadData.description,
        subject: uploadData.subject,
        fileId: storageId,
        fileType: selectedFile.type,
        yearOfStudy: uploadData.yearOfStudy || undefined,
        tags: uploadData.tags.split(",").map(tag => tag.trim()).filter(Boolean),
        isPublic: uploadData.isPublic,
      });

      setUploadData({
        title: "",
        description: "",
        subject: "",
        yearOfStudy: "",
        tags: "",
        isPublic: true,
      });
      setSelectedFile(null);
      setShowUpload(false);
      toast.success("Resource uploaded successfully!");
    } catch (error) {
      toast.error("Failed to upload resource");
    } finally {
      setIsUploading(false);
    }
  };

  const handleDownload = async (resourceId: string, title: string) => {
    try {
      const downloadUrl = await downloadResource({ resourceId: resourceId as any });
      if (downloadUrl) {
        const link = document.createElement("a");
        link.href = downloadUrl;
        link.download = title;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      }
    } catch (error) {
      toast.error("Failed to download resource");
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return "0 Bytes";
    const k = 1024;
    const sizes = ["Bytes", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
  };

  return (
    <div className="p-6 h-full overflow-y-auto">
      <div className="max-w-6xl mx-auto">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold text-gray-900">Study Resources</h2>
          <button
            onClick={() => setShowUpload(true)}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            Upload Resource
          </button>
        </div>

        {/* Filters */}
        <div className="bg-white rounded-lg shadow-md p-4 mb-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <input
              type="text"
              placeholder="Search resources..."
              value={filters.searchQuery}
              onChange={(e) => setFilters(prev => ({ ...prev, searchQuery: e.target.value }))}
              className="px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
            />
            <input
              type="text"
              placeholder="Filter by subject..."
              value={filters.subject}
              onChange={(e) => setFilters(prev => ({ ...prev, subject: e.target.value }))}
              className="px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Public Resources */}
          <div className="bg-white rounded-lg shadow-md p-6">
            <h3 className="text-lg font-semibold mb-4">Public Resources</h3>
            <div className="space-y-4 max-h-96 overflow-y-auto">
              {resources.map((resource) => (
                <div key={resource._id} className="border border-gray-200 rounded-lg p-4">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <h4 className="font-semibold text-gray-900">{resource.title}</h4>
                      <p className="text-sm text-gray-600 mt-1">{resource.description}</p>
                      <div className="flex items-center space-x-4 mt-2 text-sm text-gray-500">
                        <span className="bg-blue-100 text-blue-800 px-2 py-1 rounded-full">
                          {resource.subject}
                        </span>
                        {resource.yearOfStudy && (
                          <span className="bg-green-100 text-green-800 px-2 py-1 rounded-full">
                            Year {resource.yearOfStudy}
                          </span>
                        )}
                        <span>📥 {resource.downloads}</span>
                      </div>
                      <div className="flex flex-wrap gap-1 mt-2">
                        {resource.tags.map((tag, index) => (
                          <span key={index} className="bg-gray-100 text-gray-700 px-2 py-1 rounded text-xs">
                            #{tag}
                          </span>
                        ))}
                      </div>
                      <p className="text-xs text-gray-500 mt-2">
                        By {resource.uploader?.fullName} • {resource.university}
                      </p>
                    </div>
                    <button
                      onClick={() => handleDownload(resource._id, resource.title)}
                      className="ml-4 px-3 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 text-sm"
                    >
                      Download
                    </button>
                  </div>
                </div>
              ))}
              {resources.length === 0 && (
                <p className="text-gray-500 text-center py-8">
                  No resources found. Try adjusting your filters.
                </p>
              )}
            </div>
          </div>

          {/* Your Resources */}
          <div className="bg-white rounded-lg shadow-md p-6">
            <h3 className="text-lg font-semibold mb-4">Your Resources</h3>
            <div className="space-y-4 max-h-96 overflow-y-auto">
              {userResources.map((resource) => (
                <div key={resource._id} className="border border-gray-200 rounded-lg p-4">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <h4 className="font-semibold text-gray-900">{resource.title}</h4>
                      <p className="text-sm text-gray-600 mt-1">{resource.description}</p>
                      <div className="flex items-center space-x-4 mt-2 text-sm text-gray-500">
                        <span className="bg-blue-100 text-blue-800 px-2 py-1 rounded-full">
                          {resource.subject}
                        </span>
                        <span>📥 {resource.downloads}</span>
                        <span className={`px-2 py-1 rounded-full text-xs ${
                          resource.isPublic 
                            ? "bg-green-100 text-green-800" 
                            : "bg-yellow-100 text-yellow-800"
                        }`}>
                          {resource.isPublic ? "Public" : "Private"}
                        </span>
                      </div>
                    </div>
                    <button
                      onClick={() => handleDownload(resource._id, resource.title)}
                      className="ml-4 px-3 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 text-sm"
                    >
                      Download
                    </button>
                  </div>
                </div>
              ))}
              {userResources.length === 0 && (
                <p className="text-gray-500 text-center py-8">
                  You haven't uploaded any resources yet.
                </p>
              )}
            </div>
          </div>
        </div>

        {/* Upload Modal */}
        {showUpload && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-6 max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
              <h3 className="text-lg font-semibold mb-4">Upload Resource</h3>
              <form onSubmit={handleFileUpload} className="space-y-4">
                <input
                  type="text"
                  placeholder="Resource title"
                  value={uploadData.title}
                  onChange={(e) => setUploadData(prev => ({ ...prev, title: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
                  required
                />
                <textarea
                  placeholder="Description"
                  value={uploadData.description}
                  onChange={(e) => setUploadData(prev => ({ ...prev, description: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
                  rows={3}
                  required
                />
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <input
                    type="text"
                    placeholder="Subject"
                    value={uploadData.subject}
                    onChange={(e) => setUploadData(prev => ({ ...prev, subject: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
                    required
                  />
                  <input
                    type="text"
                    placeholder="Year of study (optional)"
                    value={uploadData.yearOfStudy}
                    onChange={(e) => setUploadData(prev => ({ ...prev, yearOfStudy: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <input
                  type="text"
                  placeholder="Tags (comma separated)"
                  value={uploadData.tags}
                  onChange={(e) => setUploadData(prev => ({ ...prev, tags: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
                />
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Select File
                  </label>
                  <input
                    type="file"
                    onChange={(e) => setSelectedFile(e.target.files?.[0] || null)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
                    required
                  />
                  {selectedFile && (
                    <p className="text-sm text-gray-500 mt-1">
                      Selected: {selectedFile.name} ({formatFileSize(selectedFile.size)})
                    </p>
                  )}
                </div>
                <label className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    checked={uploadData.isPublic}
                    onChange={(e) => setUploadData(prev => ({ ...prev, isPublic: e.target.checked }))}
                    className="rounded"
                  />
                  <span className="text-sm text-gray-700">Make this resource public</span>
                </label>
                <div className="flex space-x-3">
                  <button
                    type="submit"
                    disabled={isUploading}
                    className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
                  >
                    {isUploading ? "Uploading..." : "Upload Resource"}
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowUpload(false)}
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
