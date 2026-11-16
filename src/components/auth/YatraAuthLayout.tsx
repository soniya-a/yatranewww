import React, { useState } from "react";
import styles from "./YatraAuthLayout.module.css";

export interface YatraAuthLayoutProps {
  mode: "signin" | "signup";
  onToggleMode: (newMode: "signin" | "signup") => void;
  name?: string;
  onNameChange?: (val: string) => void;
  emailOrUser: string;
  onEmailOrUserChange: (val: string) => void;
  password: string;
  onPasswordChange: (val: string) => void;
  onSubmit: (e?: React.FormEvent) => void;
  onGoogleClick: () => void;
  onForgotPassword: (e: React.MouseEvent) => void;
  onGuestLogin?: () => void;
  isLoggingIn: boolean;
  authMethod: "google" | "credentials" | null;
  error?: string | null;
  notification?: string | null;
}

// Official 4-color Google Icon
const GoogleIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" aria-hidden="true">
    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
    <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
  </svg>
);

export default function YatraAuthLayout({
  mode,
  onToggleMode,
  name = "",
  onNameChange,
  emailOrUser,
  onEmailOrUserChange,
  password,
  onPasswordChange,
  onSubmit,
  onGoogleClick,
  onForgotPassword,
  onGuestLogin,
  isLoggingIn,
  authMethod,
  error,
  notification
}: YatraAuthLayoutProps) {
  const [showPassword, setShowPassword] = useState(false);

  // Phone Mockup 1: Resume Intelligence
  const renderResumeIntelligencePhone = (key: string | number) => (
    <div key={key} className={styles.phoneMockup}>
      <div className={styles.phoneNotch}><span className={styles.phoneCameraDot}></span></div>
      <div className={styles.phoneStatusBar}>
        <span>10:20</span>
        <div className={styles.statusIcons}>
          <svg width="12" height="10" viewBox="0 0 24 24" fill="currentColor"><path d="M12 3c-4.97 0-9 4.03-9 9 0 2.12.74 4.07 1.97 5.61L12 22l7.03-4.39C20.26 16.07 21 14.12 21 12c0-4.97-4.03-9-9-9z"/></svg>
          <svg width="12" height="10" viewBox="0 0 24 24" fill="currentColor"><rect x="2" y="6" width="18" height="12" rx="2"/><path d="M22 10v4"/></svg>
        </div>
      </div>
      <div className={styles.screenHeader}>
        <div className={styles.screenIconBadge}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/>
          </svg>
        </div>
        <span className={styles.screenTitle}>Resume Intelligence</span>
      </div>
      <div className={styles.screenContent}>
        <div className={styles.gaugeWrapper}>
          <svg className={styles.gaugeSvg} viewBox="0 0 120 120">
            <circle className={styles.gaugeCircleBg} cx="60" cy="60" r="47" />
            <circle className={styles.gaugeCircleProgress} cx="60" cy="60" r="47" />
          </svg>
          <div className={styles.gaugeLabelCenter}>
            <span className={styles.gaugeScoreValue}>92%</span>
            <span className={styles.gaugeScoreSub}>Profile Score</span>
          </div>
        </div>
        <div className={styles.checklistContainer}>
          <div className={styles.checklistRow}>
            <div className={styles.checkLeft}><span className={styles.checkBullet}>&#10003;</span><span className={styles.checkText}>Skills Extracted</span></div>
            <span className={styles.checkArrow}>&rsaquo;</span>
          </div>
          <div className={styles.checklistRow}>
            <div className={styles.checkLeft}><span className={styles.checkBullet}>&#10003;</span><span className={styles.checkText}>Projects Identified</span></div>
            <span className={styles.checkArrow}>&rsaquo;</span>
          </div>
          <div className={styles.checklistRow}>
            <div className={styles.checkLeft}><span className={styles.checkBullet}>&#10003;</span><span className={styles.checkText}>Role Match</span></div>
            <span className={styles.checkArrow}>&rsaquo;</span>
          </div>
        </div>
      </div>
    </div>
  );

  // Phone Mockup 2: AI Interview
  const renderAIInterviewPhone = (key: string | number) => (
    <div key={key} className={styles.phoneMockup}>
      <div className={styles.phoneNotch}><span className={styles.phoneCameraDot}></span></div>
      <div className={styles.phoneStatusBar}>
        <span>10:20</span>
        <div className={styles.statusIcons}>
          <svg width="12" height="10" viewBox="0 0 24 24" fill="currentColor"><path d="M12 3c-4.97 0-9 4.03-9 9 0 2.12.74 4.07 1.97 5.61L12 22l7.03-4.39C20.26 16.07 21 14.12 21 12c0-4.97-4.03-9-9-9z"/></svg>
          <svg width="12" height="10" viewBox="0 0 24 24" fill="currentColor"><rect x="2" y="6" width="18" height="12" rx="2"/><path d="M22 10v4"/></svg>
        </div>
      </div>
      <div className={styles.screenHeader}>
        <div className={styles.screenIconBadge}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
          </svg>
        </div>
        <span className={styles.screenTitle}>AI Interview</span>
      </div>
      <div className={styles.screenContent}>
        <div className={styles.avatarWrapper}>
          <div className={styles.avatarImgBox}>
            <img 
              src="/avatars/mr-vinodh.png" 
              alt="Interviewer" 
              onError={(e) => {
                (e.currentTarget as HTMLElement).style.display = 'none';
              }} 
            />
          </div>
        </div>
        <div className={styles.waveformBarBox}>
          <div className={styles.waveBar}></div>
          <div className={styles.waveBar}></div>
          <div className={styles.waveBar}></div>
          <div className={styles.waveBar}></div>
          <div className={styles.waveBar}></div>
          <div className={styles.waveBar}></div>
          <div className={styles.waveBar}></div>
          <div className={styles.waveBar}></div>
        </div>
        <div className={styles.questionSpeechBox}>
          Q1. Tell me about a project you're proud of.
        </div>
        <div className={styles.micButtonRow}>
          <button type="button" className={styles.micCircleBtn} aria-label="Microphone">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z"/>
              <path d="M19 10v2a7 7 0 0 1-14 0v-2"/>
              <line x1="12" x2="12" y1="19" y2="22"/>
            </svg>
          </button>
        </div>
      </div>
    </div>
  );

  // Phone Mockup 3: Job Discovery
  const renderJobDiscoveryPhone = (key: string | number) => (
    <div key={key} className={styles.phoneMockup}>
      <div className={styles.phoneNotch}><span className={styles.phoneCameraDot}></span></div>
      <div className={styles.phoneStatusBar}>
        <span>10:20</span>
        <div className={styles.statusIcons}>
          <svg width="12" height="10" viewBox="0 0 24 24" fill="currentColor"><path d="M12 3c-4.97 0-9 4.03-9 9 0 2.12.74 4.07 1.97 5.61L12 22l7.03-4.39C20.26 16.07 21 14.12 21 12c0-4.97-4.03-9-9-9z"/></svg>
          <svg width="12" height="10" viewBox="0 0 24 24" fill="currentColor"><rect x="2" y="6" width="18" height="12" rx="2"/><path d="M22 10v4"/></svg>
        </div>
      </div>
      <div className={styles.screenHeader}>
        <div className={styles.screenIconBadge}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <rect width="20" height="14" x="2" y="7" rx="2" ry="2"/>
            <path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"/>
          </svg>
        </div>
        <span className={styles.screenTitle}>Job Discovery</span>
      </div>
      <div className={styles.screenContent}>
        <div className={styles.jobCardsCol}>
          <div className={styles.jobItemCard}>
            <div className={styles.jobCardLeft}>
              <div className={styles.companyLogoSq}>
                <svg width="18" height="18" viewBox="0 0 24 24">
                  <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                  <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                  <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                  <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                </svg>
              </div>
              <div className={styles.companyInfoText}>
                <span className={styles.companyNameBold}>Google</span>
                <span className={styles.roleTitleGray}>Software Engineer</span>
              </div>
            </div>
            <span className={styles.jobArrowIcon}>&rsaquo;</span>
          </div>

          <div className={styles.jobItemCard}>
            <div className={styles.jobCardLeft}>
              <div className={styles.companyLogoSq}>
                <svg width="18" height="18" viewBox="0 0 24 24">
                  <path fill="#F25022" d="M1 1h10v10H1z"/>
                  <path fill="#7FBA00" d="M13 1h10v10H13z"/>
                  <path fill="#00A4EF" d="M1 13h10v10H1z"/>
                  <path fill="#FFB900" d="M13 13h10v10H13z"/>
                </svg>
              </div>
              <div className={styles.companyInfoText}>
                <span className={styles.companyNameBold}>Microsoft</span>
                <span className={styles.roleTitleGray}>SDE Intern</span>
              </div>
            </div>
            <span className={styles.jobArrowIcon}>&rsaquo;</span>
          </div>

          <div className={styles.jobItemCard}>
            <div className={styles.jobCardLeft}>
              <div className={styles.companyLogoSq}>
                <svg width="18" height="18" viewBox="0 0 24 24">
                  <path fill="#FF9900" d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 14.5c-2.49 0-4.5-2.01-4.5-4.5S8.51 7.5 11 7.5c1.44 0 2.72.68 3.55 1.73l-1.4 1.4C12.68 10.23 11.9 9.9 11 9.9c-1.43 0-2.6 1.17-2.6 2.6s1.17 2.6 2.6 2.6c.94 0 1.73-.42 2.22-.98l1.39 1.39C13.68 16.03 12.43 16.5 11 16.5z"/>
                </svg>
              </div>
              <div className={styles.companyInfoText}>
                <span className={styles.companyNameBold}>Amazon</span>
                <span className={styles.roleTitleGray}>Backend Engineer</span>
              </div>
            </div>
            <span className={styles.jobArrowIcon}>&rsaquo;</span>
          </div>
        </div>
      </div>
    </div>
  );

  // Phone Mockup 4: Performance Analytics
  const renderAnalyticsPhone = (key: string | number) => (
    <div key={key} className={styles.phoneMockup}>
      <div className={styles.phoneNotch}><span className={styles.phoneCameraDot}></span></div>
      <div className={styles.phoneStatusBar}>
        <span>10:20</span>
        <div className={styles.statusIcons}>
          <svg width="12" height="10" viewBox="0 0 24 24" fill="currentColor"><path d="M12 3c-4.97 0-9 4.03-9 9 0 2.12.74 4.07 1.97 5.61L12 22l7.03-4.39C20.26 16.07 21 14.12 21 12c0-4.97-4.03-9-9-9z"/></svg>
          <svg width="12" height="10" viewBox="0 0 24 24" fill="currentColor"><rect x="2" y="6" width="18" height="12" rx="2"/><path d="M22 10v4"/></svg>
        </div>
      </div>
      <div className={styles.screenHeader}>
        <div className={styles.screenIconBadge}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/>
          </svg>
        </div>
        <span className={styles.screenTitle}>Performance Analytics</span>
      </div>
      <div className={styles.screenContent}>
        <div className={styles.gaugeWrapper}>
          <svg className={styles.gaugeSvg} viewBox="0 0 120 120">
            <circle className={styles.gaugeCircleBg} cx="60" cy="60" r="47" />
            <circle className={styles.analyticsGaugeProgress} cx="60" cy="60" r="47" />
          </svg>
          <div className={styles.gaugeLabelCenter}>
            <span className={styles.gaugeScoreValue}>88%</span>
            <span className={styles.gaugeScoreSub}>Overall Score</span>
          </div>
        </div>
        <div className={styles.skillsBarsCol}>
          <div className={styles.skillBarItem}>
            <div className={styles.skillBarLabels}><span>Technical</span><span className={styles.skillPercentBold}>88%</span></div>
            <div className={styles.skillTrackBg}><div className={styles.skillFillGradient} style={{ width: "88%" }}></div></div>
          </div>
          <div className={styles.skillBarItem}>
            <div className={styles.skillBarLabels}><span>Problem Solving</span><span className={styles.skillPercentBold}>86%</span></div>
            <div className={styles.skillTrackBg}><div className={styles.skillFillGradient} style={{ width: "86%" }}></div></div>
          </div>
          <div className={styles.skillBarItem}>
            <div className={styles.skillBarLabels}><span>Communication</span><span className={styles.skillPercentBold}>87%</span></div>
            <div className={styles.skillTrackBg}><div className={styles.skillFillGradient} style={{ width: "87%" }}></div></div>
          </div>
        </div>
      </div>
    </div>
  );

  // Phone Mockup 5: Career Roadmap
  const renderCareerRoadmapPhone = (key: string | number) => (
    <div key={key} className={styles.phoneMockup}>
      <div className={styles.phoneNotch}><span className={styles.phoneCameraDot}></span></div>
      <div className={styles.phoneStatusBar}>
        <span>10:20</span>
        <div className={styles.statusIcons}>
          <svg width="12" height="10" viewBox="0 0 24 24" fill="currentColor"><path d="M12 3c-4.97 0-9 4.03-9 9 0 2.12.74 4.07 1.97 5.61L12 22l7.03-4.39C20.26 16.07 21 14.12 21 12c0-4.97-4.03-9-9-9z"/></svg>
          <svg width="12" height="10" viewBox="0 0 24 24" fill="currentColor"><rect x="2" y="6" width="18" height="12" rx="2"/><path d="M22 10v4"/></svg>
        </div>
      </div>
      <div className={styles.screenHeader}>
        <div className={styles.screenIconBadge}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="6" cy="19" r="3"/><circle cx="18" cy="5" r="3"/><circle cx="18" cy="19" r="3"/><path d="M9 19h6"/><path d="M18 8v8"/>
          </svg>
        </div>
        <span className={styles.screenTitle}>Career Roadmap</span>
      </div>
      <div className={styles.screenContent}>
        <div className={styles.roadmapTimelineCol}>
          <div className={styles.timelineStepRow}>
            <div className={styles.timelineAxisLine}></div>
            <div className={`${styles.stepNodeCircle} ${styles.nodeCompleted}`}>&#10003;</div>
            <div className={styles.stepInfoCol}>
              <span className={styles.stepTitleBold}>Strengthen DSA</span>
              <span className={`${styles.statusBadgeText} ${styles.statusGreen}`}>Completed</span>
            </div>
          </div>
          <div className={styles.timelineStepRow}>
            <div className={styles.timelineAxisLine}></div>
            <div className={`${styles.stepNodeCircle} ${styles.nodeProgress}`}>&bull;</div>
            <div className={styles.stepInfoCol}>
              <span className={styles.stepTitleBold}>System Design</span>
              <span className={`${styles.statusBadgeText} ${styles.statusBlue}`}>In Progress</span>
            </div>
          </div>
          <div className={styles.timelineStepRow}>
            <div className={`${styles.stepNodeCircle} ${styles.nodeNext}`}>&bull;</div>
            <div className={styles.stepInfoCol}>
              <span className={styles.stepTitleBold}>Build Projects</span>
              <span className={`${styles.statusBadgeText} ${styles.statusPurple}`}>Next</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  // Phone Mockup 6: VR Interview
  const renderVRInterviewPhone = (key: string | number) => (
    <div key={key} className={styles.phoneMockup}>
      <div className={styles.phoneNotch}><span className={styles.phoneCameraDot}></span></div>
      <div className={styles.phoneStatusBar}>
        <span>10:20</span>
        <div className={styles.statusIcons}>
          <svg width="12" height="10" viewBox="0 0 24 24" fill="currentColor"><path d="M12 3c-4.97 0-9 4.03-9 9 0 2.12.74 4.07 1.97 5.61L12 22l7.03-4.39C20.26 16.07 21 14.12 21 12c0-4.97-4.03-9-9-9z"/></svg>
          <svg width="12" height="10" viewBox="0 0 24 24" fill="currentColor"><rect x="2" y="6" width="18" height="12" rx="2"/><path d="M22 10v4"/></svg>
        </div>
      </div>
      <div className={styles.screenHeader}>
        <div className={styles.screenIconBadge}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M2 10a4 4 0 0 1 4-4h12a4 4 0 0 1 4 4v4a4 4 0 0 1-4 4H6a4 4 0 0 1-4-4Z"/>
            <circle cx="8" cy="12" r="2"/><circle cx="16" cy="12" r="2"/>
          </svg>
        </div>
        <span className={styles.screenTitle}>VR Interview</span>
      </div>
      <div className={styles.screenContent}>
        <div className={styles.vrRoomPreview}>
          <div className={styles.vrCanvasFallback}>
            <div className={styles.vrHaloRing}></div>
            <div className={styles.vrInterviewerSilhouette}></div>
          </div>
        </div>
        <button type="button" className={styles.btnEnterVr}>
          <span>Enter VR Interview &rarr;</span>
        </button>
      </div>
    </div>
  );

  return (
    <div className={styles.layout}>
      {/* Hidden SVG Gradients for Progress Rings & Curves */}
      <svg width="0" height="0" style={{ position: "absolute", pointerEvents: "none" }} aria-hidden="true">
        <defs>
          <linearGradient id="greenCyanGradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#10b981" />
            <stop offset="60%" stopColor="#06b6d4" />
            <stop offset="100%" stopColor="#3b82f6" />
          </linearGradient>
          <linearGradient id="purpleCyanGradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#6366f1" />
            <stop offset="60%" stopColor="#06b6d4" />
            <stop offset="100%" stopColor="#10b981" />
          </linearGradient>
        </defs>
      </svg>

      {/* ─────────────────────────────────────────────────────────────
           LEFT PANEL: CURVED FLOATING CARD (MATCHING APPROVED SPEC)
      ───────────────────────────────────────────────────────────── */}
      <div className={styles.formColumn}>
        {/* SVG Organic Curved Background with Soft Icy-Blue & Lavender Gradient */}
        <svg className={styles.curvedPanelBg} viewBox="0 0 540 880" preserveAspectRatio="none" aria-hidden="true">
          <defs>
            <linearGradient id="panelGradient" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#eff6ff" stopOpacity="0.96" />
              <stop offset="35%" stopColor="#f5f3ff" stopOpacity="0.93" />
              <stop offset="70%" stopColor="#eff6ff" stopOpacity="0.95" />
              <stop offset="100%" stopColor="#e9f2fe" stopOpacity="0.97" />
            </linearGradient>

            <linearGradient id="strokeGradient" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#ffffff" stopOpacity="0.9" />
              <stop offset="50%" stopColor="#e0e7ff" stopOpacity="0.6" />
              <stop offset="100%" stopColor="#dbeafe" stopOpacity="0.7" />
            </linearGradient>

            <filter id="panelGlow" x="-10%" y="-10%" width="125%" height="120%">
              <feDropShadow dx="12" dy="20" stdDeviation="24" floodColor="#3b82f6" floodOpacity="0.08" />
              <feDropShadow dx="4" dy="8" stdDeviation="12" floodColor="#7c3aed" floodOpacity="0.05" />
            </filter>
          </defs>

          <path
            d="M 36,0 
               L 430,0 
               C 480,0 532,60 532,180 
               C 532,285 438,325 434,430 
               C 430,535 498,585 496,690 
               C 494,790 435,880 375,880 
               L 36,880 
               C 16,880 0,864 0,844 
               L 0,36 
               C 0,16 16,0 36,0 Z"
            fill="url(#panelGradient)"
            stroke="url(#strokeGradient)"
            strokeWidth="1.5"
            filter="url(#panelGlow)"
          />
        </svg>

        <div className={styles.formContainer}>
          {/* Brand Header */}
          <div className={styles.brandHeader}>
            <div className={styles.brandBadge}>
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                <path d="M12 3L3 20H8.5L12 12.5L15.5 20H21L12 3Z" fill="#ffffff" />
              </svg>
            </div>
            <span className={styles.brandName}>YATRA</span>
          </div>

          {/* Heading & Subtitle */}
          <h1 className={styles.formTitle}>
            Your Next<br />
            <span className={styles.highlightOpportunity}>Opportunity</span><br />
            Starts Here.
          </h1>
          <p className={styles.formSubtitle}>
            AI-powered interview preparation, resume intelligence, job discovery, and career growth — all in one platform.
          </p>

          {/* Error & Notification Alerts */}
          {error && <div className={styles.errorAlert} role="alert">{error}</div>}
          {notification && <div className={styles.notifyAlert} role="status">{notification}</div>}

          {/* Continue with Google Button */}
          <button
            type="button"
            className={styles.btnGoogle}
            onClick={onGoogleClick}
            disabled={isLoggingIn}
          >
            {isLoggingIn && authMethod === "google" ? (
              <span>Connecting to Google...</span>
            ) : (
              <>
                <GoogleIcon />
                <span>Continue with Google</span>
              </>
            )}
          </button>

          {/* OR Divider */}
          <div className={styles.dividerRow}>
            <div className={styles.dividerLine} />
            <span className={styles.dividerText}>OR</span>
            <div className={styles.dividerLine} />
          </div>

          {/* Input Form */}
          <form onSubmit={onSubmit}>
            <div className={styles.fieldGroup}>
              {/* Name Field (Signup Mode only) */}
              {mode === "signup" && onNameChange && (
                <div className={styles.inputWrapper}>
                  <span className={styles.inputIcon}>
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                      <path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2" />
                      <circle cx="12" cy="7" r="4" />
                    </svg>
                  </span>
                  <input
                    type="text"
                    className={styles.formInput}
                    placeholder="Enter your full name"
                    value={name}
                    onChange={(e) => onNameChange(e.target.value)}
                    disabled={isLoggingIn}
                    autoComplete="name"
                    required
                  />
                </div>
              )}

              {/* Email / Username */}
              <div className={styles.inputWrapper}>
                <span className={styles.inputIcon}>
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                    <rect width="20" height="16" x="2" y="4" rx="2" />
                    <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" />
                  </svg>
                </span>
                <input
                  type="email"
                  className={styles.formInput}
                  placeholder="Enter your email"
                  value={emailOrUser}
                  onChange={(e) => onEmailOrUserChange(e.target.value)}
                  disabled={isLoggingIn}
                  autoComplete="email"
                  required
                />
              </div>

              {/* Password */}
              <div className={styles.inputWrapper}>
                <span className={styles.inputIcon}>
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                    <rect width="18" height="11" x="3" y="11" rx="2" ry="2" />
                    <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                  </svg>
                </span>
                <input
                  type={showPassword ? "text" : "password"}
                  className={`${styles.formInput} ${styles.formInputWithEye}`}
                  placeholder="Enter your password"
                  value={password}
                  onChange={(e) => onPasswordChange(e.target.value)}
                  disabled={isLoggingIn}
                  autoComplete={mode === "signin" ? "current-password" : "new-password"}
                  required
                />
                <button
                  type="button"
                  className={styles.inputEye}
                  onClick={() => setShowPassword((prev) => !prev)}
                  aria-label={showPassword ? "Hide password" : "Show password"}
                >
                  {showPassword ? (
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                      <path d="M9.88 9.88a3 3 0 1 0 4.24 4.24"/><path d="M10.73 5.08A10.43 10.43 0 0 1 12 5c7 0 10 7 10 7a13.16 13.16 0 0 1-1.67 2.68"/><path d="M6.61 6.61A13.526 13.526 0 0 0 2 12s3 7 10 7a9.74 9.74 0 0 0 5.39-1.61"/><line x1="2" x2="22" y1="2" y2="22"/>
                    </svg>
                  ) : (
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                      <path d="M2.062 12.348a1 1 0 0 1 0-.696 10.75 10.75 0 0 1 19.876 0 1 1 0 .696 10.75 10.75 0 0 1-19.876 0" />
                      <circle cx="12" cy="12" r="3" />
                    </svg>
                  )}
                </button>
              </div>
            </div>

            {/* Forgot Password Link */}
            {mode === "signin" && (
              <div className={styles.forgotPassRow}>
                <button
                  type="button"
                  className={styles.forgotLink}
                  onClick={onForgotPassword}
                  disabled={isLoggingIn}
                >
                  Forgot password?
                </button>
              </div>
            )}

            {/* Sign In / Sign Up Submit Button */}
            <button
              type="submit"
              className={styles.btnSubmit}
              disabled={isLoggingIn}
            >
              {isLoggingIn && authMethod === "credentials" ? (
                <span>{mode === "signin" ? "Signing In..." : "Creating Account..."}</span>
              ) : (
                <span>{mode === "signin" ? "Sign In \u2192" : "Create Account \u2192"}</span>
              )}
            </button>
          </form>

          {/* Toggle between Sign In and Sign Up */}
          <div className={styles.formFooter}>
            {mode === "signin" ? (
              <>
                Don't have an account?{" "}
                <button
                  type="button"
                  className={styles.signupLink}
                  onClick={() => onToggleMode("signup")}
                >
                  Create account
                </button>
              </>
            ) : (
              <>
                Already have an account?{" "}
                <button
                  type="button"
                  className={styles.signupLink}
                  onClick={() => onToggleMode("signin")}
                >
                  Sign in
                </button>
              </>
            )}
          </div>

          {/* Guest Sandbox Mode (if handler provided) */}
          {onGuestLogin && (
            <div className={styles.guestRow}>
              <button
                type="button"
                className={styles.guestLink}
                onClick={onGuestLogin}
                disabled={isLoggingIn}
              >
                Continue as Guest in Sandbox Mode &rarr;
              </button>
            </div>
          )}
        </div>
      </div>

      {/* ─────────────────────────────────────────────────────────────
           RIGHT PANEL: CONTINUOUS DIAGONAL PHONE SHOWCASE
           Conveyor Motion: TOP-RIGHT → BOTTOM-LEFT
           4-Set Redundant Array for 100% Seamless Infinite Looping
      ───────────────────────────────────────────────────────────── */}
      <div className={styles.showcaseColumn}>
        <div className={styles.showcaseVignetteMask} />

        <div className={styles.conveyorViewport}>
          <div className={styles.conveyorTrack}>
            {/* STREAM 1: Resume Intelligence | AI Interview | Job Discovery */}
            <div className={styles.phoneStreamRow}>
              {/* Set 1 */}
              {renderResumeIntelligencePhone("s1-1")}
              {renderAIInterviewPhone("s1-2")}
              {renderJobDiscoveryPhone("s1-3")}
              {/* Set 2 */}
              {renderResumeIntelligencePhone("s1-4")}
              {renderAIInterviewPhone("s1-5")}
              {renderJobDiscoveryPhone("s1-6")}
              {/* Set 3 */}
              {renderResumeIntelligencePhone("s1-7")}
              {renderAIInterviewPhone("s1-8")}
              {renderJobDiscoveryPhone("s1-9")}
              {/* Set 4 */}
              {renderResumeIntelligencePhone("s1-10")}
              {renderAIInterviewPhone("s1-11")}
              {renderJobDiscoveryPhone("s1-12")}
            </div>

            {/* STREAM 2: Performance Analytics | Career Roadmap | VR Interview */}
            <div className={`${styles.phoneStreamRow} ${styles.rowStaggered}`}>
              {/* Set 1 */}
              {renderAnalyticsPhone("s2-1")}
              {renderCareerRoadmapPhone("s2-2")}
              {renderVRInterviewPhone("s2-3")}
              {/* Set 2 */}
              {renderAnalyticsPhone("s2-4")}
              {renderCareerRoadmapPhone("s2-5")}
              {renderVRInterviewPhone("s2-6")}
              {/* Set 3 */}
              {renderAnalyticsPhone("s2-7")}
              {renderCareerRoadmapPhone("s2-8")}
              {renderVRInterviewPhone("s2-9")}
              {/* Set 4 */}
              {renderAnalyticsPhone("s2-10")}
              {renderCareerRoadmapPhone("s2-11")}
              {renderVRInterviewPhone("s2-12")}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
