import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Edit, Trash2, MapPin, Clock, DollarSign } from 'lucide-react';
import { ExchangePost } from '@/types';
import { useAuth } from '@/contexts/AuthContext';
import { collection, query, where, orderBy, onSnapshot, deleteDoc, doc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { formatTimeAgo } from '@/utils/timeUtils';
import { toast } from 'react-hot-toast';

interface MyPostsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onEditPost?: (post: ExchangePost) => void;
}

export function MyPostsModal({ isOpen, onClose, onEditPost }: MyPostsModalProps) {
  const { user } = useAuth();
  const [userPosts, setUserPosts] = useState<ExchangePost[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user || !isOpen) return;

    const postsQuery = query(
      collection(db, 'posts'),
      where('userId', '==', user.uid),
      where('status', 'in', ['active', 'matched'])
    );

    const unsubscribe = onSnapshot(postsQuery, (snapshot) => {
      const posts: ExchangePost[] = [];
      snapshot.forEach((doc) => {
        const data = doc.data();
        posts.push({
          id: doc.id,
          ...data,
          timestamp: data.timestamp?.toDate() || new Date(),
        } as ExchangePost);
      });
      // Sort posts by timestamp on client side
      posts.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
      setUserPosts(posts);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [user, isOpen]);

  const handleDeletePost = async (postId: string) => {
    const confirmed = window.confirm(
      'Delete Exchange Post?\n\nThis action cannot be undone. Your exchange request will be permanently removed.'
    );

    if (confirmed) {
      try {
        await deleteDoc(doc(db, 'posts', postId));
        toast.success('Exchange post deleted successfully');
      } catch (error) {
        console.error('Error deleting post:', error);
        toast.error('Failed to delete post');
      }
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active':
        return 'bg-green-500';
      case 'matched':
        return 'bg-blue-500';
      case 'completed':
        return 'bg-gray-500';
      default:
        return 'bg-gray-400';
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="w-[90vw] max-w-md sm:max-w-2xl glass-effect border-white/20 bg-blue-900/95 max-h-[85vh] flex flex-col p-4">
        <DialogHeader>
          <DialogTitle className="text-white text-xl">My Exchange Posts</DialogTitle>
          <DialogDescription className="text-blue-100">
            Manage your active exchange posts and track their status
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3 max-h-[400px] overflow-y-auto pr-2">
            {loading ? (
            <div className="text-center py-8">
              <div className="text-blue-200">Loading your posts...</div>
            </div>
          ) : userPosts.length === 0 ? (
            <div className="text-center py-8">
              <div className="text-blue-200 mb-4">No active exchange posts</div>
              <Button
                onClick={onClose}
                className="bg-blue-500 hover:bg-blue-600 text-white"
              >
                Create Your First Post
              </Button>
            </div>
          ) : (
            userPosts.map((post) => (
              <Card key={post.id} className="glass-dark border-white/10">
                <CardContent className="p-4">
                  <div className="flex justify-between items-start mb-3">
                    <div className="flex items-center space-x-2">
                      <Badge className={`${getStatusColor(post.status)} text-white`}>
                        {post.status.toUpperCase()}
                      </Badge>
                      <span className="text-blue-200 text-sm flex items-center">
                        <Clock className="h-3 w-3 mr-1" />
                        {formatTimeAgo(post.timestamp)}
                      </span>
                    </div>
                    <div className="flex space-x-2">
                      {onEditPost && post.status === 'active' && (
                        <Button
                          onClick={() => onEditPost(post)}
                          size="sm"
                          variant="outline"
                          className="bg-white/10 text-white border-white/30 hover:bg-white/20"
                        >
                          <Edit className="h-3 w-3" />
                        </Button>
                      )}
                      <Button
                        onClick={() => handleDeletePost(post.id)}
                        size="sm"
                        variant="outline"
                        className="bg-red-500/20 text-red-300 border-red-500/30 hover:bg-red-500/30"
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <div className="flex items-center text-green-400">
                        <DollarSign className="h-4 w-4 mr-1" />
                        <span className="font-medium">Give: ₱{post.giveAmount} {post.giveType}</span>
                      </div>
                      <div className="flex items-center text-blue-400">
                        <DollarSign className="h-4 w-4 mr-1" />
                        <span className="font-medium">Need: ₱{post.needAmount} {post.needType}</span>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <div className="flex items-center text-blue-200">
                        <MapPin className="h-4 w-4 mr-1" />
                        <span className="text-sm">
                          {post.location.lat.toFixed(4)}, {post.location.lng.toFixed(4)}
                        </span>
                      </div>
                    </div>
                  </div>

                  {post.notes && (
                    <div className="mt-3 p-2 bg-white/5 rounded border border-white/10">
                      <p className="text-blue-100 text-sm">{post.notes}</p>
                    </div>
                  )}

                  {post.needBreakdown && post.needBreakdown.length > 0 && (
                    <div className="mt-3">
                      <span className="text-blue-200 text-sm">Preferred denominations: </span>
                      <span className="text-white text-sm">
                        {post.needBreakdown.map(amount => `₱${amount}`).join(', ')}
                      </span>
                    </div>
                  )}
                </CardContent>
              </Card>
            ))
            )}
        </div>

        <div className="flex justify-end pt-4 border-t border-white/10">
          <Button
            onClick={onClose}
            variant="outline"
            className="bg-white/10 text-white border-white/30 hover:bg-white/20"
          >
            Close
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}