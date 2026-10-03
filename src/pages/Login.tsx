import React, { useState } from "react";
import { motion, useMotionValue, useSpring, useTransform } from "motion/react";
import { ArrowRight } from "lucide-react";

// Google Icon SVG
const GoogleIcon = () => (
  <svg className="w-5 h-5" viewBox="0 0 24 24">
    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
    <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
  </svg>
);

interface LoginProps {
  onLogin: (credentials?: { email?: string; name?: string }) => void;
  onGoogleLogin: () => void;
  isLoggingIn: boolean;
  mousePos?: { x: number; y: number };
}

export default function Login({
  onLogin,
  onGoogleLogin,
  isLoggingIn
}: LoginProps) {
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [name, setName] = useState("");
  const [emailOrUser, setEmailOrUser] = useState("Soniya J");
  const [password, setPassword] = useState("••••••••");
  const [authMethod, setAuthMethod] = useState<"google" | "credentials" | null>(null);
  const [notification, setNotification] = useState<string | null>(null);

  // Motion values for the calm pointer effect
  const mouseX = useMotionValue(0.5);
  const mouseY = useMotionValue(0.5);
  
  // Spring configuration for soft, fluid response
  const springConfig = { damping: 40, stiffness: 100, mass: 1 };
  const smoothX = useSpring(mouseX, springConfig);
  const smoothY = useSpring(mouseY, springConfig);

  // Soft ripple effect positions mapped to percentage
  const lightX = useTransform(smoothX, [0, 1], ["0%", "100%"]);
  const lightY = useTransform(smoothY, [0, 1], ["0%", "100%"]);

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (prefersReducedMotion) return;

    const rect = e.currentTarget.getBoundingClientRect();
    const x = (e.clientX - rect.left) / rect.width;
    const y = (e.clientY - rect.top) / rect.height;
    
    mouseX.set(x);
    mouseY.set(y);
  };

  const handleMouseLeave = () => {
    mouseX.set(0.5);
    mouseY.set(0.5);
  };

  const handleSubmit = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (isLoggingIn) return;

    setAuthMethod("credentials");

    // Clean and normalize username/email input (e.g. "Soniya J" -> "soniyaj@yatra.ai")
    const trimmedInput = emailOrUser.trim() || "Soniya J";
    const isEmail = trimmedInput.includes("@");
    const sanitizedEmail = isEmail 
      ? trimmedInput 
      : `${trimmedInput.toLowerCase().replace(/[^a-z0-9]/g, "") || "user"}@yatra.ai`;
    
    const displayName = mode === "signup" && name.trim() ? name.trim() : trimmedInput;

    onLogin({
      email: sanitizedEmail,
      name: displayName
    });
  };

  const handleGoogleClick = () => {
    if (isLoggingIn) return;
    setAuthMethod("google");
    onGoogleLogin();
  };

  const handleForgotPassword = (e: React.MouseEvent) => {
    e.preventDefault();
    setNotification("Reset instructions sent to your email.");
    setTimeout(() => setNotification(null), 3500);
  };

  return (
    <div className="min-h-screen w-full bg-white flex flex-col lg:flex-row font-sans text-slate-900 selection:bg-blue-600/10 selection:text-blue-900">
      
      {/* LEFT SIDE: DYNAMIC BRAND PRESENTATION (approx 62% on desktop) */}
      <div 
        className="relative hidden lg:flex lg:w-[62%] h-screen overflow-hidden bg-slate-900 flex-col justify-center px-16 xl:px-24"
        onMouseMove={handleMouseMove}
        onMouseLeave={handleMouseLeave}
      >
        {/* Background Effects */}
        <div className="absolute inset-0 bg-gradient-to-br from-slate-900 via-[#0F172A] to-slate-950" />
        
        {/* Abstract Grid Pattern */}
        <div 
          className="absolute inset-0 opacity-[0.04]"
          style={{ backgroundImage: 'radial-gradient(circle at 2px 2px, white 1px, transparent 0)', backgroundSize: '48px 48px' }}
        />
        
        {/* Interactive Lights (follows pointer) */}
        <motion.div 
          className="absolute inset-0 pointer-events-none mix-blend-screen opacity-[0.4]"
          style={{
            background: useTransform(
              [lightX, lightY],
              ([x, y]) => `radial-gradient(circle 800px at ${x} ${y}, rgba(37, 99, 235, 0.15), transparent 60%)`
            ) as any
          }}
        />

        <motion.div 
          className="absolute inset-0 pointer-events-none mix-blend-screen opacity-[0.4]"
          style={{
            background: useTransform(
              [lightX, lightY],
              ([x, y]) => `radial-gradient(circle 400px at ${x} ${y}, rgba(99, 102, 241, 0.15), transparent 70%)`
            ) as any
          }}
        />

        {/* Text Content */}
        <div className="relative z-10 w-full max-w-2xl">
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.1 }}
            className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-300 text-[11px] font-bold tracking-widest uppercase mb-8 backdrop-blur-md"
          >
            <span>Career Intelligence For Engineers</span>
          </motion.div>

          <motion.h1 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.2 }}
            className="text-5xl lg:text-[4rem] font-bold text-white leading-[1.05] tracking-tight mb-6"
          >
            Your <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-indigo-400">Engineering</span><br />
            Skills Are More<br />
            Than a Resume.
          </motion.h1>

          <motion.p 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.3 }}
            className="text-xl text-slate-400 leading-relaxed mb-12 max-w-xl"
          >
            YATRA turns your skills, projects and potential into real opportunities.
          </motion.p>

          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.4 }}
            className="grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-8"
          >
            {/* Feature 1 */}
            <div className="flex items-start gap-4 group">
              <div className="w-11 h-11 rounded-xl bg-blue-500/10 flex items-center justify-center shrink-0 border border-blue-500/20 text-blue-400 group-hover:bg-blue-500/20 group-hover:scale-110 transition-all duration-300">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </div>
              <div>
                <h3 className="text-white font-semibold text-[15px] mb-1">Resume Intelligence</h3>
                <p className="text-slate-400 text-[13px] leading-relaxed">Extract and understand your skills.</p>
              </div>
            </div>

            {/* Feature 2 */}
            <div className="flex items-start gap-4 group">
              <div className="w-11 h-11 rounded-xl bg-indigo-500/10 flex items-center justify-center shrink-0 border border-indigo-500/20 text-indigo-400 group-hover:bg-indigo-500/20 group-hover:scale-110 transition-all duration-300">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                </svg>
              </div>
              <div>
                <h3 className="text-white font-semibold text-[15px] mb-1">Skill Analysis</h3>
                <p className="text-slate-400 text-[13px] leading-relaxed">Discover your strengths & gaps.</p>
              </div>
            </div>

            {/* Feature 3 */}
            <div className="flex items-start gap-4 group">
              <div className="w-11 h-11 rounded-xl bg-purple-500/10 flex items-center justify-center shrink-0 border border-purple-500/20 text-purple-400 group-hover:bg-purple-500/20 group-hover:scale-110 transition-all duration-300">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                </svg>
              </div>
              <div>
                <h3 className="text-white font-semibold text-[15px] mb-1">Live Opportunities</h3>
                <p className="text-slate-400 text-[13px] leading-relaxed">Find relevant roles in real time.</p>
              </div>
            </div>

            {/* Feature 4 */}
            <div className="flex items-start gap-4 group">
              <div className="w-11 h-11 rounded-xl bg-cyan-500/10 flex items-center justify-center shrink-0 border border-cyan-500/20 text-cyan-400 group-hover:bg-cyan-500/20 group-hover:scale-110 transition-all duration-300">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M17 8h2a2 2 0 012 2v6a2 2 0 01-2 2h-2v4l-4-4H9a1.994 1.994 0 01-1.414-.586m0 0L11 14h4a2 2 0 002-2V6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2v4l.586-.586z" />
                </svg>
              </div>
              <div>
                <h3 className="text-white font-semibold text-[15px] mb-1">Interview Preparation</h3>
                <p className="text-slate-400 text-[13px] leading-relaxed">Practice with AI-powered questions.</p>
              </div>
            </div>
            
            {/* Feature 5 */}
            <div className="flex items-start gap-4 group md:col-span-2">
              <div className="w-11 h-11 rounded-xl bg-emerald-500/10 flex items-center justify-center shrink-0 border border-emerald-500/20 text-emerald-400 group-hover:bg-emerald-500/20 group-hover:scale-110 transition-all duration-300">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
              </div>
              <div>
                <h3 className="text-white font-semibold text-[15px] mb-1">Career Roadmap</h3>
                <p className="text-slate-400 text-[13px] leading-relaxed">Build your next steps with clarity.</p>
              </div>
            </div>
            
          </motion.div>
        </div>
      </div>

      {/* RIGHT SIDE: AUTHENTICATION PANEL (approx 38% on desktop) */}
      <div className="w-full lg:w-[38%] min-h-screen flex items-center justify-center bg-white px-6 py-12 sm:px-12 xl:px-16 relative z-10 lg:shadow-[-20px_0_40px_rgba(0,0,0,0.03)]">
        
        <motion.div 
          key={mode}
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
          className="w-full max-w-[380px] space-y-7"
        >
          {/* Header */}
          <div className="space-y-2">
            {/* YATRA Logo */}
            <div className="w-10 h-10 bg-blue-600 rounded-lg flex items-center justify-center mb-6 shadow-sm">
              <span className="font-bold text-xl text-white tracking-tighter">Y</span>
            </div>
            
            <h1 className="text-3xl font-bold text-slate-900 tracking-tight">
              {mode === "signin" ? "Welcome back." : "Create account."}
            </h1>
            <p className="text-[14px] text-slate-500 font-medium leading-relaxed">
              {mode === "signin" 
                ? "Continue your career intelligence journey." 
                : "Join thousands of engineers accelerating their careers."}
            </p>
          </div>

          {notification && (
            <div className="p-3 bg-blue-50 border border-blue-200 text-blue-800 text-[13px] rounded-md animate-fadeIn">
              {notification}
            </div>
          )}

          {/* Google Auth Button */}
          <button
            type="button"
            onClick={handleGoogleClick}
            disabled={isLoggingIn}
            className="w-full h-11 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 hover:border-slate-300 text-slate-700 font-semibold text-[14px] flex items-center justify-center gap-3 transition-all active:scale-[0.99] shadow-sm disabled:opacity-70 disabled:pointer-events-none cursor-pointer"
          >
            {isLoggingIn && authMethod === "google" ? (
              <span className="flex items-center gap-2">
                <svg className="animate-spin h-5 w-5 text-blue-600" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
                <span>Authenticating with Google...</span>
              </span>
            ) : (
              <>
                <GoogleIcon />
                <span>Continue with Google</span>
              </>
            )}
          </button>

          {/* Divider */}
          <div className="relative py-1 flex items-center justify-center">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-slate-100" />
            </div>
            <span className="relative px-3 bg-white text-[11px] font-semibold text-slate-400 uppercase tracking-widest">
              OR
            </span>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="space-y-4">
              {/* Full Name field in Sign Up mode */}
              {mode === "signup" && (
                <div className="space-y-1.5">
                  <label htmlFor="name" className="block text-[13px] font-semibold text-slate-700">
                    Full name
                  </label>
                  <input
                    id="name"
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    disabled={isLoggingIn}
                    className="w-full px-3.5 py-2.5 rounded-lg border border-slate-200 bg-white text-[14px] text-slate-900 placeholder-slate-400 focus:outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-600/10 transition-all disabled:bg-slate-50 shadow-sm"
                    placeholder="e.g. Soniya J"
                  />
                </div>
              )}

              {/* Email / Username Input */}
              <div className="space-y-1.5">
                <label htmlFor="emailOrUser" className="block text-[13px] font-semibold text-slate-700">
                  {mode === "signin" ? "Email address or username" : "Email address"}
                </label>
                <input
                  id="emailOrUser"
                  type="text"
                  value={emailOrUser}
                  onChange={(e) => setEmailOrUser(e.target.value)}
                  disabled={isLoggingIn}
                  className="w-full px-3.5 py-2.5 rounded-lg border border-slate-200 bg-white text-[14px] text-slate-900 placeholder-slate-400 focus:outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-600/10 transition-all disabled:bg-slate-50 shadow-sm"
                  placeholder={mode === "signin" ? "name@company.com or username" : "name@company.com"}
                  required
                />
              </div>

              {/* Password Input */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label htmlFor="password" className="block text-[13px] font-semibold text-slate-700">
                    Password
                  </label>
                  {mode === "signin" && (
                    <button
                      type="button"
                      onClick={handleForgotPassword}
                      className="text-[12px] font-medium text-blue-600 hover:text-blue-700 transition-colors cursor-pointer"
                    >
                      Forgot password?
                    </button>
                  )}
                </div>
                <input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  disabled={isLoggingIn}
                  className="w-full px-3.5 py-2.5 rounded-lg border border-slate-200 bg-white text-[14px] text-slate-900 placeholder-slate-400 focus:outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-600/10 transition-all disabled:bg-slate-50 shadow-sm"
                  placeholder="••••••••"
                  required
                />
              </div>
            </div>

            {/* Primary Action Button (Sign in or Create account) */}
            <button
              type="submit"
              disabled={isLoggingIn}
              className="w-full h-11 rounded-lg bg-slate-900 hover:bg-slate-800 text-white font-semibold text-[14px] flex items-center justify-center gap-2 transition-all active:scale-[0.99] shadow-sm disabled:opacity-70 disabled:pointer-events-none cursor-pointer"
            >
              {isLoggingIn && authMethod === "credentials" ? (
                <span className="flex items-center gap-2">
                  <svg className="animate-spin h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                  <span>{mode === "signin" ? "Signing in..." : "Creating account..."}</span>
                </span>
              ) : (
                <>
                  <span>{mode === "signin" ? "Sign in" : "Create account"}</span>
                  <ArrowRight className="w-4 h-4 ml-0.5" />
                </>
              )}
            </button>
          </form>

          {/* Toggle between Sign In and Sign Up */}
          <div className="pt-2 text-center sm:text-left">
            {mode === "signin" ? (
              <p className="text-[13px] text-slate-500 font-medium">
                New to YATRA?{" "}
                <button
                  type="button"
                  onClick={() => {
                    setMode("signup");
                    setEmailOrUser("");
                    setPassword("");
                  }}
                  className="text-slate-900 font-bold hover:text-blue-600 transition-colors cursor-pointer inline-flex items-center"
                >
                  Create account
                </button>
              </p>
            ) : (
              <p className="text-[13px] text-slate-500 font-medium">
                Already have an account?{" "}
                <button
                  type="button"
                  onClick={() => {
                    setMode("signin");
                    setEmailOrUser("Soniya J");
                    setPassword("••••••••");
                  }}
                  className="text-slate-900 font-bold hover:text-blue-600 transition-colors cursor-pointer inline-flex items-center"
                >
                  Sign in
                </button>
              </p>
            )}
          </div>
          
        </motion.div>
      </div>

    </div>
  );
}
