# DigiPawns Google Play submission

## Store listing

- App name: `DigiPawns`
- Default language: English (United States)
- Category: Finance
- Support URL: `https://digipawns.online/support`
- Privacy policy URL: `https://digipawns.online/privacy`
- Account deletion URL: `https://digipawns.online/support#delete-account`
- Contact email: `support@digipawns.online`

### Short description

Appraise digital collectibles and manage NFT-backed loan activity securely.

### Full description

DigiPawns helps digital-asset owners understand and manage the value of their NFTs. Explore supported collections, request an AI-assisted appraisal, connect a compatible wallet, review loan terms, and follow the status of NFT-backed loan activity from one dashboard.

Key features:

- AI-assisted NFT appraisal explanations
- Support for Ethereum, Polygon, Base, and selected Solana wallet experiences
- Clear loan terms and repayment information
- Public blockchain transaction links for independent verification
- Dashboard for saved wallets, account activity, and loan status
- Privacy and account-deletion resources available without signing in

Appraisals are estimates and do not guarantee a sale price, liquidity, or loan approval. Cryptocurrency and NFT values can change quickly. Blockchain transactions are public and generally irreversible. Availability of lending and transaction features may depend on jurisdiction, supported assets, and the deployment status of the DigiPawns escrow contract.

## App access for review

The app supports Google sign-in and email/password sign-in at `/login`. Enter the dedicated reviewer credentials only in Play Console under **Policy and programs → App content → App access**. Do not place reviewer credentials in the public store description, repository, screenshots, or release notes.

Suggested review instructions:

1. Open the app and tap **Sign In**.
2. Use the reviewer email and password supplied in the private Play Console fields.
3. The public home, shop, appraisal, privacy, and support pages can be reviewed without connecting a crypto wallet.
4. Wallet-only features require a compatible test wallet. Reviewers should not send real funds.

## Data safety working notes

Confirm every answer in Play Console against the production configuration before submission.

- Account information: email address, display name, profile image, and internal user ID may be processed for authentication and account management.
- User content: profile settings, saved wallet labels, messages, support requests, and NFT appraisal inputs may be processed to provide app functionality.
- Financial information: public wallet addresses, blockchain transaction hashes, loan terms, and loan status may be processed for app functionality, fraud prevention, and compliance. DigiPawns does not collect wallet private keys or seed phrases.
- App activity and diagnostics: device, browser, security, diagnostic, and usage information may be processed by service providers to operate and protect the service.
- Data is encrypted in transit.
- Users can request deletion at `https://digipawns.online/support#delete-account`.
- Public blockchain records cannot be deleted by DigiPawns.

## Required Play Console declarations

- Complete App access using the private reviewer account.
- Complete Data safety using the production SDK and provider configuration.
- Declare the app's financial features accurately, including NFT-backed lending if enabled.
- Complete content rating, target audience, ads, government-app, and news-app declarations.
- Complete the advertising ID declaration; the current Android manifest does not request the advertising ID permission.
- Enroll in Play App Signing and register the repository's upload certificate.
- Upload the signed release AAB from the `Android AAB` GitHub Actions artifact.
- Use the graphics and genuine app screenshots under `store-assets/`.
- Complete any closed-testing requirement shown for the developer account before requesting production access.
