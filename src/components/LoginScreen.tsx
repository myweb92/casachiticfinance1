import React, { useState } from 'react';
import { Language, UserProfile, UserRole } from '../types';
import { translations } from '../translations';
import { 
  Lock, 
  User, 
  Key, 
  Warehouse, 
  AlertCircle,
  ArrowRight,
  ShieldCheck,
} from 'lucide-react';
import { auth } from '../firebase';
import { signInWithPopup, GoogleAuthProvider } from 'firebase/auth';

interface LoginScreenProps {
  onLoginSuccess: (user: UserProfile) => void;
  lang: Language;
  onToggleLanguage: (l: Language) => void;
}

export default function LoginScreen({ onLoginSuccess, lang, onToggleLanguage }: LoginScreenProps) {
  const t = translations[lang];
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [isGoogleSigningIn, setIsGoogleSigningIn] = useState(false);

  // Built-in test accounts (Manual input only for security purposes, no autologin buttons)
  const testAccounts = [
    { u: 'manager@hotel.com', p: 'admin', name: 'Radu Crețu', role: 'Manager' as UserRole },
    { u: 'ops@hotel.com', p: 'admin', name: 'Mircea Sandu', role: 'Operational Manager' as UserRole },
    { u: 'staff@hotel.com', p: 'admin', name: 'Elena Popescu', role: 'Staff' as UserRole }
  ];

  const handleManualLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');

    const match = testAccounts.find(acc => acc.u === username.trim().toLowerCase() && acc.p === password);
    if (match) {
      onLoginSuccess({
        username: match.u,
        role: match.role,
        fullName: match.name
      });
    } else {
      setErrorMsg(t.invalidPrefs);
    }
  };

  const handleGoogleSignIn = async () => {
    setIsGoogleSigningIn(true);
    setErrorMsg('');
    try {
      const provider = new GoogleAuthProvider();
      provider.setCustomParameters({
        prompt: 'select_account'
      });
      
      const result = await signInWithPopup(auth, provider);
      const user = result.user;
      
      const email = user.email || '';
      const fullName = user.displayName || 'Google User';
      
      // Enforce Admin role exclusively based on authenticated Google email address
      const isSudha = email.toLowerCase() === '5minsudha@gmail.com';
      const assignedRole: UserRole = isSudha ? 'Administrator' : 'Staff';

      onLoginSuccess({
        username: email,
        fullName: fullName,
        role: assignedRole
      });
    } catch (error: any) {
      console.error("Google Auth failed: ", error);
      if (error?.code === 'auth/popup-closed-by-user') {
        setErrorMsg(lang === 'RO' ? "Fereastra de autentificare Google a fost închisă de utilizator." : "Google sign-in window was closed by the user.");
      } else {
        setErrorMsg(error?.message || String(error));
      }
    } finally {
      setIsGoogleSigningIn(false);
    }
  };

  return (
    <div className="min-h-screen w-full bg-slate-950 flex flex-col items-center justify-center p-4 relative overflow-hidden select-none">
      
      {/* Decorative ambient blurred backgrounds */}
      <div className="absolute top-1/4 left-1/4 w-80 h-80 rounded-full bg-orange-650/10 blur-3xl pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 rounded-full bg-blue-650/10 blur-3xl pointer-events-none" />

      {/* Language Switcher on the top right */}
      <div className="absolute top-4 right-4 z-50 bg-slate-900 border border-slate-800 p-1 rounded-lg flex items-center gap-1">
        <button
          onClick={() => onToggleLanguage('RO')}
          className={`px-2.5 py-1 rounded-md text-[11px] font-black tracking-wide transition cursor-pointer ${
            lang === 'RO' ? 'bg-orange-600 text-white shadow-sm' : 'text-slate-400 hover:text-white'
          }`}
        >
          ROMÂNĂ
        </button>
        <button
          onClick={() => onToggleLanguage('EN')}
          className={`px-2.5 py-1 rounded-md text-[11px] font-black tracking-wide transition cursor-pointer ${
            lang === 'EN' ? 'bg-orange-600 text-white shadow-sm' : 'text-slate-400 hover:text-white'
          }`}
        >
          ENGLISH
        </button>
      </div>

      <div className="w-full max-w-md space-y-6 relative z-10 font-sans">
        
        {/* Hub branding header */}
        <div className="text-center space-y-2">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-orange-500 to-amber-600 flex items-center justify-center text-white mx-auto shadow-lg shadow-orange-500/20">
            <Warehouse className="w-9 h-9" />
          </div>
          <div className="space-y-1">
            <h1 className="text-2xl font-black tracking-tight text-white uppercase">
              {t.headerTitle}
            </h1>
            <p className="text-xs text-slate-400 font-medium">
              Sistem e-Factura & Management Activități Operative
            </p>
          </div>
        </div>

        {/* Login form Card */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-2xl space-y-5">
          <div className="space-y-1">
            <h2 className="text-lg font-extrabold text-white">
              {t.loginTitle}
            </h2>
            <p className="text-xs text-slate-450 leading-relaxed font-semibold">
              {t.loginSub}
            </p>
          </div>

          <form onSubmit={handleManualLogin} className="space-y-4 text-xs text-slate-300">
            {errorMsg && (
              <div className="bg-rose-500/10 border border-rose-500/30 rounded-xl p-3 text-rose-400 flex items-start gap-2.5 font-semibold font-sans">
                <AlertCircle className="w-4.5 h-4.5 shrink-0 mt-0.5" />
                <span>{errorMsg}</span>
              </div>
            )}

            {/* Username Input */}
            <div className="space-y-1.5 font-sans">
              <label className="text-slate-400 font-bold block mb-1">{t.username}</label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-slate-500">
                  <User className="w-4 h-4" />
                </span>
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="manager@hotel.com"
                  required
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl py-2.5 pl-10 pr-3 text-white placeholder-slate-700 focus:outline-none focus:border-orange-500 transition font-medium"
                />
              </div>
            </div>

            {/* Password Input */}
            <div className="space-y-1.5 font-sans">
              <label className="text-slate-400 font-bold block mb-1">{t.password}</label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-slate-500">
                  <Lock className="w-4 h-4" />
                </span>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl py-2.5 pl-10 pr-3 text-white placeholder-slate-700 focus:outline-none focus:border-orange-500 transition font-mono font-bold"
                />
              </div>
            </div>

            {/* Sign in Button */}
            <button
              type="submit"
              className="w-full bg-orange-600 hover:bg-orange-550 text-white font-heavy text-xs py-3 rounded-xl flex items-center justify-center gap-1.5 shadow-lg shadow-orange-600/15 transition active:scale-98 cursor-pointer font-extrabold uppercase tracking-wide"
            >
              <span>{t.signIn}</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </form>

          {/* OR divider */}
          <div className="flex items-center gap-3 text-slate-700 font-bold py-1 select-none">
            <span className="h-[1px] bg-slate-800 flex-1" />
            <span className="text-[9px] tracking-widest uppercase">{lang === 'RO' ? 'SAU' : 'OR'}</span>
            <span className="h-[1px] bg-slate-800 flex-1" />
          </div>

          {/* Google Sign-in action */}
          <button
            type="button"
            disabled={isGoogleSigningIn}
            onClick={handleGoogleSignIn}
            className={`w-full bg-white hover:bg-slate-50 text-slate-800 border border-slate-200 font-extrabold text-xs py-2.5 rounded-xl flex items-center justify-center gap-2.5 transition active:scale-98 cursor-pointer shadow-sm uppercase tracking-wide ${isGoogleSigningIn ? 'opacity-70 cursor-not-allowed' : ''}`}
          >
            {isGoogleSigningIn ? (
              <div className="w-4 h-4 border-2 border-slate-400 border-t-slate-800 rounded-full animate-spin" />
            ) : (
              <svg className="w-4 h-4" viewBox="0 0 24 24">
                <path
                  fill="#4285F4"
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                />
                <path
                  fill="#34A853"
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                />
                <path
                  fill="#FBBC05"
                  d="M5.84 14.09c-.22-.66-.35-1.39-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                />
                <path
                  fill="#EA4335"
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                />
              </svg>
            )}
            <span>
              {isGoogleSigningIn 
                ? (lang === 'RO' ? 'Se conectează...' : 'Connecting...') 
                : (lang === 'RO' ? 'Conectare securizată cu Google' : 'Secure Sign in with Google')}
            </span>
          </button>

        </div>

        {/* Technical standards footer notice */}
        <div className="text-center flex items-center justify-center gap-2 text-[10px] text-slate-600 font-bold">
          <ShieldCheck className="w-4 h-4 text-slate-700" />
          <span>RO ANAF Hub Compliant • Standalone Workspace v2.5</span>
        </div>
      </div>

    </div>
  );
}
