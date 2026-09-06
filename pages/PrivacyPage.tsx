import React from 'react';

const Section: React.FC<{ title: string; children: React.ReactNode }> = ({ title, children }) => (
  <section className="space-y-3">
    <h2 className="text-2xl font-bold text-brand-gold">{title}</h2>
    <div className="space-y-3 text-gray-300 leading-7">{children}</div>
  </section>
);

const PrivacyPage: React.FC = () => (
  <main className="container mx-auto max-w-4xl px-4 sm:px-6 py-14">
    <div className="rounded-2xl border border-yellow-900/30 bg-brand-navy/80 p-6 sm:p-10 shadow-2xl space-y-10">
      <header className="space-y-3">
        <p className="text-sm font-semibold uppercase tracking-widest text-brand-gold">DigiPawns</p>
        <h1 className="text-4xl font-black text-white">Privacy Policy</h1>
        <p className="text-gray-400">Effective August 31, 2026 · Last updated August 31, 2026</p>
        <p className="text-gray-300 leading-7">
          This policy explains how DigiPawns collects, uses, shares, protects, and deletes information when you use
          digipawns.online or the DigiPawns Android application.
        </p>
      </header>

      <Section title="Information we collect">
        <p>When you sign in, Firebase Authentication supplies an account identifier and may supply your name, email address, and profile image. We store the profile settings you choose, notification preferences, support communications, saved wallet addresses, and records needed to provide the service.</p>
        <p>When you use appraisal, marketplace, or lending features, we may process NFT contract addresses, token IDs, wallet addresses, transaction hashes, appraisal inputs and results, loan status, and related activity records.</p>
        <p>Technical providers may process device, browser, IP address, diagnostic, security, and usage information needed to operate and protect the service.</p>
      </Section>

      <Section title="How we use information">
        <p>We use information to authenticate users, provide requested features, show account history, process and verify blockchain activity, prevent fraud and abuse, maintain security, answer support requests, and comply with legal obligations.</p>
        <p>AI-generated appraisals are estimates and are not guarantees of sale price, liquidity, or loan eligibility.</p>
      </Section>

      <Section title="Wallets and public blockchains">
        <p>Blockchain transactions and wallet addresses are public by design. Information written to a blockchain cannot be altered or deleted by DigiPawns. Disconnecting a wallet or deleting your DigiPawns account does not erase public blockchain records.</p>
      </Section>

      <Section title="Service providers and sharing">
        <p>We use service providers such as Google Firebase for authentication and data services, blockchain RPC and marketplace providers for public asset information, wallet connection providers, and AI services for appraisal assistance. These providers process information under their own terms and privacy policies.</p>
        <p>We do not sell personal information. We may disclose information when required by law, to protect users or the service, or as part of a corporate transaction subject to appropriate safeguards.</p>
      </Section>

      <Section title="Retention and deletion">
        <p>We retain account information while your account is active and as reasonably needed for security, dispute resolution, fraud prevention, tax, accounting, and legal compliance. Financial and blockchain-related records may be retained when deletion is prohibited or would undermine transaction integrity.</p>
        <p>To request deletion, visit <a className="text-brand-gold underline" href="/support#delete-account">our account deletion instructions</a>. We will delete or de-identify eligible account information after verifying the request. Public blockchain data and legally required records cannot be erased.</p>
      </Section>

      <Section title="Security and your choices">
        <p>We use access controls, encrypted transport, restricted database rules, and operational safeguards. No online service is completely risk-free. Never share wallet seed phrases or private keys; DigiPawns support will never ask for them.</p>
        <p>You may disconnect wallets, update profile and notification settings, sign out, or request access, correction, or deletion through the support page.</p>
      </Section>

      <Section title="Children, changes, and contact">
        <p>DigiPawns is not directed to children under 18 and is not intended for anyone who cannot legally enter financial or blockchain transactions in their jurisdiction.</p>
        <p>We may update this policy as the service or law changes. Material updates will be posted here with a revised effective date.</p>
        <p>Privacy questions: <a className="text-brand-gold underline" href="mailto:support@digipawns.online?subject=DigiPawns%20Privacy%20Request">support@digipawns.online</a></p>
      </Section>
    </div>
  </main>
);

export default PrivacyPage;
