import { useState, useEffect } from "react";
import { User } from "firebase/auth";
import { 
  collection, 
  query, 
  where, 
  orderBy, 
  onSnapshot, 
  deleteDoc, 
  doc 
} from "firebase/firestore";
import { db } from "../lib/firebase";
import { toast } from "sonner";
import { 
  Plus, 
  Search, 
  ExternalLink, 
  BarChart3, 
  Trash2, 
  Copy, 
  Calendar,
  MousePointerClick,
  Filter,
  Sparkles,
  Link as LinkIcon
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import LinkCreator from "./LinkCreator";
import { Link as RouterLink } from "react-router-dom";
import { format } from "date-fns";

export default function Dashboard({ user }: { user: User }) {
  const [links, setLinks] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [showCreator, setShowCreator] = useState(false);

  useEffect(() => {
    const q = query(
      collection(db, "links"),
      where("ownerUid", "==", user.uid),
      orderBy("createdAt", "desc")
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const linksData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data({ serverTimestamps: 'estimate' })
      }));
      setLinks(linksData);
      setLoading(false);
    }, (error) => {
      console.error("Dashboard error:", error);
      toast.error("Failed to load links");
      setLoading(false);
    });

    return () => unsubscribe();
  }, [user.uid]);

  const handleDelete = async (id: string) => {
    if (window.confirm("Are you sure you want to delete this link?")) {
      try {
        await deleteDoc(doc(db, "links", id));
        toast.success("Link deleted");
      } catch (error) {
        toast.error("Failed to delete link");
      }
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success("Copied to clipboard!");
  };

  const filteredLinks = links.filter(link => 
    link.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
    link.originalUrl.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (link.campaignName && link.campaignName.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  return (
    <div className="space-y-8">
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-4xl font-bold tracking-tight text-white mb-2">My Links</h1>
          <p className="text-zinc-400">Manage and track your marketing campaigns</p>
        </div>
        <button
          onClick={() => setShowCreator(true)}
          className="bg-orange-500 hover:bg-orange-600 text-white font-bold py-3 px-6 rounded-2xl transition-all flex items-center justify-center gap-2 shadow-lg shadow-orange-500/20"
        >
          <Plus className="w-5 h-5" />
          <span>Create New Link</span>
        </button>
      </header>

      {/* Stats Overview */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-zinc-900 border border-zinc-800 p-6 rounded-3xl">
          <div className="flex items-center gap-4 mb-4">
            <div className="w-10 h-10 bg-blue-500/10 rounded-xl flex items-center justify-center">
              <MousePointerClick className="w-5 h-5 text-blue-500" />
            </div>
            <span className="text-zinc-400 font-medium">Total Clicks</span>
          </div>
          <p className="text-3xl font-bold text-white">
            {links.reduce((acc, link) => acc + (link.clickCount || 0), 0).toLocaleString()}
          </p>
        </div>
        <div className="bg-zinc-900 border border-zinc-800 p-6 rounded-3xl">
          <div className="flex items-center gap-4 mb-4">
            <div className="w-10 h-10 bg-purple-500/10 rounded-xl flex items-center justify-center">
              <Sparkles className="w-5 h-5 text-purple-500" />
            </div>
            <span className="text-zinc-400 font-medium">Active Links</span>
          </div>
          <p className="text-3xl font-bold text-white">{links.length}</p>
        </div>
        <div className="bg-zinc-900 border border-zinc-800 p-6 rounded-3xl">
          <div className="flex items-center gap-4 mb-4">
            <div className="w-10 h-10 bg-green-500/10 rounded-xl flex items-center justify-center">
              <BarChart3 className="w-5 h-5 text-green-500" />
            </div>
            <span className="text-zinc-400 font-medium">Avg. CTR</span>
          </div>
          <p className="text-3xl font-bold text-white">4.2%</p>
        </div>
      </div>

      {/* Search and Filters */}
      <div className="relative">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-zinc-500" />
        <input
          type="text"
          placeholder="Search links, campaigns, or URLs..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full bg-zinc-900 border border-zinc-800 rounded-2xl py-4 pl-12 pr-4 text-white focus:outline-none focus:ring-2 focus:ring-orange-500/50 transition-all"
        />
      </div>

      {/* Links List */}
      <div className="space-y-4">
        {loading ? (
          <div className="flex justify-center py-20">
            <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-orange-500"></div>
          </div>
        ) : filteredLinks.length > 0 ? (
          filteredLinks.map((link) => (
            <motion.div
              layout
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              key={link.id}
              className="bg-zinc-900 border border-zinc-800 rounded-3xl p-6 hover:border-zinc-700 transition-all group"
            >
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-3 mb-2">
                    <h3 className="text-lg font-bold text-white truncate">
                      {link.id}
                    </h3>
                    {link.campaignName && (
                      <span className="px-2 py-0.5 bg-orange-500/10 text-orange-500 text-xs font-bold rounded-full uppercase tracking-wider">
                        {link.campaignName}
                      </span>
                    )}
                  </div>
                  <p className="text-zinc-500 text-sm truncate mb-4">
                    {link.originalUrl}
                  </p>
                  <div className="flex flex-wrap gap-4 text-xs text-zinc-400 font-medium">
                    <div className="flex items-center gap-1.5">
                      <Calendar className="w-3.5 h-3.5" />
                      <span>{format(link.createdAt.toDate(), "MMM d, yyyy")}</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <MousePointerClick className="w-3.5 h-3.5" />
                      <span>{link.clickCount || 0} clicks</span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => copyToClipboard(`${window.location.origin}/r/${link.id}`)}
                    className="p-3 bg-zinc-800 hover:bg-zinc-700 rounded-xl text-zinc-300 transition-colors"
                    title="Copy short link"
                  >
                    <Copy className="w-5 h-5" />
                  </button>
                  <RouterLink
                    to={`/analytics/${link.id}`}
                    className="p-3 bg-zinc-800 hover:bg-zinc-700 rounded-xl text-zinc-300 transition-colors"
                    title="View Analytics"
                  >
                    <BarChart3 className="w-5 h-5" />
                  </RouterLink>
                  <a
                    href={link.originalUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="p-3 bg-zinc-800 hover:bg-zinc-700 rounded-xl text-zinc-300 transition-colors"
                    title="Open original URL"
                  >
                    <ExternalLink className="w-5 h-5" />
                  </a>
                  <button
                    onClick={() => handleDelete(link.id)}
                    className="p-3 bg-zinc-800 hover:bg-red-500/10 rounded-xl text-zinc-300 hover:text-red-500 transition-colors"
                    title="Delete link"
                  >
                    <Trash2 className="w-5 h-5" />
                  </button>
                </div>
              </div>
            </motion.div>
          ))
        ) : (
          <div className="text-center py-20 bg-zinc-900 border border-dashed border-zinc-800 rounded-3xl">
            <div className="w-16 h-16 bg-zinc-800 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <LinkIcon className="w-8 h-8 text-zinc-600" />
            </div>
            <h3 className="text-lg font-bold text-white mb-2">No links found</h3>
            <p className="text-zinc-500 mb-6">Create your first smart link to start tracking</p>
            <button
              onClick={() => setShowCreator(true)}
              className="text-orange-500 font-bold hover:underline"
            >
              Create a link now
            </button>
          </div>
        )}
      </div>

      <AnimatePresence>
        {showCreator && (
          <LinkCreator 
            user={user} 
            onClose={() => setShowCreator(false)} 
          />
        )}
      </AnimatePresence>
    </div>
  );
}
