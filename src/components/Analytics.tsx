import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer, 
  PieChart, 
  Pie, 
  Cell,
  LineChart,
  Line
} from "recharts";
import { 
  ArrowLeft, 
  Calendar, 
  Globe, 
  Smartphone, 
  Monitor, 
  Tablet,
  Sparkles,
  Loader2,
  TrendingUp,
  Users
} from "lucide-react";
import { toast } from "sonner";
import { format, subDays, isSameDay } from "date-fns";
import { GoogleGenAI } from "@google/genai";
import Markdown from "react-markdown";

interface User {
  uid: string;
  email: string;
  role: string;
}

const COLORS = ["#f97316", "#3b82f6", "#a855f7", "#22c55e", "#eab308"];

// Lazy initialization of Gemini AI
let aiInstance: GoogleGenAI | null = null;
const getAi = () => {
  if (!aiInstance) {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      throw new Error("GEMINI_API_KEY is not set in environment variables.");
    }
    aiInstance = new GoogleGenAI({ apiKey });
  }
  return aiInstance;
};

export default function Analytics({ user, role }: { user: User, role: string | null }) {
  const { linkId } = useParams();
  const navigate = useNavigate();
  const [link, setLink] = useState<any>(null);
  const [clicks, setClicks] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [aiReport, setAiReport] = useState("");
  const [isAiLoading, setIsAiLoading] = useState(false);

  useEffect(() => {
    if (!linkId) return;

    const fetchAnalytics = async () => {
      try {
        const token = localStorage.getItem("token");
        
        // Fetch link details
        const linkRes = await fetch(`/api/links/${linkId}`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        if (!linkRes.ok) throw new Error("Link not found");
        const linkData = await linkRes.json();
        setLink(linkData);

        // Fetch clicks
        const clicksRes = await fetch(`/api/analytics/${linkId}`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        if (clicksRes.ok) {
          const clicksData = await clicksRes.json();
          setClicks(clicksData);
        }
      } catch (error) {
        console.error("Analytics error:", error);
        toast.error("Failed to load analytics");
        navigate("/");
      } finally {
        setLoading(false);
      }
    };

    fetchAnalytics();
  }, [linkId, user.uid, role, navigate]);

  const generateAiReport = async () => {
    if (clicks.length === 0) return;
    setIsAiLoading(true);
    try {
      const ai = getAi();
      const statsSummary = {
        totalClicks: clicks.length,
        devices: clicks.reduce((acc: any, c) => {
          acc[c.device] = (acc[c.device] || 0) + 1;
          return acc;
        }, {}),
        browsers: clicks.reduce((acc: any, c) => {
          acc[c.browser] = (acc[c.browser] || 0) + 1;
          return acc;
        }, {}),
        os: clicks.reduce((acc: any, c) => {
          acc[c.os] = (acc[c.os] || 0) + 1;
          return acc;
        }, {}),
      };

      const response = await ai.models.generateContent({
        model: "gemini-2.0-flash",
        contents: `Generate a concise, professional marketing analytics report for this link performance data: ${JSON.stringify(statsSummary)}. 
        The link is for: ${link?.originalUrl}. 
        Campaign Details:
        - Language: ${link?.lang || 'N/A'}
        - UTM Campaign: ${link?.utmCampaign || 'N/A'}
        - Campaign ID: ${link?.campaignId || 'N/A'}
        - UTM Term: ${link?.utmTerm || 'N/A'}
        - UTM Content: ${link?.utmContent || 'N/A'}
        Focus on identifying trends and providing actionable advice. Use markdown formatting.`
      });

      setAiReport(response.text || "No report generated.");
    } catch (error) {
      toast.error("Failed to generate AI report");
    } finally {
      setIsAiLoading(false);
    }
  };

  if (loading || !link) {
    return (
      <div className="flex items-center justify-center py-40">
        <Loader2 className="w-12 h-12 animate-spin text-orange-500" />
      </div>
    );
  }

  // Data Processing
  const last7Days = Array.from({ length: 7 }, (_, i) => {
    const date = subDays(new Date(), i);
    const count = clicks.filter(c => isSameDay(new Date(c.timestamp), date)).length;
    return {
      date: format(date, "MMM d"),
      clicks: count
    };
  }).reverse();

  const deviceData = Object.entries(
    clicks.reduce((acc: any, c) => {
      acc[c.device] = (acc[c.device] || 0) + 1;
      return acc;
    }, {})
  ).map(([name, value]) => ({ name, value: value as number }));

  const browserData = Object.entries(
    clicks.reduce((acc: any, c) => {
      acc[c.browser] = (acc[c.browser] || 0) + 1;
      return acc;
    }, {})
  ).map(([name, value]) => ({ name, value: value as number }));

  return (
    <div className="space-y-8 pb-20">
      <header className="flex items-center gap-4">
        <button
          onClick={() => navigate("/")}
          className="p-3 bg-zinc-900 border border-zinc-800 rounded-2xl hover:bg-zinc-800 transition-colors"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-white mb-1">
            Analytics: {link.id}
          </h1>
          <p className="text-zinc-500 text-sm truncate max-w-md">
            {link.originalUrl}
          </p>
        </div>
      </header>

      {/* Main Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-zinc-900 border border-zinc-800 p-6 rounded-3xl">
          <p className="text-zinc-500 text-xs font-bold uppercase tracking-widest mb-2">Total Clicks</p>
          <div className="flex items-center justify-between">
            <p className="text-3xl font-bold text-white">{clicks.length}</p>
            <TrendingUp className="w-6 h-6 text-green-500" />
          </div>
        </div>
        <div className="bg-zinc-900 border border-zinc-800 p-6 rounded-3xl">
          <p className="text-zinc-500 text-xs font-bold uppercase tracking-widest mb-2">Unique Visitors</p>
          <div className="flex items-center justify-between">
            <p className="text-3xl font-bold text-white">
              {new Set(clicks.map(c => c.ip)).size}
            </p>
            <Users className="w-6 h-6 text-blue-500" />
          </div>
        </div>
        <div className="bg-zinc-900 border border-zinc-800 p-6 rounded-3xl">
          <p className="text-zinc-500 text-xs font-bold uppercase tracking-widest mb-2">Top Device</p>
          <div className="flex items-center justify-between">
            <p className="text-3xl font-bold text-white capitalize">
              {deviceData.sort((a, b) => (b.value as number) - (a.value as number))[0]?.name || "N/A"}
            </p>
            <Smartphone className="w-6 h-6 text-purple-500" />
          </div>
        </div>
        <div className="bg-zinc-900 border border-zinc-800 p-6 rounded-3xl">
          <p className="text-zinc-500 text-xs font-bold uppercase tracking-widest mb-2">Top Browser</p>
          <div className="flex items-center justify-between">
            <p className="text-3xl font-bold text-white capitalize">
              {browserData.sort((a, b) => (b.value as number) - (a.value as number))[0]?.name || "N/A"}
            </p>
            <Globe className="w-6 h-6 text-orange-500" />
          </div>
        </div>
      </div>

      {/* AI Report Section */}
      <div className="bg-orange-500/5 border border-orange-500/20 rounded-[2.5rem] p-8">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-orange-500 rounded-xl flex items-center justify-center">
              <Sparkles className="text-white w-6 h-6" />
            </div>
            <h2 className="text-xl font-bold text-white">AI Performance Insights</h2>
          </div>
          <button
            onClick={generateAiReport}
            disabled={isAiLoading || clicks.length === 0}
            className="bg-orange-500 hover:bg-orange-600 disabled:opacity-50 text-white font-bold py-2 px-6 rounded-xl transition-all flex items-center gap-2"
          >
            {isAiLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Generate Report"}
          </button>
        </div>
        
        {aiReport ? (
          <div className="prose prose-invert max-w-none text-zinc-300">
            <Markdown>{aiReport}</Markdown>
          </div>
        ) : (
          <p className="text-zinc-500 italic text-center py-8">
            Click the button above to generate an AI-powered analysis of your link performance.
          </p>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Click Over Time */}
        <div className="bg-zinc-900 border border-zinc-800 p-8 rounded-[2.5rem]">
          <h3 className="text-lg font-bold text-white mb-8 flex items-center gap-2">
            <Calendar className="w-5 h-5 text-orange-500" />
            Clicks Over Time (Last 7 Days)
          </h3>
          <div className="h-[300px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={last7Days}>
                <CartesianGrid strokeDasharray="3 3" stroke="#27272a" vertical={false} />
                <XAxis 
                  dataKey="date" 
                  stroke="#71717a" 
                  fontSize={12} 
                  tickLine={false} 
                  axisLine={false} 
                />
                <YAxis 
                  stroke="#71717a" 
                  fontSize={12} 
                  tickLine={false} 
                  axisLine={false} 
                />
                <Tooltip 
                  contentStyle={{ backgroundColor: "#18181b", border: "1px solid #27272a", borderRadius: "12px" }}
                  itemStyle={{ color: "#f97316" }}
                />
                <Line 
                  type="monotone" 
                  dataKey="clicks" 
                  stroke="#f97316" 
                  strokeWidth={3} 
                  dot={{ r: 4, fill: "#f97316", strokeWidth: 2 }} 
                  activeDot={{ r: 6, strokeWidth: 0 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Device Breakdown */}
        <div className="bg-zinc-900 border border-zinc-800 p-8 rounded-[2.5rem]">
          <h3 className="text-lg font-bold text-white mb-8 flex items-center gap-2">
            <Smartphone className="w-5 h-5 text-orange-500" />
            Device Breakdown
          </h3>
          <div className="h-[300px] w-full flex items-center justify-center">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={deviceData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={100}
                  paddingAngle={5}
                  dataKey="value"
                >
                  {deviceData.map((_entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip 
                  contentStyle={{ backgroundColor: "#18181b", border: "1px solid #27272a", borderRadius: "12px" }}
                />
              </PieChart>
            </ResponsiveContainer>
            <div className="flex flex-col gap-4 ml-8">
              {deviceData.map((d, i) => (
                <div key={d.name} className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full" style={{ backgroundColor: COLORS[i % COLORS.length] }} />
                  <span className="text-sm text-zinc-400 capitalize">{d.name}</span>
                  <span className="text-sm font-bold text-white">{d.value}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
