import { useState } from "react";
import { User } from "firebase/auth";
import { doc, setDoc, serverTimestamp, getDoc } from "firebase/firestore";
import { db, handleFirestoreError, OperationType } from "../lib/firebase";
import { toast } from "sonner";
import { 
  X, 
  Sparkles, 
  Link as LinkIcon, 
  ChevronDown, 
  ChevronUp, 
  Loader2,
  Check,
  Zap,
  Plus
} from "lucide-react";
import { motion } from "motion/react";
import { nanoid } from "nanoid";
import { GoogleGenAI, Type } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY! });

export default function LinkCreator({ user, onClose }: { user: User, onClose: () => void }) {
  const [originalUrl, setOriginalUrl] = useState("");
  const [customAlias, setCustomAlias] = useState("");
  const [campaignSource, setCampaignSource] = useState("");
  const [campaignMedium, setCampaignMedium] = useState("");
  const [campaignName, setCampaignName] = useState("");
  const [campaignContent, setCampaignContent] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [category, setCategory] = useState("");
  const [affiliateId, setAffiliateId] = useState("");
  const [referrerId, setReferrerId] = useState("");
  
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [loading, setLoading] = useState(false);
  const [aiPrompt, setAiPrompt] = useState("");
  const [isAiLoading, setIsAiLoading] = useState(false);
  const [aiSuggestions, setAiSuggestions] = useState<string[]>([]);

  const handleAiParse = async () => {
    if (!aiPrompt.trim()) return;
    setIsAiLoading(true);
    try {
      const response = await ai.models.generateContent({
        model: "gemini-2.0-flash",
        contents: `Parse this marketing campaign request and extract tracking parameters into JSON: "${aiPrompt}". 
        Fields: originalUrl, campaignSource, campaignMedium, campaignName, campaignContent, searchTerm, category, affiliateId, referrerId.
        Return ONLY valid JSON.`,
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              originalUrl: { type: Type.STRING },
              campaignSource: { type: Type.STRING },
              campaignMedium: { type: Type.STRING },
              campaignName: { type: Type.STRING },
              campaignContent: { type: Type.STRING },
              searchTerm: { type: Type.STRING },
              category: { type: Type.STRING },
              affiliateId: { type: Type.STRING },
              referrerId: { type: Type.STRING },
            }
          }
        }
      });

      const data = JSON.parse(response.text || "{}");
      if (data.originalUrl) setOriginalUrl(data.originalUrl);
      if (data.campaignSource) setCampaignSource(data.campaignSource);
      if (data.campaignMedium) setCampaignMedium(data.campaignMedium);
      if (data.campaignName) setCampaignName(data.campaignName);
      if (data.campaignContent) setCampaignContent(data.campaignContent);
      if (data.searchTerm) setSearchTerm(data.searchTerm);
      if (data.category) setCategory(data.category);
      if (data.affiliateId) setAffiliateId(data.affiliateId);
      if (data.referrerId) setReferrerId(data.referrerId);
      
      toast.success("AI successfully parsed your request!");
      setShowAdvanced(true);
    } catch (error) {
      console.error("AI Parse error:", error);
      toast.error("Failed to parse request with AI");
    } finally {
      setIsAiLoading(false);
    }
  };

  const handleSuggestSlugs = async () => {
    if (!originalUrl) {
      toast.error("Please enter a destination URL first");
      return;
    }
    setIsAiLoading(true);
    try {
      const response = await ai.models.generateContent({
        model: "gemini-2.0-flash",
        contents: `Suggest 5 short, SEO-friendly, memorable URL slugs for this destination: ${originalUrl}. 
        Context: ${campaignName || "general marketing"}.
        Return ONLY a JSON array of strings.`,
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.ARRAY,
            items: { type: Type.STRING }
          }
        }
      });
      const suggestions = JSON.parse(response.text || "[]");
      setAiSuggestions(suggestions);
    } catch (error) {
      toast.error("Failed to get AI suggestions");
    } finally {
      setIsAiLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!originalUrl) return;
    
    setLoading(true);
    const id = customAlias.trim() || nanoid(6);
    
    if (id.length < 3) {
      toast.error("Alias must be at least 3 characters long.");
      setLoading(false);
      return;
    }

    const path = `links/${id}`;
    
    try {
      // Check if alias exists
      const docRef = doc(db, "links", id);
      let docSnap;
      try {
        docSnap = await getDoc(docRef);
      } catch (err) {
        handleFirestoreError(err, OperationType.GET, path);
      }
      
      if (docSnap && docSnap.exists()) {
        toast.error("This alias is already taken. Please choose another.");
        setLoading(false);
        return;
      }

      try {
        await setDoc(docRef, {
          id,
          ownerUid: user.uid,
          originalUrl,
          campaignSource,
          campaignMedium,
          campaignName,
          campaignContent,
          searchTerm,
          category,
          affiliateId,
          referrerId,
          clickCount: 0,
          createdAt: serverTimestamp(),
        });
      } catch (err) {
        handleFirestoreError(err, OperationType.WRITE, path);
      }

      toast.success("Link created successfully!");
      onClose();
    } catch (error: any) {
      console.error("Link creation error:", error);
      try {
        const errorData = JSON.parse(error.message);
        toast.error(`Failed to create link: ${errorData.error}`);
      } catch {
        toast.error("Failed to create link. Check console for details.");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[100] flex items-center justify-center p-6 overflow-y-auto">
      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="bg-zinc-900 border border-zinc-800 w-full max-w-2xl rounded-[2.5rem] shadow-2xl overflow-hidden"
      >
        <div className="p-8 border-b border-zinc-800 flex items-center justify-between bg-zinc-900/50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-orange-500 rounded-xl flex items-center justify-center">
              <Plus className="text-white w-6 h-6" />
            </div>
            <h2 className="text-2xl font-bold text-white tracking-tight">Create Smart Link</h2>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-zinc-800 rounded-full transition-colors">
            <X className="w-6 h-6 text-zinc-500" />
          </button>
        </div>

        <div className="p-8 space-y-8 max-h-[70vh] overflow-y-auto custom-scrollbar">
          {/* AI Prompt Section */}
          <div className="bg-orange-500/5 border border-orange-500/20 rounded-3xl p-6">
            <div className="flex items-center gap-2 mb-4">
              <Sparkles className="w-5 h-5 text-orange-500" />
              <h3 className="text-sm font-bold text-orange-500 uppercase tracking-wider">AI Campaign Builder</h3>
            </div>
            <div className="flex gap-2">
              <input
                type="text"
                placeholder='e.g., "Create a link for my Summer Sale on Facebook mobile..."'
                value={aiPrompt}
                onChange={(e) => setAiPrompt(e.target.value)}
                className="flex-1 bg-zinc-800/50 border border-zinc-700 rounded-xl py-3 px-4 text-white focus:outline-none focus:ring-2 focus:ring-orange-500/50 transition-all"
              />
              <button
                onClick={handleAiParse}
                disabled={isAiLoading || !aiPrompt}
                className="bg-orange-500 hover:bg-orange-600 disabled:opacity-50 text-white p-3 rounded-xl transition-all"
              >
                {isAiLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Zap className="w-5 h-5" />}
              </button>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-2">
              <label className="text-sm font-bold text-zinc-400 ml-1 uppercase tracking-wider">Destination URL</label>
              <div className="relative">
                <LinkIcon className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-zinc-500" />
                <input
                  type="url"
                  required
                  placeholder="https://example.com/your-long-link"
                  value={originalUrl}
                  onChange={(e) => setOriginalUrl(e.target.value)}
                  className="w-full bg-zinc-800 border border-zinc-700 rounded-xl py-3 pl-12 pr-4 text-white focus:outline-none focus:ring-2 focus:ring-orange-500/50 transition-all"
                />
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between ml-1">
                <label className="text-sm font-bold text-zinc-400 uppercase tracking-wider">Short Alias (Optional)</label>
                <button 
                  type="button"
                  onClick={handleSuggestSlugs}
                  className="text-xs font-bold text-orange-500 hover:underline flex items-center gap-1"
                >
                  <Sparkles className="w-3 h-3" />
                  Suggest with AI
                </button>
              </div>
              <input
                type="text"
                placeholder="summer-sale-2024"
                value={customAlias}
                onChange={(e) => setCustomAlias(e.target.value)}
                className="w-full bg-zinc-800 border border-zinc-700 rounded-xl py-3 px-4 text-white focus:outline-none focus:ring-2 focus:ring-orange-500/50 transition-all"
              />
              {aiSuggestions.length > 0 && (
                <div className="flex flex-wrap gap-2 mt-2">
                  {aiSuggestions.map(s => (
                    <button
                      key={s}
                      type="button"
                      onClick={() => setCustomAlias(s)}
                      className="px-3 py-1 bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 rounded-full text-xs text-zinc-300 transition-all"
                    >
                      {s}
                    </button>
                  ))}
                </div>
              )}
            </div>

            <button
              type="button"
              onClick={() => setShowAdvanced(!showAdvanced)}
              className="flex items-center gap-2 text-sm font-bold text-zinc-500 hover:text-zinc-300 transition-colors"
            >
              {showAdvanced ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
              <span>Advanced Tracking Parameters</span>
            </button>

            {showAdvanced && (
              <motion.div 
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: "auto", opacity: 1 }}
                className="grid grid-cols-1 md:grid-cols-2 gap-4 overflow-hidden"
              >
                <div className="space-y-2">
                  <label className="text-xs font-bold text-zinc-500 uppercase tracking-wider">Campaign Source</label>
                  <input
                    type="text"
                    placeholder="google, facebook, newsletter"
                    value={campaignSource}
                    onChange={(e) => setCampaignSource(e.target.value)}
                    className="w-full bg-zinc-800 border border-zinc-700 rounded-xl py-2 px-4 text-sm text-white focus:outline-none focus:ring-2 focus:ring-orange-500/50 transition-all"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-bold text-zinc-500 uppercase tracking-wider">Campaign Medium</label>
                  <input
                    type="text"
                    placeholder="cpc, social, email"
                    value={campaignMedium}
                    onChange={(e) => setCampaignMedium(e.target.value)}
                    className="w-full bg-zinc-800 border border-zinc-700 rounded-xl py-2 px-4 text-sm text-white focus:outline-none focus:ring-2 focus:ring-orange-500/50 transition-all"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-bold text-zinc-500 uppercase tracking-wider">Campaign Name</label>
                  <input
                    type="text"
                    placeholder="summer_sale"
                    value={campaignName}
                    onChange={(e) => setCampaignName(e.target.value)}
                    className="w-full bg-zinc-800 border border-zinc-700 rounded-xl py-2 px-4 text-sm text-white focus:outline-none focus:ring-2 focus:ring-orange-500/50 transition-all"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-bold text-zinc-500 uppercase tracking-wider">Custom Category</label>
                  <input
                    type="text"
                    placeholder="e.g., Q3_Promos"
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    className="w-full bg-zinc-800 border border-zinc-700 rounded-xl py-2 px-4 text-sm text-white focus:outline-none focus:ring-2 focus:ring-orange-500/50 transition-all"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-bold text-zinc-500 uppercase tracking-wider">Affiliate ID</label>
                  <input
                    type="text"
                    placeholder="AFF_123"
                    value={affiliateId}
                    onChange={(e) => setAffiliateId(e.target.value)}
                    className="w-full bg-zinc-800 border border-zinc-700 rounded-xl py-2 px-4 text-sm text-white focus:outline-none focus:ring-2 focus:ring-orange-500/50 transition-all"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-bold text-zinc-500 uppercase tracking-wider">Referrer ID</label>
                  <input
                    type="text"
                    placeholder="REF_456"
                    value={referrerId}
                    onChange={(e) => setReferrerId(e.target.value)}
                    className="w-full bg-zinc-800 border border-zinc-700 rounded-xl py-2 px-4 text-sm text-white focus:outline-none focus:ring-2 focus:ring-orange-500/50 transition-all"
                  />
                </div>
              </motion.div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-orange-500 hover:bg-orange-600 text-white font-bold py-4 px-6 rounded-2xl transition-all flex items-center justify-center gap-2 group disabled:opacity-50 shadow-lg shadow-orange-500/20"
            >
              {loading ? <Loader2 className="w-6 h-6 animate-spin" /> : (
                <>
                  <span>Generate Smart Link</span>
                  <Check className="w-6 h-6 group-hover:scale-110 transition-transform" />
                </>
              )}
            </button>
          </form>
        </div>
      </motion.div>
    </div>
  );
}
