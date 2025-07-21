import { useQuery, useMutation } from "@tanstack/react-query";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { queryClient } from "@/lib/queryClient";
import { Heart, MessageCircle, Users, Send } from "lucide-react";
import { useState } from "react";
import { apiRequest } from "@/lib/queryClient";

interface CommunityPost {
  id: number;
  userId: number;
  content: string;
  likes: number;
  comments: number;
  createdAt: string;
  username: string;
}

export default function Community() {
  const [newPost, setNewPost] = useState("");

  const { data: posts = [] } = useQuery<CommunityPost[]>({
    queryKey: ["/api/community/posts"],
    queryFn: async () => {
      const res = await fetch("/api/community/posts?limit=20");
      return res.json();
    }
  });

  const createPostMutation = useMutation({
    mutationFn: async (content: string) => {
      return await apiRequest("POST", "/api/community/posts", { content });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/community/posts"] });
      setNewPost("");
    },
    onError: (error) => {
      console.error('Failed to create post:', error);
    }
  });

  const likePostMutation = useMutation({
    mutationFn: async (postId: number) => {
      return await apiRequest("POST", `/api/community/posts/${postId}/like`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/community/posts"] });
    }
  });

  const handleSubmitPost = () => {
    if (newPost.trim() && newPost.length >= 10 && newPost.length <= 500) {
      createPostMutation.mutate(newPost.trim());
    }
  };

  const formatTimeAgo = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInMinutes = Math.floor((now.getTime() - date.getTime()) / (1000 * 60));
    
    if (diffInMinutes < 1) return 'Just now';
    if (diffInMinutes < 60) return `${diffInMinutes}m ago`;
    if (diffInMinutes < 1440) return `${Math.floor(diffInMinutes / 60)}h ago`;
    return `${Math.floor(diffInMinutes / 1440)}d ago`;
  };

  return (
    <div className="px-4 py-6 pt-20 space-y-6 animate-fade-in">
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center space-x-2">
            <Users className="text-[var(--lunar-accent)]" size={24} />
            <div>
              <h1 className="text-2xl font-bold">Community</h1>
              <p className="text-[var(--lunar)]/70">Connect with fellow mood trackers</p>
            </div>
          </div>
        </div>

        {/* Create Post */}
        <Card className="glassmorphism border-[var(--lunar)]/20 p-6 mb-6">
          <h3 className="text-lg font-semibold mb-4">Share Your Journey</h3>
          <div className="space-y-4">
            <Textarea
              value={newPost}
              onChange={(e) => setNewPost(e.target.value)}
              placeholder="Share your mood insights, lunar observations, or encourage others on their wellness journey..."
              className="bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white placeholder:text-slate-500 dark:placeholder:text-slate-400 min-h-[100px]"
            />
            <div className="flex justify-between items-center">
              <div className="text-sm">
                <span className={`${newPost.length < 10 ? 'text-red-400' : newPost.length > 450 ? 'text-yellow-400' : 'text-[var(--lunar)]/60'}`}>
                  {newPost.length}/500 characters
                </span>
                {newPost.length < 10 && newPost.length > 0 && (
                  <span className="text-xs text-red-400 block">Minimum 10 characters required</span>
                )}
              </div>
              <Button 
                onClick={handleSubmitPost}
                disabled={!newPost.trim() || newPost.length < 10 || newPost.length > 500 || createPostMutation.isPending}
                className="bg-[var(--lunar-accent)] hover:bg-[var(--lunar-accent)]/80"
              >
                <Send size={16} className="mr-2" />
                {createPostMutation.isPending ? "Posting..." : "Post"}
              </Button>
            </div>
          </div>
        </Card>

        {/* Community Posts */}
        <div className="space-y-4">
          {posts.length === 0 ? (
            <Card className="glassmorphism border-[var(--lunar)]/20 p-8 text-center">
              <Users className="mx-auto mb-4 text-[var(--lunar)]/40" size={48} />
              <h3 className="text-lg font-medium mb-2">No posts yet</h3>
              <p className="text-[var(--lunar)]/60">
                Be the first to share your mood tracking journey with the community!
              </p>
            </Card>
          ) : (
            posts.map((post) => (
              <Card key={post.id} className="glassmorphism border-[var(--lunar)]/20 p-6">
                <div className="flex items-center space-x-3 mb-4">
                  <div className="w-10 h-10 rounded-full bg-[var(--lunar-accent)] flex items-center justify-center">
                    <Users size={16} />
                  </div>
                  <div>
                    <p className="font-medium text-sm">{post.username}</p>
                    <p className="text-xs text-[var(--lunar)]/60">{formatTimeAgo(post.createdAt)}</p>
                  </div>
                </div>
                
                <p className="text-[var(--lunar)]/90 mb-4 leading-relaxed">
                  {post.content}
                </p>
                
                <div className="flex items-center space-x-6 text-xs text-[var(--lunar)]/60">
                  <button 
                    onClick={() => likePostMutation.mutate(post.id)}
                    disabled={likePostMutation.isPending}
                    className="flex items-center space-x-1 hover:text-red-400 transition-colors"
                  >
                    <Heart size={14} />
                    <span>{post.likes}</span>
                  </button>
                  <button className="flex items-center space-x-1 hover:text-[var(--lunar-accent)] transition-colors">
                    <MessageCircle size={14} />
                    <span>{post.comments}</span>
                  </button>
                </div>
              </Card>
            ))
          )}
        </div>

        {/* Community Guidelines */}
        <Card className="glassmorphism border-[var(--lunar)]/20 p-6 mt-8">
          <h3 className="text-lg font-semibold mb-4">Community Guidelines</h3>
          <div className="space-y-2 text-sm text-[var(--lunar)]/70">
            <p>• Be kind and supportive to fellow community members</p>
            <p>• Share your genuine experiences and insights</p>
            <p>• Respect privacy - avoid sharing personal identifying information</p>
            <p>• Focus on wellness, growth, and positive support</p>
            <p>• Keep discussions related to mood tracking and lunar observations</p>
          </div>
        </Card>
      </div>
    </div>
  );
}
