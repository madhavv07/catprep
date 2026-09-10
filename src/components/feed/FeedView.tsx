import React, { useState, useEffect } from 'react';
import {
  MessageSquare,
  Send,
  ThumbsUp,
  Trash2,
  Sparkles,
  ChevronDown,
  ChevronUp,
  Pin,
  AlertCircle,
  Search,
  FileText,
  Upload,
  X,
  Eye,
  Download,
} from 'lucide-react';
import {
  collection,
  doc,
  setDoc,
  deleteDoc,
  updateDoc,
  onSnapshot,
} from 'firebase/firestore';
import { db } from '../../firebase/firebase';
import { useAuth } from '../../context/AuthContext';
import { FeedPost, FeedComment, FeedCategory, ActiveView, PdfAttachment } from '../../types';
import { PdfViewerModal } from '../common/PdfViewerModal';

interface FeedViewProps {
  setActiveView: (view: ActiveView) => void;
}

const LOCAL_STORAGE_FEED_KEY = 'prepdesk_community_feed';

// Completely empty starter posts (no demo messages)
const STARTER_POSTS: FeedPost[] = [];

export const FeedView: React.FC<FeedViewProps> = () => {
  const { user, isAdmin } = useAuth();
  const currentUserId = user?.uid || 'guest';
  const currentUserName = user?.displayName || user?.username || 'Student';
  const currentUserRole = user?.role || 'student';

  // Feed posts state (Starts empty; no sample messages)
  const [posts, setPosts] = useState<FeedPost[]>(() => {
    const saved = localStorage.getItem(LOCAL_STORAGE_FEED_KEY);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) return parsed;
      } catch (e) {}
    }
    return [];
  });

  // Filter & Search states
  const [selectedCategory, setSelectedCategory] = useState<FeedCategory | 'ALL'>('ALL');
  const [searchQuery, setSearchQuery] = useState('');

  // Create post modal / form state
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newContent, setNewContent] = useState('');
  const [newCategory, setNewCategory] = useState<FeedCategory>('Assignment & Deadlines');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  // PDF Attachment and Pin states
  const [formPdf, setFormPdf] = useState<PdfAttachment | undefined>(undefined);
  const [isUploadingPdf, setIsUploadingPdf] = useState(false);
  const [pdfUploadError, setPdfUploadError] = useState<string | null>(null);
  const [activePdfModal, setActivePdfModal] = useState<{ url: string; title: string; size?: string } | null>(null);

  // Active expanded comments map (postId -> boolean)
  const [expandedComments, setExpandedComments] = useState<Record<string, boolean>>({});

  // Active reply text state per post (postId -> comment text)
  const [replyInputs, setReplyInputs] = useState<Record<string, string>>({});

  // Database fetch helper
  const fetchFeedFromDb = async () => {
    try {
      const res = await fetch('/api/db/feed');
      if (res.ok) {
        const list = await res.json();
        if (Array.isArray(list)) {
          setPosts(list);
          localStorage.setItem(LOCAL_STORAGE_FEED_KEY, JSON.stringify(list));
        }
      }
    } catch (e) {}
  };

  // Real-time listener for feed updates
  useEffect(() => {
    fetchFeedFromDb();

    let eventSource: EventSource | null = null;
    try {
      eventSource = new EventSource('/api/realtime/stream');
      eventSource.addEventListener('update', (event) => {
        try {
          const parsed = JSON.parse(event.data);
          if (
            parsed.type === 'FEED_POST_CREATED' ||
            parsed.type === 'FEED_POST_DELETED' ||
            parsed.type === 'FEED_COMMENT_ADDED' ||
            parsed.type === 'FEED_COMMENT_DELETED' ||
            parsed.type === 'DATABASE_RESET'
          ) {
            fetchFeedFromDb();
          }
        } catch (e) {}
      });
    } catch (e) {}

    return () => {
      if (eventSource) eventSource.close();
    };
  }, []);

  const toggleComments = (postId: string) => {
    setExpandedComments((prev) => ({ ...prev, [postId]: !prev[postId] }));
  };

  const handleTemplateClick = (title: string, category: FeedCategory) => {
    setNewTitle(title);
    setNewCategory(category);
    setIsFormOpen(true);
  };

  const handlePdfUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.type !== 'application/pdf' && !file.name.toLowerCase().endsWith('.pdf')) {
      setPdfUploadError('Please select a valid PDF file.');
      return;
    }

    if (file.size > 25 * 1024 * 1024) {
      setPdfUploadError('PDF exceeds the 25MB maximum limit.');
      return;
    }

    setIsUploadingPdf(true);
    setPdfUploadError(null);

    try {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = async () => {
        try {
          const base64Content = reader.result as string;
          const res = await fetch('/api/db/upload-pdf', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              fileName: file.name,
              data: base64Content,
            }),
          });

          if (!res.ok) throw new Error('Upload endpoint error');
          const data = await res.json();
          setFormPdf({
            name: data.name || file.name,
            url: data.url,
            sizeFormatted: data.sizeFormatted || `${(file.size / (1024 * 1024)).toFixed(1)} MB`,
            sizeBytes: data.sizeBytes || file.size,
            uploadedAt: new Date().toISOString(),
          });
        } catch (uploadErr) {
          const sizeMb = (file.size / (1024 * 1024)).toFixed(1);
          setFormPdf({
            name: file.name,
            url: reader.result as string,
            sizeFormatted: `${sizeMb} MB`,
            sizeBytes: file.size,
            uploadedAt: new Date().toISOString(),
          });
        } finally {
          setIsUploadingPdf(false);
        }
      };
      reader.onerror = () => {
        setPdfUploadError('Failed to read PDF file.');
        setIsUploadingPdf(false);
      };
    } catch (err: any) {
      setPdfUploadError(err?.message || 'Error processing file.');
      setIsUploadingPdf(false);
    }
  };

  const handleTogglePin = async (postId: string) => {
    if (!isAdmin) return;
    const target = posts.find((p) => p.id === postId);
    if (!target) return;

    const newPinned = !target.isPinned;
    const updated = posts.map((p) => (p.id === postId ? { ...p, isPinned: newPinned } : p));
    setPosts(updated);
    localStorage.setItem(LOCAL_STORAGE_FEED_KEY, JSON.stringify(updated));

    try {
      await fetch(`/api/db/feed/${postId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isPinned: newPinned }),
      });
    } catch (e) {}
    try {
      await updateDoc(doc(db, 'feed_posts', postId), { isPinned: newPinned });
    } catch (e) {}
  };

  const handleCreatePost = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    if (!newTitle.trim()) {
      setFormError('Please enter a question or topic title.');
      return;
    }
    if (!newContent.trim()) {
      setFormError('Please provide details or description for your post.');
      return;
    }

    setIsSubmitting(true);
    const newPostId = `post_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
    const nowIso = new Date().toISOString();

    const newPost: FeedPost = {
      id: newPostId,
      authorId: currentUserId,
      authorName: currentUserName,
      authorRole: currentUserRole,
      title: newTitle.trim(),
      content: newContent.trim(),
      category: newCategory,
      upvotes: 0,
      upvotedUserIds: [],
      comments: [],
      isPinned: false,
      pdfAttachment: formPdf,
      createdAt: nowIso,
      updatedAt: nowIso,
    };

    const updated = [newPost, ...posts];
    setPosts(updated);
    localStorage.setItem(LOCAL_STORAGE_FEED_KEY, JSON.stringify(updated));

    try {
      await fetch('/api/db/feed', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newPost),
      });
    } catch (err) {}

    setNewTitle('');
    setNewContent('');
    setFormPdf(undefined);
    setIsFormOpen(false);
    setIsSubmitting(false);
  };

  const handleUpvote = async (postId: string) => {
    const target = posts.find((p) => p.id === postId);
    if (!target) return;

    const hasUpvoted = target.upvotedUserIds?.includes(currentUserId);
    const updatedUpvotedUserIds = hasUpvoted
      ? (target.upvotedUserIds || []).filter((id) => id !== currentUserId)
      : [...(target.upvotedUserIds || []), currentUserId];

    const updatedUpvotes = hasUpvoted
      ? Math.max(0, target.upvotes - 1)
      : target.upvotes + 1;

    const updatedPosts = posts.map((p) =>
      p.id === postId
        ? { ...p, upvotes: updatedUpvotes, upvotedUserIds: updatedUpvotedUserIds }
        : p
    );

    setPosts(updatedPosts);
    localStorage.setItem(LOCAL_STORAGE_FEED_KEY, JSON.stringify(updatedPosts));

    try {
      await updateDoc(doc(db, 'feed_posts', postId), {
        upvotes: updatedUpvotes,
        upvotedUserIds: updatedUpvotedUserIds,
      });
    } catch (err) {}
  };

  const handleAddComment = async (postId: string) => {
    const commentText = replyInputs[postId]?.trim();
    if (!commentText) return;

    setReplyInputs((prev) => ({ ...prev, [postId]: '' }));
    setExpandedComments((prev) => ({ ...prev, [postId]: true }));

    try {
      const res = await fetch(`/api/db/feed/${postId}/comments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          authorId: currentUserId,
          authorName: currentUserName,
          authorRole: currentUserRole,
          content: commentText,
        }),
      });
      if (res.ok) {
        const data = await res.json();
        if (data.post) {
          setPosts((prev) => prev.map((p) => (p.id === postId ? data.post : p)));
        }
      }
    } catch (err) {}
  };

  const handleDeletePost = async (postId: string) => {
    if (!window.confirm('Are you sure you want to delete this discussion post?')) return;

    setPosts((prev) => prev.filter((p) => p.id !== postId));
    try {
      await fetch(`/api/db/feed/${postId}`, { method: 'DELETE' });
    } catch (err) {}
    try {
      await deleteDoc(doc(db, 'feed_posts', postId));
    } catch (err) {}
  };

  const handleDeleteComment = async (postId: string, commentId: string) => {
    if (!window.confirm('Are you sure you want to delete this reply?')) return;

    setPosts((prev) =>
      prev.map((p) =>
        p.id === postId
          ? { ...p, comments: (p.comments || []).filter((c) => c.id !== commentId) }
          : p
      )
    );

    try {
      await fetch(`/api/db/feed/${postId}/comments/${commentId}`, { method: 'DELETE' });
    } catch (err) {}
  };

  const formatRelativeTime = (isoString: string) => {
    try {
      const diffSec = Math.floor((Date.now() - new Date(isoString).getTime()) / 1000);
      if (diffSec < 60) return 'Just now';
      const diffMin = Math.floor(diffSec / 60);
      if (diffMin < 60) return `${diffMin}m ago`;
      const diffHrs = Math.floor(diffMin / 60);
      if (diffHrs < 24) return `${diffHrs}h ago`;
      const diffDays = Math.floor(diffHrs / 24);
      if (diffDays <= 7) return `${diffDays}d ago`;
      return new Date(isoString).toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
      });
    } catch (e) {
      return 'Recently';
    }
  };

  const getCategoryBadgeClass = (category: FeedCategory) => {
    switch (category) {
      case 'Assignment & Deadlines':
        return 'bg-amber-500/10 text-amber-400 border-amber-500/30';
      case 'Doubt & Discussion':
        return 'bg-sky-500/10 text-sky-400 border-sky-500/30';
      case 'VARC':
        return 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30';
      case 'DILR':
        return 'bg-cyan-500/10 text-cyan-400 border-cyan-500/30';
      case 'QUANT':
        return 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30';
      default:
        return 'bg-zinc-900 text-zinc-400 border-zinc-800';
    }
  };

  // Filter and sort posts (Pinned posts at the top)
  const filteredPosts = posts
    .filter((p) => {
      if (selectedCategory !== 'ALL' && p.category !== selectedCategory) {
        return false;
      }
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchTitle = p.title.toLowerCase().includes(q);
        const matchContent = p.content.toLowerCase().includes(q);
        const matchAuthor = p.authorName.toLowerCase().includes(q);
        return matchTitle || matchContent || matchAuthor;
      }
      return true;
    })
    .sort((a, b) => {
      if (a.isPinned && !b.isPinned) return -1;
      if (!a.isPinned && b.isPinned) return 1;
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });

  return (
    <div className="max-w-4xl mx-auto space-y-6 pb-20 animate-in fade-in duration-200">
      {/* 1. Header Banner */}
      <div className="p-6 sm:p-8 rounded-3xl bg-zinc-950 border border-zinc-800/80 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-5">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 uppercase tracking-wider">
              Student Public Chat & Feed
            </span>
            <span className="text-xs text-zinc-600">&bull;</span>
            <span className="text-xs text-zinc-400 font-medium">Real-Time Community</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-serif font-bold text-zinc-100 tracking-tight mt-1.5">
            Assignment Inquiries & Community Feed
          </h1>
          <p className="text-zinc-400 text-xs sm:text-sm mt-1 leading-relaxed max-w-2xl">
            Ask what assignments are due, check lecture requirements, post academic doubts, or start a study discussion. Administrators and fellow students can reply directly!
          </p>
        </div>

        <button
          onClick={() => setIsFormOpen(!isFormOpen)}
          className="px-5 py-2.5 bg-emerald-500 hover:bg-emerald-400 text-black font-semibold text-xs rounded-2xl transition flex items-center justify-center gap-2 shadow-[0_0_15px_rgba(16,185,129,0.2)] shrink-0"
        >
          <MessageSquare className="w-4 h-4" />
          <span>{isFormOpen ? 'Close Form' : 'Ask or Post Question'}</span>
        </button>
      </div>

      {/* 2. Quick Action Templates Bar */}
      <div className="p-4 rounded-2xl bg-zinc-950 border border-zinc-800/80 flex flex-col sm:flex-row sm:items-center gap-2.5">
        <span className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider flex items-center gap-1.5 shrink-0">
          <Sparkles className="w-3.5 h-3.5 text-emerald-400" />
          Quick Inquiries:
        </span>
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() =>
              handleTemplateClick(
                'What assignments are due this week across subjects?',
                'Assignment & Deadlines'
              )
            }
            className="px-2.5 py-1 text-xs bg-zinc-900 hover:bg-zinc-800 hover:border-emerald-500/40 border border-zinc-800 text-zinc-300 rounded-lg transition text-left"
          >
            📅 What assignments are due this week?
          </button>
          <button
            onClick={() =>
              handleTemplateClick(
                'Clarification needed for today\'s Quantitative Aptitude lecture',
                'QUANT'
              )
            }
            className="px-2.5 py-1 text-xs bg-zinc-900 hover:bg-zinc-800 hover:border-emerald-500/40 border border-zinc-800 text-zinc-300 rounded-lg transition text-left"
          >
            ❓ Today's QUANT lecture doubt
          </button>
          <button
            onClick={() =>
              handleTemplateClick(
                'DILR puzzle sets practice discussion & approach tips',
                'DILR'
              )
            }
            className="px-2.5 py-1 text-xs bg-zinc-900 hover:bg-zinc-800 hover:border-emerald-500/40 border border-zinc-800 text-zinc-300 rounded-lg transition text-left"
          >
            🧩 DILR practice question doubt
          </button>
        </div>
      </div>

      {/* 3. New Post Form Modal/Card */}
      {isFormOpen && (
        <div className="p-6 rounded-3xl bg-zinc-950 border border-emerald-500/40 shadow-xl space-y-4 animate-in slide-in-from-top-2 duration-150">
          <div className="flex items-center justify-between pb-3 border-b border-zinc-800">
            <h3 className="font-serif font-bold text-zinc-100 text-base flex items-center gap-2">
              <MessageSquare className="w-4 h-4 text-emerald-400" />
              Ask a Question or Post to Community
            </h3>
            <span className="text-xs text-zinc-500">
              Posting as: <strong className="text-zinc-200">{currentUserName}</strong> ({currentUserRole})
            </span>
          </div>

          <form onSubmit={handleCreatePost} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {/* Question Title */}
              <div className="sm:col-span-2">
                <label className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider block mb-1">
                  Question / Post Title <span className="text-rose-400">*</span>
                </label>
                <input
                  type="text"
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  placeholder="e.g. When is the DILR sets assignment due? or Question on Reading Comprehension"
                  className="w-full px-3.5 py-2.5 text-xs bg-zinc-900 border border-zinc-800 text-zinc-100 placeholder-zinc-500 rounded-xl focus:outline-none focus:border-emerald-500/60 transition"
                  autoFocus
                />
              </div>

              {/* Category */}
              <div>
                <label className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider block mb-1">
                  Category Tag
                </label>
                <select
                  value={newCategory}
                  onChange={(e) => setNewCategory(e.target.value as FeedCategory)}
                  className="w-full px-3.5 py-2.5 text-xs bg-zinc-900 border border-zinc-800 text-zinc-200 rounded-xl focus:outline-none focus:border-emerald-500/60 font-medium transition"
                >
                  <option value="Assignment & Deadlines">Assignment & Deadlines</option>
                  <option value="Doubt & Discussion">Doubt & Discussion</option>
                  <option value="VARC">VARC</option>
                  <option value="DILR">DILR</option>
                  <option value="QUANT">QUANT</option>
                  <option value="General">General</option>
                </select>
              </div>
            </div>

            {/* Content Body */}
            <div>
              <label className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider block mb-1">
                Details / Question Description <span className="text-rose-400">*</span>
              </label>
              <textarea
                value={newContent}
                onChange={(e) => setNewContent(e.target.value)}
                placeholder="Provide all context here: mention the lecture number, specific question, what you tried, or what deadline you are inquiring about..."
                rows={4}
                className="w-full px-3.5 py-2.5 text-xs bg-zinc-900 border border-zinc-800 text-zinc-100 placeholder-zinc-500 rounded-xl focus:outline-none focus:border-emerald-500/60 transition"
              />
            </div>

            {/* PDF Handout Attachment */}
            <div>
              <label className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider block mb-1">
                Attach Study Material / Question Paper PDF (Optional)
              </label>

              {formPdf ? (
                <div className="p-3 rounded-2xl bg-rose-950/20 border border-rose-900/50 flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <FileText className="w-5 h-5 text-rose-400 shrink-0" />
                    <div className="min-w-0">
                      <p className="text-xs font-semibold text-zinc-100 truncate">{formPdf.name}</p>
                      <span className="text-[10px] text-zinc-400 font-mono">{formPdf.sizeFormatted}</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5 shrink-0">
                    <button
                      type="button"
                      onClick={() => setActivePdfModal({ url: formPdf.url, title: formPdf.name, size: formPdf.sizeFormatted })}
                      className="px-2.5 py-1 text-xs font-medium rounded-lg bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 border border-rose-500/40 flex items-center gap-1 transition cursor-pointer"
                    >
                      <Eye className="w-3 h-3" />
                      Preview
                    </button>
                    <button
                      type="button"
                      onClick={() => setFormPdf(undefined)}
                      className="p-1 rounded-lg text-zinc-400 hover:text-rose-400 hover:bg-rose-950/40 transition"
                      title="Remove PDF"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ) : (
                <div>
                  <label className="border border-dashed border-zinc-800 hover:border-emerald-500/50 bg-zinc-900/30 hover:bg-zinc-900/60 rounded-xl p-3 flex items-center justify-center gap-2 cursor-pointer transition">
                    <Upload className="w-4 h-4 text-zinc-400" />
                    <span className="text-xs text-zinc-300">
                      {isUploadingPdf ? 'Uploading PDF...' : 'Attach PDF document (Up to 25MB)'}
                    </span>
                    <input
                      type="file"
                      accept="application/pdf"
                      onChange={handlePdfUpload}
                      disabled={isUploadingPdf}
                      className="hidden"
                    />
                  </label>
                  {pdfUploadError && (
                    <p className="text-[11px] text-rose-400 mt-1">{pdfUploadError}</p>
                  )}
                </div>
              )}
            </div>

            {formError && (
              <div className="p-3 bg-rose-950/40 border border-rose-800/60 rounded-xl text-xs text-rose-300 flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
                <span>{formError}</span>
              </div>
            )}

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setIsFormOpen(false)}
                className="px-4 py-2 text-xs text-zinc-400 hover:text-zinc-200 font-medium"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className="px-6 py-2.5 bg-emerald-500 hover:bg-emerald-400 text-black font-semibold text-xs rounded-xl transition flex items-center gap-2 shadow-[0_0_15px_rgba(16,185,129,0.2)] disabled:opacity-50"
              >
                <Send className="w-3.5 h-3.5" />
                <span>{isSubmitting ? 'Posting...' : 'Post Question'}</span>
              </button>
            </div>
          </form>
        </div>
      )}

      {/* 4. Filters & Search Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-1">
        {/* Category Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0 scrollbar-none">
          {(
            [
              'ALL',
              'Assignment & Deadlines',
              'Doubt & Discussion',
              'VARC',
              'DILR',
              'QUANT',
              'General',
            ] as const
          ).map((cat) => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`px-3 py-1.5 rounded-xl text-xs font-medium whitespace-nowrap transition ${
                selectedCategory === cat
                  ? 'bg-zinc-800 text-emerald-400 border border-emerald-500/30 shadow-2xs font-semibold'
                  : 'bg-zinc-950 text-zinc-400 hover:bg-zinc-900 border border-zinc-800'
              }`}
            >
              {cat === 'ALL' ? 'All Posts' : cat}
            </button>
          ))}
        </div>

        {/* Search */}
        <div className="relative w-full sm:w-64">
          <Search className="w-3.5 h-3.5 text-zinc-500 absolute left-3 top-2.5" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search inquiries & answers..."
            className="w-full pl-8 pr-3 py-1.5 text-xs bg-zinc-900 border border-zinc-800 text-zinc-100 placeholder-zinc-500 rounded-xl focus:outline-none focus:border-emerald-500/60 transition"
          />
        </div>
      </div>

      {/* 5. Posts Feed List */}
      <div className="space-y-4">
        {filteredPosts.length === 0 ? (
          <div className="p-12 text-center rounded-3xl bg-zinc-950 border border-zinc-800/80 text-zinc-400 space-y-3">
            <MessageSquare className="w-10 h-10 text-zinc-700 mx-auto" />
            <h3 className="font-serif font-bold text-zinc-200 text-base">No discussions found in this view</h3>
            <p className="text-xs text-zinc-500 max-w-sm mx-auto">
              Be the first to ask what assignments are due or post a question! Click the button above to start.
            </p>
            <button
              onClick={() => setIsFormOpen(true)}
              className="px-4 py-2 bg-emerald-500 hover:bg-emerald-400 text-black text-xs font-semibold rounded-xl inline-flex items-center gap-2 transition shadow-xs"
            >
              <MessageSquare className="w-3.5 h-3.5" />
              <span>Ask First Question</span>
            </button>
          </div>
        ) : (
          filteredPosts.map((post) => {
            const hasUpvoted = post.upvotedUserIds?.includes(currentUserId);
            const isAuthor = post.authorId === currentUserId;
            const canDelete = isAuthor || isAdmin;
            const isCommentsOpen = !!expandedComments[post.id];

            return (
              <div
                key={post.id}
                className={`rounded-3xl bg-zinc-950 border transition shadow-xs overflow-hidden ${
                  post.isPinned
                    ? 'border-emerald-500/50 ring-1 ring-emerald-500/30'
                    : 'border-zinc-800/80 hover:border-zinc-700'
                }`}
              >
                <div className="p-5 sm:p-6 space-y-3">
                  {/* Top Bar: Author, Tag, Timestamp */}
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div
                        className={`w-9 h-9 rounded-xl flex items-center justify-center font-bold text-xs font-serif shrink-0 ${
                          post.authorRole === 'admin'
                            ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 shadow-2xs'
                            : 'bg-zinc-800 text-zinc-300'
                        }`}
                      >
                        {post.authorName.charAt(0).toUpperCase()}
                      </div>

                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-serif font-bold text-zinc-100 text-sm">
                            {post.authorName}
                          </span>
                          <span
                            className={`text-[10px] font-bold px-2 py-0.2 rounded-full uppercase tracking-wider border ${
                              post.authorRole === 'admin'
                                ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                                : 'bg-zinc-900 text-zinc-400 border-zinc-800'
                            }`}
                          >
                            {post.authorRole === 'admin' ? 'Administrator' : 'Student'}
                          </span>
                          {post.isPinned && (
                            <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.2 rounded-full bg-emerald-500 text-black">
                              <Pin className="w-2.5 h-2.5 fill-current" /> Pinned
                            </span>
                          )}
                        </div>
                        <span className="text-[11px] text-zinc-500 block mt-0.5">
                          {formatRelativeTime(post.createdAt)}
                        </span>
                      </div>
                    </div>

                      <div className="flex items-center gap-1.5">
                        <span
                          className={`text-[10px] font-bold px-2.5 py-1 rounded-full uppercase tracking-wider border ${getCategoryBadgeClass(
                            post.category
                          )}`}
                        >
                          {post.category}
                        </span>

                        {isAdmin && (
                          <button
                            onClick={() => handleTogglePin(post.id)}
                            className={`p-1.5 rounded-lg transition ${
                              post.isPinned
                                ? 'text-amber-400 bg-amber-500/15 hover:bg-amber-500/25 border border-amber-500/30'
                                : 'text-zinc-500 hover:text-amber-400 hover:bg-zinc-900'
                            }`}
                            title={post.isPinned ? 'Unpin announcement' : 'Pin to top of feed'}
                          >
                            <Pin className={`w-3.5 h-3.5 ${post.isPinned ? 'fill-current' : ''}`} />
                          </button>
                        )}

                        {canDelete && (
                          <button
                            onClick={() => handleDeletePost(post.id)}
                            className="p-1.5 text-zinc-500 hover:text-rose-400 rounded-lg hover:bg-zinc-900 transition"
                            title="Delete post"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Post Title */}
                    <h3 className="text-base sm:text-lg font-serif font-bold text-zinc-100 tracking-tight leading-snug">
                      {post.title}
                    </h3>

                    {/* Post Content */}
                    <p className="text-xs sm:text-sm text-zinc-300 whitespace-pre-wrap leading-relaxed">
                      {post.content}
                    </p>

                    {/* Attached PDF Material Card (if present) */}
                    {post.pdfAttachment && (
                      <div className="p-3.5 rounded-2xl bg-rose-950/20 border border-rose-900/50 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                        <div className="flex items-center gap-2.5 min-w-0">
                          <div className="p-2 rounded-xl bg-rose-500/10 border border-rose-500/30 shrink-0">
                            <FileText className="w-4 h-4 text-rose-400" />
                          </div>
                          <div className="min-w-0">
                            <div className="flex items-center gap-2">
                              <span className="text-[10px] font-mono font-bold px-1.5 py-0.2 rounded bg-rose-500/10 text-rose-400 border border-rose-500/30 uppercase">
                                PDF Document
                              </span>
                              <span className="text-[11px] text-zinc-400 font-mono">
                                {post.pdfAttachment.sizeFormatted}
                              </span>
                            </div>
                            <p className="text-xs font-semibold text-zinc-200 truncate mt-0.5">
                              {post.pdfAttachment.name}
                            </p>
                          </div>
                        </div>

                        <div className="flex items-center gap-2 shrink-0">
                          <button
                            type="button"
                            onClick={() =>
                              setActivePdfModal({
                                url: post.pdfAttachment!.url,
                                title: post.pdfAttachment!.name,
                                size: post.pdfAttachment!.sizeFormatted,
                              })
                            }
                            className="px-3 py-1.5 rounded-xl text-xs font-semibold bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 border border-rose-500/40 flex items-center gap-1.5 transition cursor-pointer"
                          >
                            <Eye className="w-3.5 h-3.5" />
                            <span>Read in App</span>
                          </button>
                          <a
                            href={post.pdfAttachment.url}
                            download
                            className="p-1.5 rounded-xl text-zinc-400 hover:text-white hover:bg-zinc-800 transition"
                            title="Download PDF"
                          >
                            <Download className="w-4 h-4" />
                          </a>
                        </div>
                      </div>
                    )}

                  {/* Bottom Controls Bar: Upvotes & Comments */}
                  <div className="flex items-center justify-between pt-3 border-t border-zinc-850">
                    <div className="flex items-center gap-2">
                      {/* Upvote Button */}
                      <button
                        onClick={() => handleUpvote(post.id)}
                        className={`px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition border ${
                          hasUpvoted
                            ? 'bg-emerald-500/15 text-emerald-400 border-emerald-500/40'
                            : 'bg-zinc-900 hover:bg-zinc-800 text-zinc-400 border-zinc-800'
                        }`}
                      >
                        <ThumbsUp className={`w-3.5 h-3.5 ${hasUpvoted ? 'fill-current' : ''}`} />
                        <span>{post.upvotes || 0} Helpful</span>
                      </button>

                      {/* Comments Toggle */}
                      <button
                        onClick={() => toggleComments(post.id)}
                        className="px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 bg-zinc-900 hover:bg-zinc-800 text-zinc-400 border border-zinc-800 transition"
                      >
                        <MessageSquare className="w-3.5 h-3.5" />
                        <span>
                          {post.comments?.length || 0}{' '}
                          {post.comments?.length === 1 ? 'Reply' : 'Replies'}
                        </span>
                        {isCommentsOpen ? (
                          <ChevronUp className="w-3 h-3 text-zinc-500" />
                        ) : (
                          <ChevronDown className="w-3 h-3 text-zinc-500" />
                        )}
                      </button>
                    </div>

                    <span className="text-[11px] text-zinc-500">
                      Public Student Discussion
                    </span>
                  </div>
                </div>

                {/* 6. Comments / Reply Thread */}
                {isCommentsOpen && (
                  <div className="bg-black/60 p-5 sm:p-6 border-t border-zinc-800 space-y-4 animate-in fade-in duration-150">
                    {/* Existing Comments */}
                    {post.comments && post.comments.length > 0 ? (
                      <div className="space-y-3">
                        {post.comments.map((c) => (
                          <div
                            key={c.id}
                            className={`p-3.5 rounded-2xl border text-xs space-y-1.5 ${
                              c.authorRole === 'admin'
                                ? 'bg-emerald-950/20 border-emerald-500/30'
                                : 'bg-zinc-900 border-zinc-800'
                            }`}
                          >
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-2">
                                <span className="font-serif font-bold text-zinc-100">
                                  {c.authorName}
                                </span>
                                <span
                                  className={`text-[9px] font-bold px-1.5 py-0.2 rounded-full uppercase tracking-wider ${
                                    c.authorRole === 'admin'
                                      ? 'bg-emerald-500/20 text-emerald-400'
                                      : 'bg-zinc-800 text-zinc-400'
                                  }`}
                                >
                                  {c.authorRole === 'admin' ? 'Admin Answer' : 'Student'}
                                </span>
                              </div>
                              <div className="flex items-center gap-2">
                                <span className="text-[10px] text-zinc-500">
                                  {formatRelativeTime(c.createdAt)}
                                </span>
                                {(c.authorId === currentUserId || isAdmin) && (
                                  <button
                                    onClick={() => handleDeleteComment(post.id, c.id)}
                                    className="p-1 text-zinc-500 hover:text-rose-400 rounded transition cursor-pointer"
                                    title="Delete reply"
                                  >
                                    <Trash2 className="w-3 h-3" />
                                  </button>
                                )}
                              </div>
                            </div>
                            <p className="text-zinc-300 whitespace-pre-wrap leading-relaxed">
                              {c.content}
                            </p>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-xs text-zinc-500 italic">
                        No replies yet. Type an answer or clarification below!
                      </p>
                    )}

                    {/* Inline Reply Input */}
                    <div className="flex items-center gap-2 pt-1">
                      <input
                        type="text"
                        value={replyInputs[post.id] || ''}
                        onChange={(e) =>
                          setReplyInputs((prev) => ({ ...prev, [post.id]: e.target.value }))
                        }
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' && !e.shiftKey) {
                            e.preventDefault();
                            handleAddComment(post.id);
                          }
                        }}
                        placeholder={
                          isAdmin
                            ? 'Write official admin clarification or answer...'
                            : 'Reply or answer this question...'
                        }
                        className="flex-1 px-3.5 py-2 text-xs bg-zinc-950 border border-zinc-800 text-zinc-100 placeholder-zinc-500 rounded-xl focus:outline-none focus:border-emerald-500/60 transition"
                      />
                      <button
                        onClick={() => handleAddComment(post.id)}
                        disabled={!replyInputs[post.id]?.trim()}
                        className="px-4 py-2 bg-emerald-500 hover:bg-emerald-400 disabled:opacity-40 text-black font-semibold text-xs rounded-xl transition flex items-center gap-1.5 shadow-xs"
                      >
                        <Send className="w-3.5 h-3.5" />
                        <span>Reply</span>
                      </button>
                    </div>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      {/* PDF Viewer Reader Modal */}
      {activePdfModal && (
        <PdfViewerModal
          isOpen={true}
          onClose={() => setActivePdfModal(null)}
          pdfUrl={activePdfModal.url}
          title={activePdfModal.title}
          fileSizeFormatted={activePdfModal.size}
        />
      )}
    </div>
  );
};
