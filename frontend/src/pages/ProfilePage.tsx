import React, { useEffect, useState } from 'react';
import { User, Lock, MapPin, CreditCard, Clock, Edit, Shield, ChevronRight, Plus, Trash, Loader2, Mail } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useAuth } from '../auth/AuthContext';
import { navigate } from '../navigation';
import { api } from '../api';

type Tab = 'profile' | 'security' | 'addresses' | 'payment' | 'activity';

export default function ProfilePage() {
  const { user, role, isLoading, refreshProfile } = useAuth();
  const [activeTab, setActiveTab] = useState<Tab>('profile');
  const [isEditing, setIsEditing] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [isSavingProfile, setIsSavingProfile] = useState(false);
  const [profileForm, setProfileForm] = useState({
    email: '',
    farm_name: '',
    phone: '',
    district: '',
    state: '',
    village: '',
  });

  useEffect(() => {
    if (!user) return;
    const farm = user.farmer_profile;
    setProfileForm({
      email: user.email || '',
      farm_name: farm?.farm_name || '',
      phone: farm?.phone || '',
      district: farm?.district || '',
      state: farm?.state || '',
      village: farm?.village || '',
    });
  }, [user]);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-cream flex items-center justify-center">
        <Loader2 className="w-10 h-10 animate-spin text-forest" />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-cream flex flex-col items-center justify-center">
        <h2 className="text-2xl font-serif text-forest mb-4">Please Login</h2>
        <button 
          onClick={() => navigate('/login')}
          className="px-6 py-2 bg-forest text-cream rounded-full font-sans hover:bg-forest-600"
        >
          Go to Login
        </button>
      </div>
    );
  }

  const getInitials = (name: string) => name ? name.substring(0, 2).toUpperCase() : 'U';

  const updateProfileField = (field: keyof typeof profileForm, value: string) => {
    setProfileForm((current) => ({ ...current, [field]: value }));
  };

  const saveProfile = async () => {
    setIsSavingProfile(true);
    try {
      await api.updateProfile({
        email: profileForm.email.trim(),
        ...(role === 'farmer' ? {
          farmer_profile: {
            farm_name: profileForm.farm_name.trim(),
            phone: profileForm.phone.trim(),
            district: profileForm.district.trim(),
            state: profileForm.state.trim(),
            village: profileForm.village.trim(),
          },
        } : {}),
      });
      await refreshProfile();
      setIsEditing(false);
      showToast('Profile updated successfully');
    } catch (error) {
      showToast(error instanceof Error ? error.message : 'Unable to update profile');
    } finally {
      setIsSavingProfile(false);
    }
  };

  const renderContent = () => {
    switch (activeTab) {
      case 'profile':
        return (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="bg-white rounded-3xl p-6 md:p-8 shadow-sm border border-charcoal/10">
            <div className="flex justify-between items-start mb-8">
              <h2 className="text-2xl font-serif text-forest flex items-center">
                <User className="w-6 h-6 mr-3 text-leaf" />
                Personal Information
              </h2>
              <button 
                onClick={() => setIsEditing(!isEditing)}
                className="flex items-center text-sm font-medium text-forest-600 bg-forest/5 px-4 py-2 rounded-full hover:bg-forest/10 transition-colors"
              >
                <Edit className="w-4 h-4 mr-2" />
                {isEditing ? 'Cancel' : 'Edit Profile'}
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div className="space-y-6">
                <div>
                  <label className="block text-sm font-medium text-charcoal/60 mb-1 font-sans">Username</label>
                  {isEditing ? (
                    <input type="text" value={user.username} disabled className="w-full px-4 py-2 rounded-xl border border-charcoal/20 bg-sand/40 text-charcoal/60" />
                  ) : (
                    <div className="text-lg font-medium text-charcoal">{user.username}</div>
                  )}
                </div>
                <div>
                  <label className="block text-sm font-medium text-charcoal/60 mb-1 font-sans">Email</label>
                  {isEditing ? (
                    <input type="email" value={profileForm.email} onChange={(event) => updateProfileField('email', event.target.value)} className="w-full px-4 py-2 rounded-xl border border-charcoal/20 focus:border-forest bg-white" />
                  ) : (
                    <div className="text-lg font-medium text-charcoal">{user.email}</div>
                  )}
                </div>
                <div>
                  <label className="block text-sm font-medium text-charcoal/60 mb-1 font-sans">Account Role</label>
                  <div className="inline-block px-3 py-1 bg-harvest-soft text-charcoal rounded-md font-medium text-sm capitalize">
                    {role}
                  </div>
                </div>
              </div>

              {role === 'farmer' && (
                <div className="space-y-6 border-t md:border-t-0 md:border-l border-charcoal/10 pt-6 md:pt-0 md:pl-8">
                  <div>
                    <label className="block text-sm font-medium text-charcoal/60 mb-1 font-sans">Farm Name</label>
                    {isEditing ? (
                      <input type="text" value={profileForm.farm_name} onChange={(event) => updateProfileField('farm_name', event.target.value)} className="w-full px-4 py-2 rounded-xl border border-charcoal/20 focus:border-forest bg-white" />
                    ) : (
                      <div className="text-lg font-medium text-charcoal">{user.farmer_profile?.farm_name || 'Not provided'}</div>
                    )}
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-charcoal/60 mb-1 font-sans">Contact Phone</label>
                    {isEditing ? (
                      <input type="tel" value={profileForm.phone} onChange={(event) => updateProfileField('phone', event.target.value)} className="w-full px-4 py-2 rounded-xl border border-charcoal/20 focus:border-forest bg-white" />
                    ) : (
                      <div className="text-lg font-medium text-charcoal">{user.farmer_profile?.phone || 'Not provided'}</div>
                    )}
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-charcoal/60 mb-1 font-sans">District</label>
                      {isEditing ? (
                        <input type="text" value={profileForm.district} onChange={(event) => updateProfileField('district', event.target.value)} className="w-full px-4 py-2 rounded-xl border border-charcoal/20 focus:border-forest bg-white" />
                      ) : (
                        <div className="text-lg font-medium text-charcoal">{user.farmer_profile?.district || 'Not provided'}</div>
                      )}
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-charcoal/60 mb-1 font-sans">State</label>
                      {isEditing ? (
                        <input type="text" value={profileForm.state} onChange={(event) => updateProfileField('state', event.target.value)} className="w-full px-4 py-2 rounded-xl border border-charcoal/20 focus:border-forest bg-white" />
                      ) : (
                        <div className="text-lg font-medium text-charcoal">{user.farmer_profile?.state || 'Not provided'}</div>
                      )}
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-charcoal/60 mb-1 font-sans">Village</label>
                    {isEditing ? (
                      <input type="text" value={profileForm.village} onChange={(event) => updateProfileField('village', event.target.value)} className="w-full px-4 py-2 rounded-xl border border-charcoal/20 focus:border-forest bg-white" />
                    ) : (
                      <div className="text-lg font-medium text-charcoal">{user.farmer_profile?.village || 'Not provided'}</div>
                    )}
                  </div>
                </div>
              )}
            </div>

            {isEditing && (
              <div className="mt-8 flex justify-end">
                <button 
                  onClick={saveProfile}
                  disabled={isSavingProfile}
                  className="px-6 py-2 bg-forest text-cream rounded-full font-sans font-medium hover:bg-forest-600 transition-colors"
                >
                  {isSavingProfile ? 'Saving…' : 'Save Changes'}
                </button>
              </div>
            )}
          </motion.div>
        );
      
      case 'security':
        return (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="bg-white rounded-3xl p-6 md:p-8 shadow-sm border border-charcoal/10">
            <h2 className="text-2xl font-serif text-forest flex items-center mb-8">
              <Shield className="w-6 h-6 mr-3 text-leaf" />
              Security Settings
            </h2>
            <form onSubmit={async (e) => {
              e.preventDefault();
              const data = new FormData(e.currentTarget);
              try {
                await api.changePassword({
                  current_password: String(data.get('current_password') || ''),
                  new_password: String(data.get('new_password') || ''),
                  confirm_password: String(data.get('confirm_password') || ''),
                });
                e.currentTarget.reset();
                showToast('Password updated successfully');
              } catch (error) {
                showToast(error instanceof Error ? error.message : 'Unable to update password');
              }
            }} className="max-w-md space-y-5">
              <div>
                <label className="block text-sm font-medium text-charcoal/80 mb-1 font-sans">Current Password</label>
                <input name="current_password" type="password" required autoComplete="current-password" className="w-full px-4 py-3 rounded-xl border border-charcoal/20 focus:border-forest bg-white/50" />
              </div>
              <div>
                <label className="block text-sm font-medium text-charcoal/80 mb-1 font-sans">New Password</label>
                <input name="new_password" type="password" required minLength={8} autoComplete="new-password" className="w-full px-4 py-3 rounded-xl border border-charcoal/20 focus:border-forest bg-white/50" />
              </div>
              <div>
                <label className="block text-sm font-medium text-charcoal/80 mb-1 font-sans">Confirm New Password</label>
                <input name="confirm_password" type="password" required minLength={8} autoComplete="new-password" className="w-full px-4 py-3 rounded-xl border border-charcoal/20 focus:border-forest bg-white/50" />
              </div>
              <button type="submit" className="w-full py-3 bg-forest text-cream rounded-xl font-medium mt-4 hover:bg-forest-600 transition-colors">
                Update Password
              </button>
            </form>
          </motion.div>
        );

      case 'addresses':
        return (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
            <div className="flex justify-between items-center">
              <h2 className="text-2xl font-serif text-forest flex items-center">
                <MapPin className="w-6 h-6 mr-3 text-leaf" />
                Saved Addresses
              </h2>
              <button onClick={() => showToast('Add address modal coming soon')} className="flex items-center text-sm font-medium text-cream bg-forest px-4 py-2 rounded-full hover:bg-forest-600 transition-colors">
                <Plus className="w-4 h-4 mr-1" />
                Add New
              </button>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {[1, 2].map((addr) => (
                <div key={addr} className="bg-white rounded-3xl p-6 shadow-sm border border-charcoal/10 relative group">
                  <div className="absolute top-6 right-6 opacity-0 group-hover:opacity-100 transition-opacity flex space-x-2">
                    <button className="p-2 bg-sand rounded-full text-charcoal/60 hover:text-forest"><Edit className="w-4 h-4" /></button>
                    <button className="p-2 bg-red-50 rounded-full text-red-500 hover:text-red-600"><Trash className="w-4 h-4" /></button>
                  </div>
                  <div className="flex items-center space-x-2 mb-3">
                    <span className="px-2 py-1 bg-leaf/10 text-leaf text-xs font-bold rounded uppercase tracking-wider">{addr === 1 ? 'Home' : 'Office'}</span>
                    {addr === 1 && <span className="text-xs text-charcoal/50 font-medium">Default</span>}
                  </div>
                  <p className="font-medium text-charcoal mb-1">{user.username}</p>
                  <p className="text-charcoal/70 text-sm font-sans mb-3 line-clamp-2">
                    {addr === 1 ? '123 Farm View Road, Agri Layout, Phase 1' : '456 Business Park, Block C'}
                    <br />
                    Bangalore, Karnataka - 560001
                  </p>
                  <p className="text-sm font-medium text-charcoal/80">+91 98765 43210</p>
                </div>
              ))}
            </div>
          </motion.div>
        );

      case 'payment':
        return (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="bg-white rounded-3xl p-8 shadow-sm border border-charcoal/10 text-center">
            <div className="w-20 h-20 bg-blue-50 rounded-full flex items-center justify-center mx-auto mb-6">
              <CreditCard className="w-10 h-10 text-blue-500" />
            </div>
            <h2 className="text-2xl font-serif text-forest mb-4">Payment Methods</h2>
            <p className="text-charcoal/60 max-w-md mx-auto mb-8 font-sans">
              Manage your saved cards and UPI IDs for faster checkout. Razorpay integration coming soon.
            </p>
            <button disabled className="px-6 py-3 bg-sand text-charcoal/50 rounded-xl font-medium cursor-not-allowed">
              Add Payment Method
            </button>
          </motion.div>
        );

      case 'activity':
        const activities = [
          { title: 'Placed an order', time: '2 hours ago', type: 'order' },
          { title: 'Updated profile picture', time: 'Yesterday', type: 'profile' },
          { title: 'Logged in from new device', time: 'Oct 12, 2023', type: 'auth' },
        ];
        return (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="bg-white rounded-3xl p-6 md:p-8 shadow-sm border border-charcoal/10">
            <h2 className="text-2xl font-serif text-forest flex items-center mb-8">
              <Clock className="w-6 h-6 mr-3 text-leaf" />
              Recent Activity
            </h2>
            <div className="relative border-l-2 border-sand ml-4 space-y-8">
              {activities.map((act, i) => (
                <div key={i} className="relative pl-8">
                  <div className="absolute -left-[9px] top-1 w-4 h-4 rounded-full bg-leaf border-4 border-white shadow-sm" />
                  <p className="font-medium text-charcoal text-lg">{act.title}</p>
                  <p className="text-sm text-charcoal/50 font-sans mt-1">{act.time}</p>
                </div>
              ))}
            </div>
          </motion.div>
        );
    }
  };

  const tabs: { id: Tab; label: string; icon: React.ReactNode }[] = [
    { id: 'profile', label: 'Profile', icon: <User className="w-4 h-4 mr-2" /> },
    { id: 'security', label: 'Security', icon: <Lock className="w-4 h-4 mr-2" /> },
    { id: 'addresses', label: 'Addresses', icon: <MapPin className="w-4 h-4 mr-2" /> },
    { id: 'payment', label: 'Payment', icon: <CreditCard className="w-4 h-4 mr-2" /> },
    { id: 'activity', label: 'Activity', icon: <Clock className="w-4 h-4 mr-2" /> },
  ];

  return (
    <div className="min-h-screen bg-cream pt-24 pb-12 px-4 sm:px-6 lg:px-8 font-sans">
      <div className="max-w-6xl mx-auto">
        
        {/* Profile Header */}
        <div className="bg-forest rounded-3xl p-8 mb-8 relative overflow-hidden flex flex-col md:flex-row items-center md:items-end gap-6 shadow-xl">
          <div className="absolute top-0 right-0 w-64 h-64 bg-leaf/20 rounded-full blur-[80px]" />
          <div className="absolute bottom-0 left-10 w-40 h-40 bg-harvest/20 rounded-full blur-[60px]" />
          
          <div className="relative z-10 w-32 h-32 rounded-full bg-cream border-4 border-white shadow-lg flex items-center justify-center text-4xl font-serif text-forest">
            {getInitials(user.username)}
          </div>
          
          <div className="relative z-10 text-center md:text-left flex-1 mb-2">
            <h1 className="text-3xl md:text-4xl font-display font-bold text-cream mb-2">{user.username}</h1>
            <div className="flex flex-col md:flex-row md:items-center gap-2 md:gap-4 text-cream/80 text-sm">
              <span className="flex items-center justify-center md:justify-start">
                <Mail className="w-4 h-4 mr-1 opacity-70" /> {user.email}
              </span>
              <span className="hidden md:inline text-cream/40">•</span>
              <span className="capitalize px-3 py-1 bg-white/10 rounded-full text-xs font-medium backdrop-blur-sm self-center md:self-auto">
                {role} Account
              </span>
            </div>
          </div>
        </div>

        <div className="flex flex-col lg:flex-row gap-8">
          {/* Navigation Sidebar */}
          <div className="w-full lg:w-64 flex-shrink-0">
            <div className="flex lg:flex-col gap-2 overflow-x-auto pb-4 lg:pb-0 scrollbar-hide">
              {tabs.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center whitespace-nowrap px-5 py-4 rounded-2xl font-medium transition-all duration-300 ${
                    activeTab === tab.id 
                      ? 'bg-white text-forest shadow-sm border border-charcoal/10 translate-x-1 lg:translate-x-2' 
                      : 'text-charcoal/60 hover:bg-white/50 hover:text-charcoal'
                  }`}
                >
                  {tab.icon}
                  {tab.label}
                  {activeTab === tab.id && <ChevronRight className="w-4 h-4 ml-auto hidden lg:block opacity-50" />}
                </button>
              ))}
            </div>
          </div>

          {/* Main Content Area */}
          <div className="flex-1 min-w-0">
            <AnimatePresence mode="wait">
              <motion.div
                key={activeTab}
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.2 }}
              >
                {renderContent()}
              </motion.div>
            </AnimatePresence>
          </div>
        </div>

      </div>

      {/* Toast Notification */}
      <AnimatePresence>
        {toastMessage && (
          <motion.div
            initial={{ opacity: 0, y: 50 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 50 }}
            className="fixed bottom-6 right-6 bg-charcoal text-white px-6 py-3 rounded-xl shadow-lg font-sans z-50 flex items-center"
          >
            <Shield className="w-4 h-4 mr-2 text-leaf" />
            {toastMessage}
          </motion.div>
        )}
      </AnimatePresence>

    </div>
  );
}
