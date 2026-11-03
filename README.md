# Discourse International website

The public website at https://discourseinternational.com: home, privacy
policy, terms of service and support. Static HTML, served by **GitHub Pages**
from this repository (owner: `gregmlance-bit`). It replaced the previous
developer's Next.js site on his Vercel account in November 2026, so nobody
needs that account any more.

## Editing

The privacy policy and the terms are **generated from the app's own
screens** (`app/(app)/(tabs)/(home)/privacy-policy.tsx` and
`terms-of-service.tsx` in `discourse-international-app`), so the website and
the app always say the same thing. Edit the app screen (both languages, and
the "Last updated" line), then from this folder:

```
node tools/build.js ../discourse-international-app
git add -A && git commit -m "Regenerate from the app screens" && git push
```

The home and support pages are templates inside `tools/build.js`; the shared
styles are `assets/site.css`. GitHub Pages publishes `main` within a minute
or two of a push.

The pages are `index.html`, `privacy.html`, `terms.html` and `support.html`;
GitHub Pages serves them at `/`, `/privacy`, `/terms` and `/support`, the
URLs the store listings and the app link to.

## Hosting

- Repository Settings → Pages: source "Deploy from a branch", `main`, `/`;
  custom domain `discourseinternational.com` (the `CNAME` file), "Enforce
  HTTPS" on once the certificate is issued.
- DNS at GoDaddy (name servers `ns29/ns30.domaincontrol.com`), as GitHub
  documents for an apex domain:

  | Type | Name | Value |
  |---|---|---|
  | A | `@` | `185.199.108.153` |
  | A | `@` | `185.199.109.153` |
  | A | `@` | `185.199.110.153` |
  | A | `@` | `185.199.111.153` |
  | CNAME | `www` | `gregmlance-bit.github.io` |

  The Resend records for `noreply@discourseinternational.com` (DKIM TXT, the
  `send` and `rsend` CNAMEs, DMARC) are unrelated and stay as they are.

## What the old site had that this one does not

- `/portal`: a web admin portal signed in through Firebase. The app's own
  admin portal replaced it, and Firebase goes read-only at the cutover.
- A YouTube link in the footer that pointed nowhere.
