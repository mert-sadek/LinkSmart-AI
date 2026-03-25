import { useState, useEffect } from "react";
import { 
  collection, 
  query, 
  onSnapshot, 
  doc, 
  updateDoc, 
  deleteDoc,
  orderBy
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
  XCircle
} from "lucide-react";
import { motion } from "motion/react";
import { toast } from "sonner";

interface UserProfile {
  uid: string;
  email: string;
  role: string;
  createdAt: any;
  displayName?: string;
}

export default function UsersManagement() {
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");

  useEffect(() => {
    const q = query(collection(db, "users"), orderBy("createdAt", "desc"));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const usersData = snapshot.docs.map(doc => ({
        ...doc.data()
      })) as UserProfile[];
      setUsers(usersData);
      setLoading(false);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, "users");
    });

    return () => unsubscribe();
  }, []);

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

        <div className="relative w-full md:w-80">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-zinc-500" />
          <input
            type="text"
            placeholder="Search users..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-zinc-900 border border-zinc-800 rounded-2xl py-3 pl-12 pr-4 text-white focus:outline-none focus:ring-2 focus:ring-orange-500/50 transition-all"
          />
        </div>
      </header>

      <div className="bg-zinc-900 border border-zinc-800 rounded-[2.5rem] overflow-hidden shadow-xl">
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
                    </div>
                  </td>
                </motion.tr>
              ))}
            </tbody>
          </table>
        </div>
        {filteredUsers.length === 0 && (
          <div className="py-20 text-center">
            <p className="text-zinc-500 italic">No users found matching your search.</p>
          </div>
        )}
      </div>
    </div>
  );
}
