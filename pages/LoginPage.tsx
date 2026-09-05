import React, { useState } from 'react';
import { GoogleAuthProvider, signInWithEmailAndPassword, signInWithPopup } from 'firebase/auth';
import { auth } from '../firebase';
import { useAppContext } from '../contexts/AppContext';
import { toast } from 'sonner';

const LoginPage: React.FC = () => {
  const { navigate } = useAppContext();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);

  const finish = async (action: () => Promise<unknown>) => {
    setBusy(true);
    try {
      await action();
      navigate('/dashboard');
    } catch {
      toast.error('Sign-in failed. Check the account details and try again.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <main className="container mx-auto max-w-lg px-4 py-16">
      <div className="rounded-2xl border border-yellow-900/30 bg-brand-navy/90 p-7 sm:p-10 shadow-2xl">
        <h1 className="text-3xl font-black text-white">Sign in to DigiPawns</h1>
        <p className="mt-2 text-gray-400">Access your profile, dashboard, saved wallets, and loan activity.</p>

        <button disabled={busy} onClick={() => finish(() => signInWithPopup(auth, new GoogleAuthProvider()))} className="mt-7 w-full rounded-lg border border-gray-600 bg-white px-4 py-3 font-bold text-gray-900 hover:bg-gray-100 disabled:opacity-50">
          Continue with Google
        </button>

        <div className="my-6 flex items-center gap-3 text-xs uppercase tracking-wider text-gray-500"><span className="h-px flex-1 bg-gray-700" />or use email<span className="h-px flex-1 bg-gray-700" /></div>

        <form onSubmit={(e) => { e.preventDefault(); finish(() => signInWithEmailAndPassword(auth, email.trim(), password)); }} className="space-y-4">
          <label className="block text-sm text-gray-300">Email<input required type="email" autoComplete="username" value={email} onChange={e => setEmail(e.target.value)} className="mt-1 w-full rounded-lg border border-gray-700 bg-brand-dark px-4 py-3 text-white outline-none focus:border-brand-gold" /></label>
          <label className="block text-sm text-gray-300">Password<input required type="password" autoComplete="current-password" value={password} onChange={e => setPassword(e.target.value)} className="mt-1 w-full rounded-lg border border-gray-700 bg-brand-dark px-4 py-3 text-white outline-none focus:border-brand-gold" /></label>
          <button disabled={busy} type="submit" className="btn-metallic-gold w-full rounded-lg px-4 py-3 font-bold disabled:opacity-50">{busy ? 'Signing in…' : 'Sign in'}</button>
        </form>

        <p className="mt-6 text-xs leading-5 text-gray-500">By continuing, you agree to the service terms and acknowledge the <a className="text-brand-gold underline" href="/privacy">Privacy Policy</a>. Need help? Visit <a className="text-brand-gold underline" href="/support">Support</a>.</p>
      </div>
    </main>
  );
};

export default LoginPage;
