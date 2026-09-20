import React, { useState, useMemo, useEffect } from "react";
import { api } from "../api";
import { motion, AnimatePresence } from "motion/react";
import {
  Search,
  Filter,
  CheckCircle,
  XCircle,
  MoreVertical,
  ShieldCheck,
  User,
  X,
  Calendar,
  MapPin,
  Package,
  ShoppingBag,
} from "lucide-react";

const INITIAL_MOCK_USERS = [
  {
    id: 1,
    username: "harjeet_singh",
    email: "harjeet@mail.com",
    role: "farmer",
    is_verified: true,
    date_joined: "2025-03-15",
    farm_name: "Singh Organic Farm",
    phone: "+91 9876543210",
    district: "Ludhiana",
    state: "Punjab",
    village: "Phagwara",
  },
  {
    id: 2,
    username: "priya_sharma",
    email: "priya@mail.com",
    role: "consumer",
    is_verified: true,
    date_joined: "2025-05-20",
  },
  {
    id: 3,
    username: "ram_kisan",
    email: "ramkisan@agri.in",
    role: "farmer",
    is_verified: false,
    date_joined: "2025-08-01",
    farm_name: "Green Fields Agro",
    phone: "+91 9988776655",
    district: "Nashik",
    state: "Maharashtra",
    village: "Ozar",
  },
  {
    id: 4,
    username: "neha_gupta",
    email: "neha.g@mail.com",
    role: "consumer",
    is_verified: true,
    date_joined: "2025-06-10",
  },
  {
    id: 5,
    username: "kavita_devi",
    email: "kavita@farmer.in",
    role: "farmer",
    is_verified: true,
    date_joined: "2025-01-12",
    farm_name: "Devi Organics",
    phone: "+91 9123456780",
    district: "Guntur",
    state: "Andhra Pradesh",
    village: "Tenali",
  },
  {
    id: 6,
    username: "arun_patel",
    email: "arun@mail.com",
    role: "farmer",
    is_verified: false,
    date_joined: "2025-08-05",
    farm_name: "Patel Fresh Produce",
    phone: "+91 9876512345",
    district: "Surat",
    state: "Gujarat",
    village: "Bardoli",
  },
  {
    id: 7,
    username: "sunil_kumar",
    email: "sunil@mail.com",
    role: "consumer",
    is_verified: false,
    date_joined: "2025-08-06",
  },
  {
    id: 8,
    username: "meera_reddy",
    email: "meera@agrimail.com",
    role: "farmer",
    is_verified: true,
    date_joined: "2024-11-20",
    farm_name: "Reddy Farms",
    phone: "+91 9998887776",
    district: "Warangal",
    state: "Telangana",
    village: "Hasanparthy",
  },
  {
    id: 9,
    username: "vikas_yadav",
    email: "vikas.y@mail.com",
    role: "consumer",
    is_verified: true,
    date_joined: "2025-07-22",
  },
  {
    id: 10,
    username: "anita_desai",
    email: "anita.d@mail.com",
    role: "consumer",
    is_verified: true,
    date_joined: "2025-04-18",
  },
  {
    id: 11,
    username: "rajesh_chauhan",
    email: "rajesh.c@farmer.in",
    role: "farmer",
    is_verified: false,
    date_joined: "2025-08-07",
    farm_name: "Chauhan Orchards",
    phone: "+91 9765432109",
    district: "Shimla",
    state: "Himachal Pradesh",
    village: "Theog",
  },
  {
    id: 12,
    username: "divya_singh",
    email: "divya@mail.com",
    role: "consumer",
    is_verified: true,
    date_joined: "2025-02-28",
  },
  {
    id: 13,
    username: "amit_mishra",
    email: "amit.m@mail.com",
    role: "consumer",
    is_verified: false,
    date_joined: "2025-08-02",
  },
  {
    id: 14,
    username: "suresh_naidu",
    email: "suresh@agri.in",
    role: "farmer",
    is_verified: true,
    date_joined: "2025-05-15",
    farm_name: "Naidu Agro",
    phone: "+91 9848012345",
    district: "Chittoor",
    state: "Andhra Pradesh",
    village: "Madanapalle",
  },
  {
    id: 15,
    username: "pooja_joshi",
    email: "pooja.j@mail.com",
    role: "consumer",
    is_verified: true,
    date_joined: "2025-07-10",
  },
];

