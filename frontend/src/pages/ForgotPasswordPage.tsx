import React, { useState, useRef, useEffect } from 'react';
import { ArrowLeft, Mail, Key, Lock, CheckCircle2 } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { navigate } from '../navigation';
import { api } from '../api';

export default function ForgotPasswordPage() {
  const [step, setStep] = useState(1);
  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState(['', '', '', '', '', '']);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [resetToken, setResetToken] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const otpRefs = useRef<(HTMLInputElement | null)[]>([]);

  const handleBack = () => {
    navigate('/login');
  };

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  const handleEmailSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      const response = await api.sendPasswordResetOtp(email);
      showToast(response.message);
      setStep(2);
    } catch (error: any) {
      showToast(error.message ?? 'Unable to send the verification code.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleOtpSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const code = otp.join('');
    if (code.length !== 6) return;
    setIsSubmitting(true);
    try {
      const response = await api.verifyPasswordResetOtp(email, code);
      setResetToken(response.reset_token);
      setStep(3);
    } catch (error: any) {
      showToast(error.message ?? 'The verification code is invalid.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handlePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword !== confirmPassword) {
      showToast('Passwords do not match');
      return;
    }
    setIsSubmitting(true);
    try {
      await api.resetPassword(email, resetToken, newPassword);
      setStep(4);
    } catch (error: any) {
      showToast(error.message ?? 'Unable to update the password.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleOtpChange = (index: number, value: string) => {
    if (value.length > 1) return; // Prevent multiple chars
    const newOtp = [...otp];
    newOtp[index] = value;
    setOtp(newOtp);

    // Auto-focus next input
    if (value && index < 5) {
      otpRefs.current[index + 1]?.focus();
    }
  };

  const handleOtpKeyDown = (index: number, e: React.KeyboardEvent) => {
    if (e.key === 'Backspace' && !otp[index] && index > 0) {
      otpRefs.current[index - 1]?.focus();
    }
  };

  return (
    <div className="min-h-screen bg-cream flex items-center justify-center p-4 relative overflow-hidden">
      {/* Background decorations */}
      <div className="absolute top-[10%] right-[10%] w-96 h-96 bg-leaf/20 rounded-full blur-[100px]" />
      <div className="absolute bottom-[10%] left-[10%] w-96 h-96 bg-clay/20 rounded-full blur-[100px]" />

      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="w-full max-w-md relative z-10"
      >
        <div className="bg-white/80 backdrop-blur-xl border border-charcoal/10 rounded-3xl shadow-xl overflow-hidden relative">
          <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-forest to-leaf" />

          <div className="p-8">
            <button
              onClick={handleBack}
              className="flex items-center text-sm text-forest-600 hover:text-forest mb-8 transition-colors font-sans"
            >
              <ArrowLeft className="w-4 h-4 mr-1" />
              Back to Login
            </button>

            {step < 4 && (
              <div className="flex justify-between items-center mb-8 relative">
                <div className="absolute left-0 top-1/2 -translate-y-1/2 w-full h-1 bg-sand -z-10 rounded-full" />
                <div 
                  className="absolute left-0 top-1/2 -translate-y-1/2 h-1 bg-forest -z-10 rounded-full transition-all duration-500"
                  style={{ width: `${(step - 1) * 50}%` }}
                />
                {[1, 2, 3].map((num) => (
                  <div 
                    key={num} 
                    className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm transition-colors duration-300 ${step >= num ? 'bg-forest text-cream' : 'bg-sand text-charcoal/40'}`}
                  >
                    {num}
                  </div>
                ))}
              </div>
            )}

            <AnimatePresence mode="wait">
              {step === 1 && (
                <motion.div
                  key="step1"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                >
                  <div className="flex items-center mb-4 text-forest">
                    <Mail className="w-8 h-8 mr-3" />
                    <h2 className="text-2xl font-serif">Reset Password</h2>
                  </div>
                  <p className="text-charcoal/60 font-sans mb-6">
                    Enter the email address associated with your account. We'll send you an OTP to reset your password.
                  </p>
                  <form onSubmit={handleEmailSubmit} className="space-y-4">
                    <div>
                      <input
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        className="w-full px-4 py-3 rounded-xl border border-charcoal/20 focus:outline-none focus:border-forest focus:ring-1 focus:ring-forest bg-white/50 font-sans"
                        placeholder="Email address"
                        required
                      />
                    </div>
                    <button disabled={isSubmitting} type="submit" className="w-full bg-forest text-cream py-3 rounded-xl font-medium font-sans hover:bg-forest-600 transition-colors disabled:opacity-60">
                      {isSubmitting ? 'Sending…' : 'Send OTP'}
                    </button>
                  </form>
                </motion.div>
              )}

              {step === 2 && (
                <motion.div
                  key="step2"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                >
                  <div className="flex items-center mb-4 text-forest">
                    <Key className="w-8 h-8 mr-3" />
                    <h2 className="text-2xl font-serif">Enter OTP</h2>
                  </div>
                  <p className="text-charcoal/60 font-sans mb-6">
                    Enter the 6-digit verification code sent to {email}
                  </p>
                  <form onSubmit={handleOtpSubmit} className="space-y-6">
                    <div className="flex justify-between gap-2">
                      {otp.map((digit, idx) => (
                        <input
                          key={idx}
                          ref={(el) => { otpRefs.current[idx] = el; }}
                          type="text"
                          value={digit}
                          onChange={(e) => handleOtpChange(idx, e.target.value)}
                          onKeyDown={(e) => handleOtpKeyDown(idx, e)}
                          className="w-12 h-14 text-center text-xl font-bold rounded-xl border border-charcoal/20 focus:outline-none focus:border-forest focus:ring-1 focus:ring-forest bg-white/50"
                          maxLength={1}
                          required
                        />
                      ))}
                    </div>
                    <button disabled={isSubmitting} type="submit" className="w-full bg-forest text-cream py-3 rounded-xl font-medium font-sans hover:bg-forest-600 transition-colors disabled:opacity-60">
                      {isSubmitting ? 'Verifying…' : 'Verify OTP'}
                    </button>
                  </form>
                </motion.div>
              )}

              {step === 3 && (
                <motion.div
                  key="step3"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                >
                  <div className="flex items-center mb-4 text-forest">
                    <Lock className="w-8 h-8 mr-3" />
                    <h2 className="text-2xl font-serif">New Password</h2>
                  </div>
                  <p className="text-charcoal/60 font-sans mb-6">
                    Create a strong new password for your account.
                  </p>
                  <form onSubmit={handlePasswordSubmit} className="space-y-4">
                    <div>
                      <input
                        type="password"
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        className="w-full px-4 py-3 rounded-xl border border-charcoal/20 focus:outline-none focus:border-forest focus:ring-1 focus:ring-forest bg-white/50 font-sans"
                        placeholder="New password"
                        required
                        minLength={6}
                      />
                    </div>
                    <div>
                      <input
                        type="password"
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        className="w-full px-4 py-3 rounded-xl border border-charcoal/20 focus:outline-none focus:border-forest focus:ring-1 focus:ring-forest bg-white/50 font-sans"
                        placeholder="Confirm new password"
                        required
                      />
                    </div>
                    <button disabled={isSubmitting} type="submit" className="w-full bg-forest text-cream py-3 rounded-xl font-medium font-sans hover:bg-forest-600 transition-colors disabled:opacity-60">
                      {isSubmitting ? 'Updating…' : 'Update Password'}
                    </button>
                  </form>
                </motion.div>
              )}

              {step === 4 && (
                <motion.div
                  key="step4"
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="text-center py-6"
                >
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ type: 'spring', damping: 12, delay: 0.2 }}
                  >
                    <CheckCircle2 className="w-20 h-20 text-forest mx-auto mb-6" />
                  </motion.div>
                  <h2 className="text-3xl font-serif text-forest mb-4">Password Reset!</h2>
                  <p className="text-charcoal/60 font-sans mb-8">
                    Your password has been successfully updated. You can now login with your new credentials.
                  </p>
                  <button onClick={handleBack} className="w-full bg-forest text-cream py-3 rounded-xl font-medium font-sans hover:bg-forest-600 transition-colors">
                    Return to Login
                  </button>
                </motion.div>
              )}
            </AnimatePresence>

          </div>
        </div>
      </motion.div>

      <AnimatePresence>
        {toastMessage && (
          <motion.div
            initial={{ opacity: 0, y: 50 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 50 }}
            className="fixed bottom-6 bg-charcoal text-white px-6 py-3 rounded-xl shadow-lg font-sans z-50"
          >
            {toastMessage}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
