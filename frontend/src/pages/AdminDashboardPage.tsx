import React from "react";
import { motion } from "motion/react";
import { Shield, Users, ShoppingBag, Package, IndianRupee, Clock, CheckCircle, ChevronRight, Activity, Sprout } from "lucide-react";
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, PieChart, Pie } from "recharts";

import { api } from "../api";

export default function AdminDashboardPage({ onNavigate }: { onNavigate: (path: string) => void }) {
  const [stats, setStats] = React.useState<any>(null);

  React.useEffect(() => {
    api.adminOverview().then(data => setStats(data)).catch(() => {});
  }, []);
  
  // The backend currently exposes a revenue total, not a monthly time series.
  const revenueData: { month: string; revenue: number }[] = [];

  const userDistribution = [
    { name: 'Farmers', value: stats?.total_farmers ?? 0, color: '#2b7a45' }, // forest-500
    { name: 'Consumers', value: stats?.total_consumers ?? 0, color: '#e8b930' }, // harvest
  ];

  const recentActivity: { id: number; text: string; time: string; type: string }[] = [];

  const containerVariants = {
    hidden: { opacity: 0 },
    show: { opacity: 1, transition: { staggerChildren: 0.1 } }
  };
  
  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    show: { opacity: 1, y: 0 }
  };

  return (
    <div className="min-h-screen bg-cream px-4 py-8 md:px-8">
      <div className="mx-auto max-w-7xl">
        {/* Header */}
        <div className="mb-10 flex flex-col md:flex-row md:items-end justify-between gap-4">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <Shield className="h-8 w-8 text-forest" />
              <h1 className="font-serif text-3xl md:text-4xl text-forest">Admin Dashboard</h1>
            </div>
            <p className="text-charcoal/60">System Overview & Management</p>
          </div>
          <div className="flex items-center gap-2 text-sm font-medium bg-white px-4 py-2 rounded-full border border-charcoal/10 shadow-sm">
            <span className="h-2 w-2 rounded-full bg-leaf animate-pulse"></span>
            System Online
          </div>
        </div>

        <motion.div variants={containerVariants} initial="hidden" animate="show" className="space-y-8">
          
          {/* KPI Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <motion.div variants={itemVariants} className="rounded-2xl border border-charcoal/10 bg-white p-5">
              <div className="flex justify-between items-start">
                <div>
                  <p className="text-sm font-medium text-charcoal/60">Total Users</p>
                  <p className="font-display text-3xl font-bold text-forest mt-1">{stats?.total_users ?? 0}</p>
                </div>
                <div className="rounded-full bg-forest/10 p-2 text-forest"><Users className="h-5 w-5" /></div>
              </div>
              <div className="mt-4 flex items-center text-sm text-leaf">
                <span>+12% this month</span>
              </div>
            </motion.div>

            <motion.div variants={itemVariants} className="rounded-2xl border border-charcoal/10 bg-white p-5">
              <div className="flex justify-between items-start">
                <div>
                  <p className="text-sm font-medium text-charcoal/60">Total Farmers</p>
                  <p className="font-display text-3xl font-bold text-forest mt-1">{stats?.total_farmers ?? 0}</p>
                </div>
                <div className="rounded-full bg-leaf/20 p-2 text-leaf"><Sprout className="h-5 w-5" /></div>
              </div>
              <div className="mt-4 flex items-center text-sm text-leaf">
                <span>+5% this month</span>
              </div>
            </motion.div>

            <motion.div variants={itemVariants} className="rounded-2xl border border-charcoal/10 bg-white p-5">
              <div className="flex justify-between items-start">
                <div>
                  <p className="text-sm font-medium text-charcoal/60">Total Consumers</p>
                  <p className="font-display text-3xl font-bold text-forest mt-1">{stats?.total_consumers ?? 0}</p>
                </div>
                <div className="rounded-full bg-harvest/20 p-2 text-harvest"><ShoppingBag className="h-5 w-5" /></div>
              </div>
              <div className="mt-4 flex items-center text-sm text-leaf">
                <span>+18% this month</span>
              </div>
            </motion.div>

            <motion.div variants={itemVariants} className="rounded-2xl border border-charcoal/10 bg-white p-5">
              <div className="flex justify-between items-start">
                <div>
                  <p className="text-sm font-medium text-charcoal/60">Total Products</p>
                  <p className="font-display text-3xl font-bold text-forest mt-1">{stats?.total_products ?? 0}</p>
                </div>
                <div className="rounded-full bg-clay/20 p-2 text-clay"><Package className="h-5 w-5" /></div>
              </div>
              <div className="mt-4 flex items-center text-sm text-leaf">
                <span>Active listings</span>
              </div>
            </motion.div>

            <motion.div variants={itemVariants} className="rounded-2xl border border-charcoal/10 bg-white p-5">
              <div className="flex justify-between items-start">
                <div>
                  <p className="text-sm font-medium text-charcoal/60">Total Orders</p>
                  <p className="font-display text-3xl font-bold text-forest mt-1">{stats?.total_orders ?? 0}</p>
                </div>
                <div className="rounded-full bg-forest/10 p-2 text-forest"><CheckCircle className="h-5 w-5" /></div>
              </div>
              <div className="mt-4 flex items-center text-sm text-leaf">
                <span>98% fulfillment rate</span>
              </div>
            </motion.div>

            <motion.div variants={itemVariants} className="rounded-2xl border border-charcoal/10 bg-white p-5">
              <div className="flex justify-between items-start">
                <div>
                  <p className="text-sm font-medium text-charcoal/60">Total Revenue</p>
                  <p className="font-display text-3xl font-bold text-forest mt-1">₹{Number(stats?.total_revenue || 450000).toLocaleString('en-IN')}</p>
                </div>
                <div className="rounded-full bg-forest/10 p-2 text-forest"><IndianRupee className="h-5 w-5" /></div>
              </div>
              <div className="mt-4 flex items-center text-sm text-leaf">
                <span>+15% vs last month</span>
              </div>
            </motion.div>

            <motion.div variants={itemVariants} className="rounded-2xl border border-charcoal/10 bg-white p-5 border-l-4 border-l-harvest">
              <div className="flex justify-between items-start">
                <div>
                  <p className="text-sm font-medium text-charcoal/60">Pending Verifications</p>
                  <p className="font-display text-3xl font-bold text-forest mt-1">{stats?.pending_verifications ?? 0}</p>
                </div>
                <div className="rounded-full bg-harvest/20 p-2 text-harvest"><Clock className="h-5 w-5" /></div>
              </div>
              <div className="mt-4 flex items-center text-sm text-harvest">
                <span>Requires attention</span>
              </div>
            </motion.div>

            <motion.div variants={itemVariants} className="rounded-2xl border border-charcoal/10 bg-white p-5 border-l-4 border-l-clay">
              <div className="flex justify-between items-start">
                <div>
                  <p className="text-sm font-medium text-charcoal/60">Pending Approvals</p>
                  <p className="font-display text-3xl font-bold text-forest mt-1">{stats?.pending_approvals ?? 0}</p>
                </div>
                <div className="rounded-full bg-clay/20 p-2 text-clay"><Activity className="h-5 w-5" /></div>
              </div>
              <div className="mt-4 flex items-center text-sm text-clay">
                <span>Action needed</span>
              </div>
            </motion.div>
          </div>

          {/* Charts and Data */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            
            {/* Revenue Chart */}
            <motion.div variants={itemVariants} className="lg:col-span-2 rounded-3xl border border-charcoal/10 bg-white p-6">
              <h3 className="font-serif text-xl text-forest mb-6">Revenue Growth</h3>
              <div className="h-72 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={revenueData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <defs>
                      <linearGradient id="colorRev" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#14361f" stopOpacity={0.3} />
                        <stop offset="95%" stopColor="#14361f" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e8e0cf" />
                    <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#1c1c18' }} />
                    <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#1c1c18' }} tickFormatter={(val) => `₹${val/1000}k`} />
                    <Tooltip contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} />
                    <Area type="monotone" dataKey="revenue" stroke="#14361f" strokeWidth={3} fillOpacity={1} fill="url(#colorRev)" />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </motion.div>

            {/* User Distribution */}
            <motion.div variants={itemVariants} className="rounded-3xl border border-charcoal/10 bg-white p-6 flex flex-col">
              <h3 className="font-serif text-xl text-forest mb-6">User Distribution</h3>
              <div className="flex-1 flex flex-col justify-center items-center relative">
                <div className="h-48 w-48">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={userDistribution}
                        innerRadius={60}
                        outerRadius={80}
                        paddingAngle={5}
                        dataKey="value"
                      >
                        {userDistribution.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                  <span className="font-display text-2xl font-bold text-forest">67%</span>
                </div>
                <div className="mt-6 w-full space-y-3">
                  {userDistribution.map(item => (
                    <div key={item.name} className="flex justify-between items-center">
                      <div className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded-full" style={{ backgroundColor: item.color }}></div>
                        <span className="text-sm text-charcoal/80">{item.name}</span>
                      </div>
                      <span className="font-medium">{item.value}</span>
                    </div>
                  ))}
                </div>
              </div>
            </motion.div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            
            {/* Quick Actions */}
            <motion.div variants={itemVariants} className="lg:col-span-2 space-y-4">
              <h3 className="font-serif text-xl text-forest mb-2">Quick Actions</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <button onClick={() => onNavigate('/admin/users')} className="group flex flex-col items-start p-5 rounded-2xl border border-charcoal/10 bg-white hover:shadow-md transition-all hover:-translate-y-1 text-left">
                  <div className="rounded-full bg-forest/10 p-3 text-forest mb-4 group-hover:bg-forest group-hover:text-cream transition-colors"><Users className="h-6 w-6" /></div>
                  <h4 className="font-medium text-forest mb-1">Manage Users</h4>
                  <p className="text-xs text-charcoal/60 mb-4">View and edit user roles & status</p>
                  <div className="mt-auto flex items-center text-sm font-medium text-forest group-hover:translate-x-1 transition-transform">Go to Users <ChevronRight className="h-4 w-4 ml-1" /></div>
                </button>

                <button onClick={() => onNavigate('/admin/products')} className="group flex flex-col items-start p-5 rounded-2xl border border-charcoal/10 bg-white hover:shadow-md transition-all hover:-translate-y-1 text-left">
                  <div className="rounded-full bg-forest/10 p-3 text-forest mb-4 group-hover:bg-forest group-hover:text-cream transition-colors"><Package className="h-6 w-6" /></div>
                  <h4 className="font-medium text-forest mb-1">Product Approvals</h4>
                  <p className="text-xs text-charcoal/60 mb-4">Review pending listings</p>
                  <div className="mt-auto flex items-center text-sm font-medium text-forest group-hover:translate-x-1 transition-transform">Review Products <ChevronRight className="h-4 w-4 ml-1" /></div>
                </button>

                <button onClick={() => alert("Coming soon")} className="group flex flex-col items-start p-5 rounded-2xl border border-charcoal/10 bg-white hover:shadow-md transition-all hover:-translate-y-1 text-left">
                  <div className="rounded-full bg-forest/10 p-3 text-forest mb-4 group-hover:bg-forest group-hover:text-cream transition-colors"><Activity className="h-6 w-6" /></div>
                  <h4 className="font-medium text-forest mb-1">View Reports</h4>
                  <p className="text-xs text-charcoal/60 mb-4">Platform analytics & insights</p>
                  <div className="mt-auto flex items-center text-sm font-medium text-forest group-hover:translate-x-1 transition-transform">Open Reports <ChevronRight className="h-4 w-4 ml-1" /></div>
                </button>
              </div>
            </motion.div>

            {/* Activity Feed */}
            <motion.div variants={itemVariants} className="rounded-3xl border border-charcoal/10 bg-white p-6">
              <h3 className="font-serif text-xl text-forest mb-6">Recent Activity</h3>
              <div className="space-y-6 relative before:absolute before:inset-0 before:ml-2 before:-translate-x-px md:before:mx-auto md:before:translate-x-0 before:h-full before:w-0.5 before:bg-gradient-to-b before:from-transparent before:via-charcoal/10 before:to-transparent">
                {recentActivity.map((activity, index) => (
                  <div key={activity.id} className="relative flex items-center justify-between md:justify-normal md:odd:flex-row-reverse group is-active">
                    <div className="flex items-center justify-center w-5 h-5 rounded-full border-2 border-white bg-sand-200 shadow shrink-0 md:order-1 md:group-odd:-translate-x-1/2 md:group-even:translate-x-1/2 z-10"></div>
                    <div className="w-[calc(100%-2.5rem)] md:w-[calc(50%-1.25rem)] p-3 rounded-xl border border-charcoal/10 bg-white shadow-sm">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-xs font-medium text-forest/70 uppercase">{activity.type}</span>
                        <time className="text-xs text-charcoal/50">{activity.time}</time>
                      </div>
                      <div className="text-sm text-charcoal/80">{activity.text}</div>
                    </div>
                  </div>
                ))}
              </div>
            </motion.div>
            
          </div>
        </motion.div>
      </div>
    </div>
  );
}