interface AdminUsersPageProps {
  onNavigate: (path: string) => void;
}

export default function AdminUsersPage({ onNavigate }: AdminUsersPageProps) {
  const [users, setUsers] = useState<any[]>([]);
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState<"all" | "farmer" | "consumer">(
    "all",
  );
  const [verifyFilter, setVerifyFilter] = useState<
    "all" | "verified" | "unverified"
  >("all");
  const [selectedUser, setSelectedUser] = useState<any | null>(null);
  const [toastMessage, setToastMessage] = useState("");

  useEffect(() => {
    api.adminUsers()
      .then((res) => {
        if (res && res.results) {
          const apiUsers = res.results.map((u: any) => ({
            id: u.id,
            username: u.username,
            email: u.email,
            role: u.role || "consumer",
            is_verified: u.farmer_profile?.is_verified ?? false,
            date_joined: u.date_joined ? u.date_joined.slice(0, 10) : "",
            farm_name: u.farmer_profile?.farm_name,
            phone: u.farmer_profile?.phone,
            district: u.farmer_profile?.district,
            state: u.farmer_profile?.state,
            village: u.farmer_profile?.village,
          }));
          setUsers(apiUsers);
        }
      })
      .catch((error) => showToast(error instanceof Error ? error.message : "Unable to load users."));
  }, []);

  const filteredUsers = useMemo(() => {
    return users.filter((user) => {
      const matchesSearch =
        user.username.toLowerCase().includes(search.toLowerCase()) ||
        user.email.toLowerCase().includes(search.toLowerCase());
      const matchesRole = roleFilter === "all" || user.role === roleFilter;
      const matchesVerify =
        verifyFilter === "all" ||
        (verifyFilter === "verified" ? user.is_verified : !user.is_verified);

      return matchesSearch && matchesRole && matchesVerify;
    });
  }, [users, search, roleFilter, verifyFilter]);

  const handleVerify = (id: number) => {
    api.adminVerifyFarmer(id)
      .then((res) => {
        setUsers((prev) =>
          prev.map((u) => (u.id === id ? { ...u, is_verified: res.is_verified } : u)),
        );
        showToast(res.is_verified ? "Farmer verified successfully" : "Verification updated");
      })
      .catch((error) => showToast(error instanceof Error ? error.message : "Unable to update verification."));
  };

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(""), 3000);
  };

  const getInitials = (name: string) => {
    return name
      .split("_")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .substring(0, 2);
  };

  return (
    <div className="min-h-screen bg-cream font-sans pb-12 relative overflow-hidden">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
          <div>
            <h1 className="text-3xl md:text-4xl font-serif text-forest font-bold tracking-tight">
              User Management
            </h1>
            <p className="text-charcoal/70 mt-1">
              Manage farmers and consumers across the platform. Total:{" "}
              {users.length}
            </p>
          </div>
        </div>

        {/* Filters */}
        <div className="bg-white rounded-2xl p-4 sm:p-6 border border-charcoal/10 mb-8 shadow-sm">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-charcoal/40 h-5 w-5" />
              <input
                type="text"
                placeholder="Search by name or email..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-charcoal/20 bg-cream/50 focus:outline-none focus:ring-2 focus:ring-forest/50 transition-all"
              />
            </div>

            <div className="flex flex-wrap gap-3">
              <div className="flex bg-cream/50 p-1 rounded-xl border border-charcoal/10">
                {(["all", "farmer", "consumer"] as const).map((role) => (
                  <button
                    key={role}
                    onClick={() => setRoleFilter(role)}
                    className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-colors capitalize ${
                      roleFilter === role
                        ? "bg-white text-forest shadow-sm border border-charcoal/5"
                        : "text-charcoal/60 hover:text-charcoal"
                    }`}
                  >
                    {role}
                  </button>
                ))}
              </div>

              <div className="flex bg-cream/50 p-1 rounded-xl border border-charcoal/10">
                {(["all", "verified", "unverified"] as const).map((v) => (
                  <button
                    key={v}
                    onClick={() => setVerifyFilter(v)}
                    className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-colors capitalize ${
                      verifyFilter === v
                        ? "bg-white text-forest shadow-sm border border-charcoal/5"
                        : "text-charcoal/60 hover:text-charcoal"
                    }`}
                  >
                    {v}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Desktop Table */}
        <div className="hidden md:block bg-white border border-charcoal/10 rounded-2xl overflow-hidden shadow-sm">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-sand-200/50 border-b border-charcoal/10 text-charcoal/70 text-sm font-medium uppercase tracking-wider">
                <th className="px-6 py-4">User</th>
                <th className="px-6 py-4">Role</th>
                <th className="px-6 py-4">Status</th>
                <th className="px-6 py-4">Joined</th>
                <th className="px-6 py-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-charcoal/10">
              {filteredUsers.map((user) => (
                <tr
                  key={user.id}
                  className="hover:bg-cream/30 transition-colors"
                >
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-4">
                      <div className="h-10 w-10 rounded-full bg-forest text-cream flex items-center justify-center font-bold text-sm">
                        {getInitials(user.username)}
                      </div>
                      <div>
                        <div className="font-medium text-charcoal">
                          {user.username.replace("_", " ")}
                        </div>
                        <div className="text-sm text-charcoal/60">
                          {user.email}
                        </div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span
                      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium capitalize ${
                        user.role === "farmer"
                          ? "bg-harvest-soft text-forest"
                          : "bg-blue-100 text-blue-800"
                      }`}
                    >
                      {user.role}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    {user.is_verified ? (
                      <span className="inline-flex items-center gap-1.5 text-sm font-medium text-leaf">
                        <CheckCircle className="h-4 w-4" /> Verified
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1.5 text-sm font-medium text-clay">
                        <XCircle className="h-4 w-4" /> Unverified
                      </span>
                    )}
                  </td>
                  <td className="px-6 py-4 text-sm text-charcoal/70">
                    {new Date(user.date_joined).toLocaleDateString("en-IN", {
                      day: "numeric",
                      month: "short",
                      year: "numeric",
                    })}
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex items-center justify-end gap-2">
                      {!user.is_verified && user.role === "farmer" && (
                        <button
                          onClick={() => handleVerify(user.id)}
                          className="px-3 py-1.5 bg-forest text-cream text-sm font-medium rounded-lg hover:bg-forest-600 transition-colors"
                        >
                          Verify
                        </button>
                      )}
                      <button
                        onClick={() => setSelectedUser(user)}
                        className="px-3 py-1.5 border border-charcoal/20 text-charcoal text-sm font-medium rounded-lg hover:bg-charcoal/5 transition-colors"
                      >
                        Details
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {filteredUsers.length === 0 && (
            <div className="p-8 text-center text-charcoal/50">
              No users found matching your filters.
            </div>
          )}
        </div>

        {/* Mobile Cards */}
        <div className="md:hidden space-y-4">
          {filteredUsers.map((user) => (
            <div
              key={user.id}
              className="bg-white border border-charcoal/10 rounded-2xl p-4 shadow-sm"
            >
              <div className="flex justify-between items-start mb-4">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-full bg-forest text-cream flex items-center justify-center font-bold text-sm">
                    {getInitials(user.username)}
                  </div>
                  <div>
                    <div className="font-medium text-charcoal capitalize">
                      {user.username.replace("_", " ")}
                    </div>
                    <span
                      className={`inline-flex items-center px-2 py-0.5 mt-1 rounded-full text-xs font-medium capitalize ${
                        user.role === "farmer"
                          ? "bg-harvest-soft text-forest"
                          : "bg-blue-100 text-blue-800"
                      }`}
                    >
                      {user.role}
                    </span>
                  </div>
                </div>
                {user.is_verified ? (
                  <CheckCircle className="h-5 w-5 text-leaf" />
                ) : (
                  <XCircle className="h-5 w-5 text-clay" />
                )}
              </div>

              <div className="space-y-2 mb-4 text-sm text-charcoal/70">
                <div className="flex items-center justify-between">
                  <span>Email:</span>
                  <span className="text-charcoal truncate ml-2">
                    {user.email}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span>Joined:</span>
                  <span className="text-charcoal">
                    {new Date(user.date_joined).toLocaleDateString("en-IN")}
                  </span>
                </div>
              </div>

              <div className="flex gap-2 pt-2 border-t border-charcoal/5">
                {!user.is_verified && user.role === "farmer" && (
                  <button
                    onClick={() => handleVerify(user.id)}
                    className="flex-1 py-2 bg-forest text-cream text-sm font-medium rounded-xl hover:bg-forest-600 transition-colors"
                  >
                    Verify
                  </button>
                )}
                <button
                  onClick={() => setSelectedUser(user)}
                  className="flex-1 py-2 border border-charcoal/20 text-charcoal text-sm font-medium rounded-xl hover:bg-charcoal/5 transition-colors"
                >
                  View Details
                </button>
              </div>
            </div>
          ))}
          {filteredUsers.length === 0 && (
            <div className="text-center py-8 text-charcoal/50">
              No users found matching your filters.
            </div>
          )}
        </div>
      </div>

      {/* Slide-over Panel */}
      <AnimatePresence>
        {selectedUser && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setSelectedUser(null)}
              className="fixed inset-0 bg-charcoal/30 backdrop-blur-sm z-40"
            />
            <motion.div
              initial={{ x: "100%" }}
              animate={{ x: 0 }}
              exit={{ x: "100%" }}
              transition={{ type: "spring", damping: 25, stiffness: 200 }}
              className="fixed right-0 top-0 h-full w-full max-w-md bg-white shadow-2xl z-50 overflow-y-auto border-l border-charcoal/10"
            >
              <div className="p-6">
                <div className="flex items-center justify-between mb-8">
                  <h2 className="text-2xl font-serif font-bold text-forest">
                    User Details
                  </h2>
                  <button
                    onClick={() => setSelectedUser(null)}
                    className="p-2 hover:bg-sand rounded-full transition-colors"
                  >
                    <X className="h-5 w-5 text-charcoal/60" />
                  </button>
                </div>

                <div className="flex flex-col items-center text-center mb-8">
                  <div className="h-20 w-20 rounded-full bg-forest text-cream flex items-center justify-center text-2xl font-bold mb-4 shadow-md">
                    {getInitials(selectedUser.username)}
                  </div>
                  <h3 className="text-xl font-bold text-charcoal capitalize">
                    {selectedUser.username.replace("_", " ")}
                  </h3>
                  <p className="text-charcoal/60">{selectedUser.email}</p>
                  <div className="flex items-center gap-2 mt-3">
                    <span
                      className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium capitalize ${
                        selectedUser.role === "farmer"
                          ? "bg-harvest-soft text-forest"
                          : "bg-blue-100 text-blue-800"
                      }`}
                    >
                      {selectedUser.role}
                    </span>
                    {selectedUser.is_verified ? (
                      <span className="inline-flex items-center gap-1 px-3 py-1 bg-green-100 text-green-800 rounded-full text-sm font-medium">
                        <ShieldCheck className="h-4 w-4" /> Verified
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 px-3 py-1 bg-red-100 text-red-800 rounded-full text-sm font-medium">
                        <XCircle className="h-4 w-4" /> Unverified
                      </span>
                    )}
                  </div>
                </div>

                <div className="space-y-6">
                  <div className="bg-sand-200/50 p-4 rounded-2xl">
                    <h4 className="font-bold text-charcoal mb-4 flex items-center gap-2">
                      <User className="h-4 w-4" /> Basic Info
                    </h4>
                    <div className="space-y-3 text-sm">
                      <div className="flex justify-between border-b border-charcoal/5 pb-2">
                        <span className="text-charcoal/60">Joined Date</span>
                        <span className="font-medium text-charcoal flex items-center gap-1">
                          <Calendar className="h-3.5 w-3.5" />
                          {new Date(
                            selectedUser.date_joined,
                          ).toLocaleDateString("en-IN", {
                            day: "numeric",
                            month: "long",
                            year: "numeric",
                          })}
                        </span>
                      </div>
                      <div className="flex justify-between pb-2">
                        <span className="text-charcoal/60">User ID</span>
                        <span className="font-medium text-charcoal">
                          #{selectedUser.id.toString().padStart(4, "0")}
                        </span>
                      </div>
                    </div>
                  </div>

                  {selectedUser.role === "farmer" && (
                    <div className="bg-sand-200/50 p-4 rounded-2xl">
                      <h4 className="font-bold text-charcoal mb-4 flex items-center gap-2">
                        <MapPin className="h-4 w-4" /> Farm Details
                      </h4>
                      <div className="space-y-3 text-sm">
                        <div className="flex justify-between border-b border-charcoal/5 pb-2">
                          <span className="text-charcoal/60">Farm Name</span>
                          <span className="font-medium text-charcoal text-right">
                            {selectedUser.farm_name}
                          </span>
                        </div>
                        <div className="flex justify-between border-b border-charcoal/5 pb-2">
                          <span className="text-charcoal/60">Phone</span>
                          <span className="font-medium text-charcoal">
                            {selectedUser.phone}
                          </span>
                        </div>
                        <div className="flex justify-between pb-2">
                          <span className="text-charcoal/60">Location</span>
                          <span className="font-medium text-charcoal text-right">
                            {selectedUser.village}, {selectedUser.district}
                            <br />
                            <span className="text-charcoal/60">
                              {selectedUser.state}
                            </span>
                          </span>
                        </div>
                      </div>
                    </div>
                  )}

                  <div className="bg-sand-200/50 p-4 rounded-2xl">
                    <h4 className="font-bold text-charcoal mb-4 flex items-center gap-2">
                      <Package className="h-4 w-4" /> Activity Summary
                    </h4>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="bg-white p-3 rounded-xl border border-charcoal/5 flex flex-col items-center justify-center text-center">
                        <Package className="h-6 w-6 text-leaf mb-2" />
                        <span className="text-2xl font-display font-bold text-forest">
                          {selectedUser.role === "farmer" ? "12" : "0"}
                        </span>
                        <span className="text-xs text-charcoal/60 uppercase tracking-wide">
                          {selectedUser.role === "farmer"
                            ? "Products Listed"
                            : "Reviews Given"}
                        </span>
                      </div>
                      <div className="bg-white p-3 rounded-xl border border-charcoal/5 flex flex-col items-center justify-center text-center">
                        <ShoppingBag className="h-6 w-6 text-harvest mb-2" />
                        <span className="text-2xl font-display font-bold text-forest">
                          {selectedUser.role === "farmer" ? "34" : "18"}
                        </span>
                        <span className="text-xs text-charcoal/60 uppercase tracking-wide">
                          {selectedUser.role === "farmer"
                            ? "Orders Received"
                            : "Orders Placed"}
                        </span>
                      </div>
                    </div>
                  </div>

                  {!selectedUser.is_verified &&
                    selectedUser.role === "farmer" && (
                      <div className="pt-4">
                        <button
                          onClick={() => {
                            handleVerify(selectedUser.id);
                            setSelectedUser({
                              ...selectedUser,
                              is_verified: true,
                            });
                          }}
                          className="w-full py-3 bg-forest text-cream font-medium rounded-xl hover:bg-forest-600 transition-colors shadow-sm flex justify-center items-center gap-2"
                        >
                          <ShieldCheck className="h-5 w-5" /> Verify Farmer
                          Account
                        </button>
                      </div>
                    )}
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Toast */}
      <AnimatePresence>
        {toastMessage && (
          <motion.div
            initial={{ opacity: 0, y: 50 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 50 }}
            className="fixed bottom-6 left-1/2 -translate-x-1/2 bg-charcoal text-white px-6 py-3 rounded-full shadow-xl font-medium text-sm z-50 flex items-center gap-2"
          >
            <CheckCircle className="h-4 w-4 text-leaf" />
            {toastMessage}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
