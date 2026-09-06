import React from 'react';

const SupportPage: React.FC = () => (
  <main className="container mx-auto max-w-4xl px-4 sm:px-6 py-14">
    <div className="rounded-2xl border border-yellow-900/30 bg-brand-navy/80 p-6 sm:p-10 shadow-2xl space-y-10">
      <header className="space-y-3">
        <p className="text-sm font-semibold uppercase tracking-widest text-brand-gold">DigiPawns Help Center</p>
        <h1 className="text-4xl font-black text-white">Support</h1>
        <p className="text-gray-300 leading-7">Get help with sign-in, wallets, appraisals, transactions, loans, privacy, or account deletion.</p>
      </header>

      <section className="grid gap-4 sm:grid-cols-2">
        {[
          ['Sign-in help', 'Confirm that pop-ups are allowed, choose the same account you used previously, and retry on a stable connection.'],
          ['Wallet help', 'Verify the wallet app is installed, use a supported network, and never share your seed phrase or private key.'],
          ['Transaction help', 'Include the public transaction hash and network in your request. Never send private keys or recovery phrases.'],
          ['Appraisal help', 'Include the marketplace, blockchain, NFT contract address, and token ID. Appraisals are estimates, not guaranteed prices.'],
        ].map(([title, body]) => (
          <article key={title} className="rounded-xl border border-yellow-900/25 bg-brand-dark/70 p-5">
            <h2 className="text-lg font-bold text-brand-gold">{title}</h2>
            <p className="mt-2 text-gray-300 leading-6">{body}</p>
          </article>
        ))}
      </section>

      <section className="space-y-4">
        <h2 className="text-2xl font-bold text-brand-gold">Contact support</h2>
        <p className="text-gray-300 leading-7">Email <a className="text-brand-gold underline" href="mailto:support@digipawns.online?subject=DigiPawns%20Support%20Request">support@digipawns.online</a>. Include your account email, a description of the problem, the device and browser or app version, and any public transaction hash. Do not include passwords, seed phrases, or private keys.</p>
      </section>

      <section id="delete-account" className="scroll-mt-28 space-y-4 rounded-xl border border-red-900/40 bg-red-950/20 p-6">
        <h2 className="text-2xl font-bold text-white">Delete your account and information</h2>
        <p className="text-gray-300 leading-7">Send a deletion request from the email associated with your DigiPawns account using the button below. Use the subject “Delete my DigiPawns account.” We may ask you to verify ownership before deletion.</p>
        <ol className="list-decimal space-y-2 pl-6 text-gray-300 leading-7">
          <li>Sign out and disconnect any linked wallets if you still have access.</li>
          <li>Email the request from your account email and identify any linked wallet addresses you want removed from your profile.</li>
          <li>We will delete or de-identify eligible profile, preferences, saved-wallet, social, and support data after verification.</li>
          <li>Public blockchain transactions cannot be deleted. Certain fraud-prevention, financial, dispute, or legally required records may be retained and access-restricted.</li>
        </ol>
        <a className="inline-flex rounded-lg bg-red-700 px-5 py-3 font-bold text-white hover:bg-red-600" href="mailto:support@digipawns.online?subject=Delete%20my%20DigiPawns%20account&body=Account%20email%3A%0AReason%20(optional)%3A%0ALinked%20wallets%20to%20remove%20(optional)%3A">Request account deletion</a>
      </section>

      <section className="space-y-3">
        <h2 className="text-2xl font-bold text-brand-gold">Privacy and safety</h2>
        <p className="text-gray-300">Read the complete <a className="text-brand-gold underline" href="/privacy">DigiPawns Privacy Policy</a>. DigiPawns staff will never ask for a wallet seed phrase, private key, or password.</p>
      </section>
    </div>
  </main>
);

export default SupportPage;
