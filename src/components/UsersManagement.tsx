import { useState, useEffect } from "react";
import { 
  collection, 
  query, 
  onSnapshot, 
  doc, 
  updateDoc, 
  deleteDoc,
  orderBy,
  setDoc,
  serverTimestamp,
  getDoc
} from "firebase/firestore";
import { db, handleFirestoreError, OperationType } from "../lib/firebase";
import { 
  Users, 
  Shield, 
  User as UserIcon, 
  Trash2, 
  Search,
  Loader2,
  CheckCircle2,
  XCircle,
  UserPlus,
  Copy,
  Mail as MailIcon
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { toast } from "sonner";

interface UserProfile {
  uid: string;
  email: string;
  role: string;
  createdAt: any;
  displayName?: string;
}

interface Invite {
  email: string;
  role: string;
  status: string;
  createdAt: any;
}

export default function UsersManagement() {
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [invites, setInvites] = useState<Invite[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState("client");
  const [isInviting, setIsInviting] = useState(false);

  useEffect(() => {
    // Fetch users
    const qUsers = query(collection(db, "users"), orderBy("createdAt", "desc"));
    const unsubscribeUsers = onSnapshot(qUsers, (snapshot) => {
      const usersData = snapshot.docs.map(doc => ({
        ...doc.data()
      })) as UserProfile[];
      setUsers(usersData);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, "users");
    });

    // Fetch invites
    const qInvites = query(collection(db, "invites"), orderBy("createdAt", "desc"));
    const unsubscribeInvites = onSnapshot(qInvites, (snapshot) => {
      const invitesData = snapshot.docs.map(doc => ({
        ...doc.data()
      })) as Invite[];
      setInvites(invitesData);
      setLoading(false);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, "invites");
    });

    return () => {
      unsubscribeUsers();
      unsubscribeInvites();
    };
  }, []);

  const handleInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inviteEmail) return;
    setIsInviting(true);

    try {
      const emailLower = inviteEmail.toLowerCase();
      const inviteRef = doc(db, "invites", emailLower);
      
      await setDoc(inviteRef, {
        email: emailLower,
        role: inviteRole,
        status: "pending",
        createdAt: serverTimestamp()
      });

      toast.success("User invited successfully!");
      setInviteEmail("");
      setShowInviteModal(false);
    } catch (error) {
      toast.error("Failed to invite user");
    } finally {
      setIsInviting(false);
    }
  };

  const copyInviteLink = () => {
    const link = `${window.location.origin}/login?mode=signup`;
    navigator.clipboard.writeText(link);
    toast.success("Invite link copied to clipboard!");
  };

  const deleteInvite = async (email: string) => {
    try {
      await deleteDoc(doc(db, "invites", email));
      toast.success("Invite deleted");
    } catch (error) {
      toast.error("Failed to delete invite");
    }
  };

  const toggleRole = async (userId: string, currentRole: string) => {
    const newRole = currentRole === "admin" ? "client" : "admin";
    try {
      await updateDoc(doc(db, "users", userId), {
        role: newRole
      });
      toast.success(`User role updated to ${newRole}`);
    } catch (error) {
      toast.error("Failed to update user role");
    }
  };

  const deleteUser = async (userId: string) => {
    if (!window.confirm("Are you sure you want to delete this user profile? This will not delete their Auth account, only their profile data.")) return;
    try {
      await deleteDoc(doc(db, "users", userId));
      toast.success("User profile deleted");
    } catch (error) {
      toast.error("Failed to delete user profile");
    }
  };

  const filteredUsers = users.filter(user => 
    user.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (user.displayName && user.displayName.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center py-40">
        <Loader2 className="w-12 h-12 animate-spin text-orange-500" />
      </div>
    );
  }

  return (
    <div className="space-y-8 pb-20">
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-white mb-1 flex items-center gap-3">
            <Users className="w-8 h-8 text-orange-500" />
            User Management
          </h1>
          <p className="text-zinc-500 text-sm">
            Manage roles and access for all platform users.
          </p>
        </div>

        <div className="flex flex-col md:flex-row gap-4 items-center">
          <div className="relative w-full md:w-64">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-zinc-500" />
            <input
              type="text"
              placeholder="Search users..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-zinc-900 border border-zinc-800 rounded-2xl py-3 pl-12 pr-4 text-white focus:outline-none focus:ring-2 focus:ring-orange-500/50 transition-all"
            />
          </div>
          <button
            onClick={() => setShowInviteModal(true)}
            className="w-full md:w-auto bg-orange-500 hover:bg-orange-600 text-white font-bold py-3 px-6 rounded-2xl transition-all flex items-center justify-center gap-2 shadow-lg shadow-orange-500/20"
          >
            <UserPlus className="w-5 h-5" />
            <span>Invite User</span>
          </button>
        </div>
      </header>

      {/* Invite Modal */}
      <AnimatePresence>
        {showInviteModal && (
          <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[100] flex items-center justify-center p-6">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-zinc-900 border border-zinc-800 w-full max-w-md rounded-[2.5rem] shadow-2xl overflow-hidden"
            >
              <div className="p-8 border-b border-zinc-800 flex items-center justify-between">
                <h2 className="text-2xl font-bold text-white tracking-tight">Invite New User</h2>
                <button onClick={() => setShowInviteModal(false)} className="p-2 hover:bg-zinc-800 rounded-full transition-colors">
                  <XCircle className="w-6 h-6 text-zinc-500" />
                </button>
              </div>
              <form onSubmit={handleInvite} className="p-8 space-y-6">
                <div className="space-y-2">
                  <label className="text-xs font-bold text-zinc-500 uppercase tracking-wider ml-1">User Email</label>
                  <div className="relative">
                    <MailIcon className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-zinc-500" />
                    <input
                      type="email"
                      required
                      placeholder="user@example.com"
                      value={inviteEmail}
                      onChange={(e) => setInviteEmail(e.target.value)}
                      className="w-full bg-zinc-800 border border-zinc-700 rounded-xl py-3 pl-12 pr-4 text-white focus:outline-none focus:ring-2 focus:ring-orange-500/50 transition-all"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-bold text-zinc-500 uppercase tracking-wider ml-1">Role</label>
                  <select
                    value={inviteRole}
                    onChange={(e) => setInviteRole(e.target.value)}
                    className="w-full bg-zinc-800 border border-zinc-700 rounded-xl py-3 px-4 text-white focus:outline-none focus:ring-2 focus:ring-orange-500/50 transition-all appearance-none"
                  >
                    <option value="client">Client (Own links only)</option>
                    <option value="admin">Admin (Full access)</option>
                  </select>
                </div>
                <div className="pt-4 space-y-3">
                  <button
                    type="submit"
                    disabled={isInviting}
                    className="w-full bg-orange-500 hover:bg-orange-600 text-white font-bold py-4 px-6 rounded-2xl transition-all flex items-center justify-center gap-2 group disabled:opacity-50"
                  >
                    {isInviting ? <Loader2 className="w-5 h-5 animate-spin" /> : <UserPlus className="w-5 h-5" />}
                    <span>Send Invite</span>
                  </button>
                  <button
                    type="button"
                    onClick={copyInviteLink}
                    className="w-full bg-zinc-800 hover:bg-zinc-700 text-white font-bold py-4 px-6 rounded-2xl transition-all flex items-center justify-center gap-2"
                  >
                    <Copy className="w-5 h-5" />
                    <span>Copy Invite Link</span>
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <div className="grid grid-cols-1 gap-8">
        {/* Active Users Table */}
        <div className="bg-zinc-900 border border-zinc-800 rounded-[2.5rem] overflow-hidden shadow-xl">
          <div className="p-8 border-b border-zinc-800">
            <h3 className="text-xl font-bold text-white">Active Users</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-zinc-800/50 border-b border-zinc-800">
                  <th className="px-8 py-5 text-xs font-bold text-zinc-500 uppercase tracking-widest">User</th>
                  <th className="px-8 py-5 text-xs font-bold text-zinc-500 uppercase tracking-widest">Role</th>
                  <th className="px-8 py-5 text-xs font-bold text-zinc-500 uppercase tracking-widest">Joined</th>
                  <th className="px-8 py-5 text-xs font-bold text-zinc-500 uppercase tracking-widest text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-800">
                {filteredUsers.map((user) => (
                  <motion.tr 
                    key={user.uid}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="hover:bg-zinc-800/30 transition-colors group"
                  >
                    <td className="px-8 py-6">
                      <div className="flex items-center gap-4">
                        <div className="w-10 h-10 bg-zinc-800 rounded-xl flex items-center justify-center border border-zinc-700">
                          <UserIcon className="w-5 h-5 text-zinc-400" />
                        </div>
                        <div>
                          <p className="text-white font-bold">{user.displayName || "Anonymous"}</p>
                          <p className="text-zinc-500 text-sm">{user.email}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-8 py-6">
                      <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider ${
                        user.role === "admin" 
                          ? "bg-orange-500/10 text-orange-500 border border-orange-500/20" 
                          : "bg-zinc-800 text-zinc-400 border border-zinc-700"
                      }`}>
                        {user.role === "admin" ? <Shield className="w-3 h-3" /> : null}
                        {user.role}
                      </span>
                    </td>
                    <td className="px-8 py-6">
                      <p className="text-zinc-400 text-sm">
                        {user.createdAt?.toDate().toLocaleDateString() || "N/A"}
                      </p>
                    </td>
                    <td className="px-8 py-6 text-right">
                      <div className="flex items-center justify-end gap-2">
                        {user.email !== "mert.sadek.91@gmail.com" && (
                          <>
                            <button
                              onClick={() => toggleRole(user.uid, user.role)}
                              className={`p-2 rounded-xl transition-all border ${
                                user.role === "admin"
                                  ? "bg-zinc-800 border-zinc-700 text-zinc-400 hover:text-white"
                                  : "bg-orange-500/10 border-orange-500/20 text-orange-500 hover:bg-orange-500 hover:text-white"
                              }`}
                              title={user.role === "admin" ? "Revoke Admin" : "Make Admin"}
                            >
                              {user.role === "admin" ? <XCircle className="w-5 h-5" /> : <Shield className="w-5 h-5" />}
                            </button>
                            <button
                              onClick={() => deleteUser(user.uid)}
                              className="p-2 bg-zinc-800 border border-zinc-700 text-zinc-400 hover:bg-red-500 hover:border-red-500 hover:text-white rounded-xl transition-all"
                              title="Delete Profile"
                            >
                              <Trash2 className="w-5 h-5" />
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </motion.tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Pending Invites Table */}
        <div className="bg-zinc-900 border border-zinc-800 rounded-[2.5rem] overflow-hidden shadow-xl">
          <div className="p-8 border-b border-zinc-800">
            <h3 className="text-xl font-bold text-white">Pending Invites</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-zinc-800/50 border-b border-zinc-800">
                  <th className="px-8 py-5 text-xs font-bold text-zinc-500 uppercase tracking-widest">Email</th>
                  <th className="px-8 py-5 text-xs font-bold text-zinc-500 uppercase tracking-widest">Role</th>
                  <th className="px-8 py-5 text-xs font-bold text-zinc-500 uppercase tracking-widest">Status</th>
                  <th className="px-8 py-5 text-xs font-bold text-zinc-500 uppercase tracking-widest text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-800">
                {invites.filter(i => i.status === "pending").map((invite) => (
                  <motion.tr 
                    key={invite.email}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="hover:bg-zinc-800/30 transition-colors group"
                  >
                    <td className="px-8 py-6">
                      <p className="text-white font-bold">{invite.email}</p>
                    </td>
                    <td className="px-8 py-6">
                      <span className="text-xs font-bold text-zinc-400 uppercase tracking-wider">{invite.role}</span>
                    </td>
                    <td className="px-8 py-6">
                      <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider bg-yellow-500/10 text-yellow-500 border border-yellow-500/20">
                        Pending
                      </span>
                    </td>
                    <td className="px-8 py-6 text-right">
                      <button
                        onClick={() => deleteInvite(invite.email)}
                        className="p-2 bg-zinc-800 border border-zinc-700 text-zinc-400 hover:bg-red-500 hover:border-red-500 hover:text-white rounded-xl transition-all"
                        title="Cancel Invite"
                      >
                        <Trash2 className="w-5 h-5" />
                      </button>
                    </td>
                  </motion.tr>
                ))}
              </tbody>
            </table>
          </div>
          {invites.filter(i => i.status === "pending").length === 0 && (
            <div className="py-12 text-center">
              <p className="text-zinc-500 italic">No pending invites.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
