import React, { useState } from "react";
import YatraAuthLayout from "../components/auth/YatraAuthLayout";

interface LoginProps {
  onLogin: (credentials: { email: string; password?: string; name?: string; mode: "signin" | "signup" }) => Promise<{ error?: string; requiresVerification?: boolean } | void>;
  onGoogleLogin: () => void;
  onForgotPassword: (email: string) => Promise<{ error?: string; message?: string }>;
  onVerifyCode?: (code: string) => Promise<{ error?: string } | void>;
  onResendCode?: () => Promise<{ error?: string; message?: string }>;
  onGuestLogin?: () => void;
  isLoggingIn: boolean;
  authError?: string | null;
  mousePos?: { x: number; y: number };
}

export default function Login({
  onLogin,
  onGoogleLogin,
  onForgotPassword,
  onVerifyCode,
  onResendCode,
  onGuestLogin,
  isLoggingIn,
  authError
}: LoginProps) {
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [name, setName] = useState("");
  const [emailOrUser, setEmailOrUser] = useState("");
  const [password, setPassword] = useState("");
  const [verificationStep, setVerificationStep] = useState(false);
  const [verificationCode, setVerificationCode] = useState("");
  const [authMethod, setAuthMethod] = useState<"google" | "credentials" | null>(null);
  const [notification, setNotification] = useState<string | null>(null);
  const [localError, setLocalError] = useState<string | null>(null);

  const error = localError || authError;

  const handleSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (isLoggingIn) return;

    setLocalError(null);
    setNotification(null);
    setAuthMethod("credentials");

    const trimmedName = name.trim();
    if (mode === "signup" && !trimmedName) {
      setLocalError("Please enter your full name.");
      return;
    }

    const trimmedEmail = emailOrUser.trim();
    if (!trimmedEmail) {
      setLocalError("Please enter your email address.");
      return;
    }

    if (!trimmedEmail.includes("@")) {
      setLocalError("Please enter a valid email address.");
      return;
    }

    if (!password) {
      setLocalError("Please enter your password.");
      return;
    }

    if (mode === "signup" && password.length < 8) {
      setLocalError("Password must be at least 8 characters long.");
      return;
    }

    const displayName = mode === "signup" ? trimmedName : (trimmedName || trimmedEmail.split("@")[0]);

    const res = await onLogin({
      email: trimmedEmail,
      password: password,
      name: displayName,
      mode: mode
    });

    if (res && res.error) {
      setLocalError(res.error);
    } else if (res && res.requiresVerification) {
      setVerificationStep(true);
      setNotification(`Verification code sent to ${trimmedEmail}.`);
    } else if (mode === "signup") {
      setNotification("Account created! Redirecting to your dashboard...");
    }
  };

  const handleVerifyCodeSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (isLoggingIn || !onVerifyCode) return;

    setLocalError(null);
    setNotification(null);

    const trimmedCode = verificationCode.trim();
    if (!trimmedCode) {
      setLocalError("Please enter the verification code.");
      return;
    }

    const res = await onVerifyCode(trimmedCode);
    if (res && res.error) {
      setLocalError(res.error);
    }
  };

  const handleResendCode = async () => {
    if (isLoggingIn || !onResendCode) return;
    setLocalError(null);
    setNotification(null);
    const res = await onResendCode();
    if (res?.error) {
      setLocalError(res.error);
    } else {
      setNotification(res?.message || "Verification code resent! Please check your email.");
    }
  };

  const handleCancelVerification = () => {
    setVerificationStep(false);
    setVerificationCode("");
    setLocalError(null);
    setNotification(null);
  };

  const handleGoogleClick = () => {
    if (isLoggingIn) return;
    setAuthMethod("google");
    onGoogleLogin();
  };

  const handleForgotPassword = async (e: React.MouseEvent) => {
    e.preventDefault();
    setLocalError(null);
    setNotification(null);
    const trimmedEmail = emailOrUser.trim();
    if (!trimmedEmail || !trimmedEmail.includes("@")) {
      setLocalError("Please enter a valid email address first.");
      return;
    }
    const res = await onForgotPassword(trimmedEmail);
    if (res?.error) {
      setLocalError(res.error);
    } else {
      setNotification(res?.message || "Password reset instructions sent to your email.");
      setTimeout(() => setNotification(null), 5000);
    }
  };

  return (
    <YatraAuthLayout
      mode={mode}
      onToggleMode={(newMode) => {
        setMode(newMode);
        setVerificationStep(false);
        setVerificationCode("");
        setLocalError(null);
        setNotification(null);
        setEmailOrUser("");
        setPassword("");
        setName("");
      }}
      name={name}
      onNameChange={setName}
      emailOrUser={emailOrUser}
      onEmailOrUserChange={setEmailOrUser}
      password={password}
      onPasswordChange={setPassword}
      onSubmit={handleSubmit}
      onGoogleClick={handleGoogleClick}
      onForgotPassword={handleForgotPassword}
      onGuestLogin={onGuestLogin}
      isLoggingIn={isLoggingIn}
      authMethod={authMethod}
      error={error}
      notification={notification}
      verificationStep={verificationStep}
      verificationCode={verificationCode}
      onVerificationCodeChange={setVerificationCode}
      onVerifyCode={handleVerifyCodeSubmit}
      onResendCode={handleResendCode}
      onCancelVerification={handleCancelVerification}
    />
  );
}
