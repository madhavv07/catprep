import React, { useState } from "react";
import {
  X,
  Mail,
  Lock,
  KeyRound,
  AlertCircle,
  AlertTriangle,
  CheckCircle2,
  ArrowRight,
  Eye,
  EyeOff,
  RefreshCw,
  Shield,
} from "lucide-react";
import { useAuth } from "../../context/AuthContext";
import { generateBreachFreePassword } from "../admin/ManageAdminsView";

interface ForgotPasswordModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (studentId?: string) => void;
}

export const ForgotPasswordModal: React.FC<ForgotPasswordModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
}) => {
  const { requestPasswordResetOtp, verifyAndResetPassword } = useAuth();

  const [step, setStep] = useState<"REQUEST" | "VERIFY">("REQUEST");
  const [identifier, setIdentifier] = useState("");
  const [resetToken, setResetToken] = useState("");
  const [maskedEmail, setMaskedEmail] = useState("");
  const [otpCode, setOtpCode] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [showPassword, setShowPassword] = useState(true);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [otpWarning, setOtpWarning] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleRequestOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccessMsg(null);
    setOtpWarning(null);

    const cleanId = identifier.trim();
    if (!cleanId) {
      setError("Please enter your Student ID or registered email address.");
      return;
    }

    setLoading(true);
    try {
      const res = await requestPasswordResetOtp(cleanId);
      if (res.success && res.resetToken) {
        setResetToken(res.resetToken);
        setMaskedEmail(res.maskedEmail || "your registered email");
        setOtpWarning(res.warning || null);
        setOtpCode("");
        setNewPassword(generateBreachFreePassword());
        setStep("VERIFY");
      } else {
        setError(res.error || "Could not find a student account with that information.");
      }
    } catch (err: any) {
      setError(err.message || "Failed to request OTP. Please verify your network.");
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyAndReset = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccessMsg(null);

    const cleanOtp = otpCode.trim();
    const cleanPass = newPassword.trim();

    if (!cleanOtp || cleanOtp.length < 6) {
      setError("Please enter the 6-digit verification code sent to your email.");
      return;
    }
    if (!cleanPass || cleanPass.length < 6) {
      setError("New password must be at least 6 characters long.");
      return;
    }

    setLoading(true);
    try {
      const res = await verifyAndResetPassword(resetToken, cleanOtp, cleanPass);
      if (res.success) {
        setSuccessMsg("Password updated successfully! You can now sign in.");
        setTimeout(() => {
          onSuccess(identifier);
          onClose();
        }, 1800);
      } else {
        setError(res.error || "Invalid OTP code. Please try again.");
      }
    } catch (err: any) {
      setError(err.message || "Password update failed.");
    } finally {
      setLoading(false);
    }
  };

  const resetStateAndClose = () => {
    setStep("REQUEST");
    setIdentifier("");
    setResetToken("");
    setOtpCode("");
    setNewPassword("");
    setError(null);
    setSuccessMsg(null);
    setOtpWarning(null);
    onClose();
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200"
      onClick={resetStateAndClose}
    >
      <div
        className="w-full max-w-md p-6 glass-panel rounded-2xl border border-white/[0.12] shadow-2xl space-y-5 animate-card-modal"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-indigo-500/15 border border-indigo-500/30 flex items-center justify-center text-indigo-400">
              <KeyRound className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white tracking-tight">
                Reset Account Password
              </h3>
              <p className="text-xs text-zinc-400 mt-0.5">
                {step === "REQUEST"
                  ? "Enter your Student ID to receive an OTP code"
                  : `Enter the code sent to ${maskedEmail}`}
              </p>
            </div>
          </div>

          <button
            onClick={resetStateAndClose}
            className="p-1.5 text-zinc-400 hover:text-white rounded-lg hover:bg-white/[0.06] transition cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Feedback alerts */}
        {error && (
          <div className="p-3 bg-rose-500/10 border border-rose-500/30 rounded-xl text-xs text-rose-300 flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {successMsg && (
          <div className="p-3 bg-emerald-500/10 border border-emerald-500/30 rounded-xl text-xs text-emerald-300 flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>{successMsg}</span>
          </div>
        )}

        {/* Step 1: Request OTP */}
        {step === "REQUEST" && (
          <form onSubmit={handleRequestOtp} className="space-y-4">
            <div>
              <label className="block text-[11px] font-bold text-zinc-400 uppercase tracking-wider mb-1.5">
                Student ID or Registered Email
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 text-zinc-500 absolute left-3.5 top-3.5" />
                <input
                  type="text"
                  value={identifier}
                  onChange={(e) => setIdentifier(e.target.value)}
                  placeholder="e.g. CAT2701-02 or student@gmail.com"
                  className="w-full pl-10 pr-4 py-3 text-xs glass-input rounded-xl text-white placeholder:text-zinc-600 font-mono focus:outline-none focus:border-indigo-500"
                  autoFocus
                  required
                />
              </div>
              <span className="text-[10px] text-zinc-500 mt-1.5 block">
                A single-use 6-digit verification code will be sent to your registered email.
              </span>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 btn-primary-glass font-bold text-xs rounded-xl flex items-center justify-center gap-2 transition cursor-pointer disabled:opacity-50"
            >
              {loading ? (
                <span className="flex items-center gap-2">
                  <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  Sending code...
                </span>
              ) : (
                <>
                  <span>Send Verification Code</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>
        )}

        {/* Step 2: Verify OTP and Set New Password */}
        {step === "VERIFY" && (
          <form onSubmit={handleVerifyAndReset} className="space-y-4">
            {otpWarning && (
              <div className="p-3 bg-amber-500/10 border border-amber-500/30 rounded-xl text-xs text-amber-300 space-y-1">
                <div className="flex items-center gap-1.5 font-bold">
                  <AlertTriangle className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                  <span>Email Notice</span>
                </div>
                <p className="text-[11px] text-zinc-400 leading-relaxed">
                  {otpWarning}
                </p>
              </div>
            )}

            <div>
              <label className="block text-[11px] font-bold text-zinc-400 uppercase tracking-wider mb-1.5">
                6-Digit Verification Code
              </label>
              <input
                type="text"
                maxLength={6}
                value={otpCode}
                onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, ""))}
                placeholder="123456"
                className="w-full py-3 text-center text-xl font-mono font-bold tracking-[0.3em] glass-input rounded-xl text-white placeholder:text-zinc-700 focus:outline-none focus:border-indigo-500"
                autoFocus
                required
              />
              <span className="text-[10px] text-zinc-500 mt-1 block text-center">
                Valid for 10 minutes &bull; Check your spam folder if delayed
              </span>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider">
                  New Password
                </label>
                <button
                  type="button"
                  onClick={() => setNewPassword(generateBreachFreePassword())}
                  className="text-[10px] text-emerald-400 hover:text-emerald-300 font-semibold flex items-center gap-1 transition cursor-pointer"
                >
                  <RefreshCw className="w-3 h-3" />
                  <span>Generate Strong</span>
                </button>
              </div>
              <div className="relative">
                <Lock className="w-4 h-4 text-zinc-500 absolute left-3.5 top-3.5" />
                <input
                  type={showPassword ? "text" : "password"}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Set your new password (min 6 chars)"
                  className="w-full pl-10 pr-10 py-3 text-xs glass-input rounded-xl text-white font-mono placeholder:text-zinc-600 focus:outline-none focus:border-indigo-500"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3.5 top-3.5 text-zinc-500 hover:text-zinc-300 transition cursor-pointer"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <div className="flex items-center gap-2 pt-1">
              <button
                type="button"
                onClick={() => setStep("REQUEST")}
                className="w-1/3 py-3 btn-glass text-xs text-zinc-400 hover:text-white rounded-xl transition cursor-pointer"
              >
                Back
              </button>
              <button
                type="submit"
                disabled={loading}
                className="w-2/3 py-3 btn-primary-glass font-bold text-xs rounded-xl flex items-center justify-center gap-2 transition cursor-pointer disabled:opacity-50"
              >
                {loading ? (
                  <span className="flex items-center gap-2">
                    <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    Updating...
                  </span>
                ) : (
                  <>
                    <span>Confirm New Password</span>
                    <Shield className="w-3.5 h-3.5" />
                  </>
                )}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};
