import { useState } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import { toast } from "sonner";

export function ForumTab() {
  const [showCreatePost, setShowCreatePost] = useState(false);
  const [selectedPost, setSelectedPost] = useState<any>(null);
  const [filters, setFilters] = useState({
    subject: "",
    searchQuery: "",
  });
  const [newPost, setNewPost] = useState({
    title: "",
    content: "",
    subject: "",
    tags: "",
    isAnonymous: false,
  });
  const [newReply, setNewReply] = useState({
    content: "",
    isAnonymous: false,
  });

  const posts = useQuery(api.forum.getForumPosts, filters) || [];
  const replies = useQuery(
    api.forum.getPostReplies,
    selectedPost ? { postId: selectedPost._id } : "skip"
  ) || [];

  const createPost = useMutation(api.forum.createForumPost);
  const createReply = useMutation(api.forum.createReply);
  const voteOnPost = useMutation(api.forum.voteOnPost);

  const handleCreatePost = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await createPost({
        title: newPost.title,
        content: newPost.content,
        subject: newPost.subject,
        tags: newPost.tags.split(",").map(tag => tag.trim()).filter(Boolean),
        isAnonymous: newPost.isAnonymous,
      });
      setNewPost({ title: "", content: "", subject: "", tags: "", isAnonymous: false });
      setShowCreatePost(false);
      toast.success("Post created successfully!");
    } catch (error) {
      toast.error("Failed to create post");
    }
  };

  const handleCreateReply = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPost) return;

    try {
      await createReply({
        postId: selectedPost._id,
        content: newReply.content,
        isAnonymous: newReply.isAnonymous,
      });
      setNewReply({ content: "", isAnonymous: false });
      toast.success("Reply posted!");
    } catch (error) {
      toast.error("Failed to post reply");
    }
  };

  const handleVote = async (postId: string, voteType: "upvote" | "downvote") => {
    try {
      await voteOnPost({ postId: postId as any, voteType });
    } catch (error) {
      toast.error("Failed to vote");
    }
  };

  const formatTime = (timestamp: number) => {
    return new Date(timestamp).toLocaleDateString();
  };

  return (
    <div className="p-6 h-full overflow-y-auto">
      <div className="max-w-4xl mx-auto">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold text-gray-900">Discussion Forum</h2>
          <button
            onClick={() => setShowCreatePost(true)}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            Create Post
          </button>
        </div>

        {/* Filters */}
        <div className="bg-white rounded-lg shadow-md p-4 mb-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <input
              type="text"
              placeholder="Search posts..."
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

        {/* Posts List */}
        <div className="space-y-4">
          {posts.map((post) => (
            <div key={post._id} className="bg-white rounded-lg shadow-md p-6">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <h3 
                    className="text-lg font-semibold text-gray-900 cursor-pointer hover:text-blue-600"
                    onClick={() => setSelectedPost(post)}
                  >
                    {post.title}
                  </h3>
                  <p className="text-gray-600 mt-2 line-clamp-3">{post.content}</p>
                  <div className="flex items-center space-x-4 mt-4 text-sm text-gray-500">
                    <span>By {post.author?.fullName || "Anonymous"}</span>
                    <span>{formatTime(post._creationTime)}</span>
                    <span className="bg-blue-100 text-blue-800 px-2 py-1 rounded-full">
                      {post.subject}
                    </span>
                    <span>{post.replyCount} replies</span>
                  </div>
                  <div className="flex flex-wrap gap-2 mt-2">
                    {post.tags.map((tag, index) => (
                      <span key={index} className="bg-gray-100 text-gray-700 px-2 py-1 rounded text-xs">
                        #{tag}
                      </span>
                    ))}
                  </div>
                </div>
                <div className="flex items-center space-x-2 ml-4">
                  <button
                    onClick={() => handleVote(post._id, "upvote")}
                    className="flex items-center space-x-1 px-2 py-1 text-green-600 hover:bg-green-50 rounded"
                  >
                    <span>👍</span>
                    <span>{post.upvotes}</span>
                  </button>
                  <button
                    onClick={() => handleVote(post._id, "downvote")}
                    className="flex items-center space-x-1 px-2 py-1 text-red-600 hover:bg-red-50 rounded"
                  >
                    <span>👎</span>
                    <span>{post.downvotes}</span>
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Create Post Modal */}
        {showCreatePost && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-6 max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
              <h3 className="text-lg font-semibold mb-4">Create New Post</h3>
              <form onSubmit={handleCreatePost} className="space-y-4">
                <input
                  type="text"
                  placeholder="Post title"
                  value={newPost.title}
                  onChange={(e) => setNewPost(prev => ({ ...prev, title: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
                  required
                />
                <input
                  type="text"
                  placeholder="Subject"
                  value={newPost.subject}
                  onChange={(e) => setNewPost(prev => ({ ...prev, subject: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
                  required
                />
                <textarea
                  placeholder="Write your post content..."
                  value={newPost.content}
                  onChange={(e) => setNewPost(prev => ({ ...prev, content: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
                  rows={6}
                  required
                />
                <input
                  type="text"
                  placeholder="Tags (comma separated)"
                  value={newPost.tags}
                  onChange={(e) => setNewPost(prev => ({ ...prev, tags: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
                />
                <label className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    checked={newPost.isAnonymous}
                    onChange={(e) => setNewPost(prev => ({ ...prev, isAnonymous: e.target.checked }))}
                    className="rounded"
                  />
                  <span className="text-sm text-gray-700">Post anonymously</span>
                </label>
                <div className="flex space-x-3">
                  <button
                    type="submit"
                    className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                  >
                    Create Post
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowCreatePost(false)}
                    className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Post Detail Modal */}
        {selectedPost && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-6 max-w-4xl w-full mx-4 max-h-[90vh] overflow-y-auto">
              <div className="flex justify-between items-start mb-4">
                <h3 className="text-xl font-semibold">{selectedPost.title}</h3>
                <button
                  onClick={() => setSelectedPost(null)}
                  className="text-gray-500 hover:text-gray-700"
                >
                  ✕
                </button>
              </div>
              
              <div className="mb-6">
                <p className="text-gray-800 mb-4">{selectedPost.content}</p>
                <div className="flex items-center space-x-4 text-sm text-gray-500">
                  <span>By {selectedPost.author?.fullName || "Anonymous"}</span>
                  <span>{formatTime(selectedPost._creationTime)}</span>
                  <span className="bg-blue-100 text-blue-800 px-2 py-1 rounded-full">
                    {selectedPost.subject}
                  </span>
                </div>
              </div>

              {/* Replies */}
              <div className="border-t pt-6">
                <h4 className="font-semibold mb-4">Replies ({replies.length})</h4>
                <div className="space-y-4 mb-6">
                  {replies.map((reply) => (
                    <div key={reply._id} className="bg-gray-50 rounded-lg p-4">
                      <p className="text-gray-800 mb-2">{reply.content}</p>
                      <div className="flex items-center justify-between text-sm text-gray-500">
                        <span>By {reply.author?.fullName || "Anonymous"}</span>
                        <span>{formatTime(reply._creationTime)}</span>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Reply Form */}
                <form onSubmit={handleCreateReply} className="space-y-4">
                  <textarea
                    placeholder="Write your reply..."
                    value={newReply.content}
                    onChange={(e) => setNewReply(prev => ({ ...prev, content: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
                    rows={3}
                    required
                  />
                  <div className="flex items-center justify-between">
                    <label className="flex items-center space-x-2">
                      <input
                        type="checkbox"
                        checked={newReply.isAnonymous}
                        onChange={(e) => setNewReply(prev => ({ ...prev, isAnonymous: e.target.checked }))}
                        className="rounded"
                      />
                      <span className="text-sm text-gray-700">Reply anonymously</span>
                    </label>
                    <button
                      type="submit"
                      className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                    >
                      Post Reply
                    </button>
                  </div>
                </form>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
