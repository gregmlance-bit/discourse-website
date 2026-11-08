#!/usr/bin/env node
// Builds the Discourse International website (https://discourseinternational.com).
//
//   node tools/build.js [path to the app repository]
//
// The default app path is ../discourse-international-app. The privacy policy
// and the terms of service are generated from the app's own screens,
// app/(app)/(tabs)/(passport)/privacy-policy.tsx and terms-of-service.tsx
// (the (home) stack before the UI refresh), so the site and the app always
// say the same thing: edit the app, run this, commit. The home, support and
// invitation pages are templates in this file.
'use strict';

const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const APP = path.resolve(process.argv[2] || path.join(ROOT, '..', 'discourse-international-app'));
// The legal screens moved from the Home stack to the Passport stack with the
// UI refresh; either layout builds.
const SCREENS = ['(passport)', '(home)']
  .map((stack) => path.join(APP, 'app', '(app)', '(tabs)', stack))
  .find((dir) => fs.existsSync(path.join(dir, 'privacy-policy.tsx')))
  || path.join(APP, 'app', '(app)', '(tabs)', '(passport)');

const SITE = {
  name: 'Discourse International',
  tagline: 'Conversations That Cross Borders',
  url: 'https://discourseinternational.com',
  email: 'discourseinternationalsupport@gmail.com',
  facebook: 'https://www.facebook.com/p/Discourse-MX-100095042583812/',
  instagram: 'https://www.instagram.com/discourse_mx/',
  appStore: 'https://apps.apple.com/app/id6757833966',
  googlePlay: 'https://play.google.com/store/apps/details?id=com.international.discourse',
  year: new Date().getFullYear(),
};

// ---------------------------------------------------------------------------
// JSX of the app's legal screens -> HTML
// ---------------------------------------------------------------------------

function readScreen(file) {
  const src = path.join(SCREENS, file);
  if (!fs.existsSync(src)) throw new Error(`app screen not found: ${src}`);
  return fs.readFileSync(src, 'utf8').replace(/\r\n/g, '\n');
}

// Each screen renders `currentLanguage === 'es' ? (<es>) : (<en>)` inside a ScrollView.
function branches(tsx) {
  const esStart = tsx.indexOf("currentLanguage === 'es' ? (");
  const split = tsx.indexOf(') : (', esStart);
  const end = tsx.indexOf('</ScrollView>', split);
  if (esStart < 0 || split < 0 || end < 0) throw new Error('could not find the two language branches');
  return { es: tsx.slice(esStart, split), en: tsx.slice(split, end) };
}

// Inline JSX -> inline HTML.
function clean(s) {
  return s
    .replace(/\{'\\n'\}/g, '<br>')
    .replace(/\{' '\}/g, ' ')
    .replace(/<Text fontWeight="600">([\s\S]*?)<\/Text>/g, '<strong>$1</strong>')
    .replace(/<Text[^>]*>/g, '')
    .replace(/<\/Text>/g, '')
    .replace(/\{\s*\}/g, '')
    .replace(/\s*\n\s*/g, ' ')
    .replace(/\s{2,}/g, ' ')
    .replace(/\s*<br>\s*/g, '<br>')
    .replace(/<strong>\s+/g, '<strong>')
    .replace(/\s+<\/strong>/g, '</strong>')
    .trim();
}

// A <Paragraph> holds several paragraphs separated by {'\n\n'}; lines that
// start with a bullet become a list.
function paragraphs(jsx) {
  const parts = jsx.split(/\{'\\n\\n'\}/).map(clean).filter(Boolean);
  const blocks = [];
  let list = null;
  for (const p of parts) {
    if (p.startsWith('• ')) {
      if (!list) blocks.push((list = []));
      list.push(p.slice(2).trim());
    } else {
      list = null;
      blocks.push(p);
    }
  }
  return blocks
    .map((b) => (Array.isArray(b) ? `<ul>\n${b.map((li) => `  <li>${li}</li>`).join('\n')}\n</ul>` : `<p>${b}</p>`))
    .join('\n');
}

function convert(jsx) {
  const out = [];
  const re = /<Text fontSize=\{12\}>([\s\S]*?)<\/Text>|<H6[^>]*>([\s\S]*?)<\/H6>|<Paragraph[^>]*>([\s\S]*?)<\/Paragraph>/g;
  let m;
  while ((m = re.exec(jsx))) {
    if (m[1] !== undefined) out.push(`<p class="meta">${clean(m[1])}</p>`);
    else if (m[2] !== undefined) out.push(`<h2>${clean(m[2])}</h2>`);
    else out.push(paragraphs(m[3]));
  }
  return out.join('\n');
}

function legalScreen(file) {
  const b = branches(readScreen(file));
  const en = convert(b.en);
  const es = convert(b.es);
  const count = (h) => (h.match(/<h2>/g) || []).length;
  if (count(en) === 0 || count(en) !== count(es)) {
    throw new Error(`${file}: ${count(en)} EN sections vs ${count(es)} ES sections`);
  }
  const updated = (h) => ((h.match(/(Last Updated|Última actualización):\s*([^<]+)/) || [])[2] || '').trim();
  return { en, es, sections: count(en), updated: { en: updated(en), es: updated(es) } };
}

// Screen titles come from the app's locale files.
function titles() {
  const read = (lang) => JSON.parse(fs.readFileSync(path.join(APP, 'i18n', `${lang}.json`), 'utf8'));
  const en = read('en');
  const es = read('es');
  return {
    privacy: { en: en.home?.privacyPolicy || 'Privacy Policy', es: es.home?.privacyPolicy || 'Política de Privacidad' },
    terms: { en: en.home?.termsOfService || 'Terms of Service', es: es.home?.termsOfService || 'Términos y Condiciones de Uso' },
  };
}

// ---------------------------------------------------------------------------
// Page chrome
// ---------------------------------------------------------------------------

const ICONS = {
  back: '<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" aria-hidden="true"><path stroke-linecap="round" stroke-linejoin="round" d="M10.5 19.5 3 12m0 0 7.5-7.5M3 12h18"></path></svg>',
  facebook: '<svg fill="currentColor" viewBox="0 0 24 24" aria-hidden="true"><path fill-rule="evenodd" d="M22 12c0-5.523-4.477-10-10-10S2 6.477 2 12c0 4.991 3.657 9.128 8.438 9.878v-6.987h-2.54V12h2.54V9.797c0-2.506 1.492-3.89 3.777-3.89 1.094 0 2.238.195 2.238.195v2.46h-1.26c-1.243 0-1.63.771-1.63 1.562V12h2.773l-.443 2.89h-2.33v6.988C18.343 21.128 22 16.991 22 12z" clip-rule="evenodd"></path></svg>',
  instagram: '<svg fill="currentColor" viewBox="0 0 24 24" aria-hidden="true"><path fill-rule="evenodd" d="M12.315 2c2.43 0 2.784.013 3.808.06 1.064.049 1.791.218 2.427.465a4.902 4.902 0 011.772 1.153 4.902 4.902 0 011.153 1.772c.247.636.416 1.363.465 2.427.048 1.067.06 1.407.06 4.123v.08c0 2.643-.012 2.987-.06 4.043-.049 1.064-.218 1.791-.465 2.427a4.902 4.902 0 01-1.153 1.772 4.902 4.902 0 01-1.772 1.153c-.636.247-1.363.416-2.427.465-1.067.048-1.407.06-4.123.06h-.08c-2.643 0-2.987-.012-4.043-.06-1.064-.049-1.791-.218-2.427-.465a4.902 4.902 0 01-1.772-1.153 4.902 4.902 0 01-1.153-1.772c-.247-.636-.416-1.363-.465-2.427-.047-1.024-.06-1.379-.06-3.808v-.63c0-2.43.013-2.784.06-3.808.049-1.064.218-1.791.465-2.427a4.902 4.902 0 011.153-1.772A4.902 4.902 0 015.45 2.525c.636-.247 1.363-.416 2.427-.465C8.901 2.013 9.256 2 11.685 2h.63zm-.081 1.802h-.468c-2.456 0-2.784.011-3.807.058-.975.045-1.504.207-1.857.344-.467.182-.8.398-1.15.748-.35.35-.566.683-.748 1.15-.137.353-.3.882-.344 1.857-.047 1.023-.058 1.351-.058 3.807v.468c0 2.456.011 2.784.058 3.807.045.975.207 1.504.344 1.857.182.466.399.8.748 1.15.35.35.683.566 1.15.748.353.137.882.3 1.857.344 1.054.048 1.37.058 4.041.058h.08c2.597 0 2.917-.01 3.96-.058.976-.045 1.505-.207 1.858-.344.466-.182.8-.398 1.15-.748.35-.35.566-.683.748-1.15.137-.353.3-.882.344-1.857.048-1.055.058-1.37.058-4.041v-.08c0-2.597-.01-2.917-.058-3.96-.045-.976-.207-1.505-.344-1.858a3.097 3.097 0 00-.748-1.15 3.098 3.098 0 00-1.15-.748c-.353-.137-.882-.3-1.857-.344-1.023-.047-1.351-.058-3.807-.058zM12 6.865a5.135 5.135 0 110 10.27 5.135 5.135 0 010-10.27zm0 1.802a3.333 3.333 0 100 6.666 3.333 3.333 0 000-6.666zm5.338-3.205a1.2 1.2 0 110 2.4 1.2 1.2 0 010-2.4z" clip-rule="evenodd"></path></svg>',
};

// Text that exists in both languages: <span data-lang="en">…</span><span data-lang="es" hidden>…</span>
const bi = (en, es, tag = 'span') => `<${tag} data-lang="en">${en}</${tag}><${tag} data-lang="es" hidden>${es}</${tag}>`;

function footer() {
  return `<footer>
  <nav class="links" aria-label="Site">
    <a href="/privacy">${bi('Privacy', 'Privacidad')}</a>
    <a href="/terms">${bi('Terms', 'Términos')}</a>
    <a href="/support">${bi('Support', 'Soporte')}</a>
  </nav>
  <div class="social">
    <a href="${SITE.facebook}"><span class="sr-only">Facebook</span>${ICONS.facebook}</a>
    <a href="${SITE.instagram}"><span class="sr-only">Instagram</span>${ICONS.instagram}</a>
  </div>
  <p class="copy">© ${SITE.year} ${SITE.name}. All rights reserved.</p>
</footer>`;
}

// Shows one language: ?lang=es, then the saved choice, then the browser's language.
const LANG_SCRIPT = `<script>
(function () {
  var buttons = document.querySelectorAll('.lang button');
  function show(lang) {
    document.querySelectorAll('[data-lang]').forEach(function (el) { el.hidden = el.dataset.lang !== lang; });
    buttons.forEach(function (b) { b.setAttribute('aria-pressed', String(b.dataset.set === lang)); });
    document.documentElement.lang = lang;
    try { localStorage.setItem('lang', lang); } catch (e) {}
  }
  buttons.forEach(function (b) { b.addEventListener('click', function () { show(b.dataset.set); }); });
  var fromUrl = new URLSearchParams(location.search).get('lang');
  var saved = null;
  try { saved = localStorage.getItem('lang'); } catch (e) {}
  var nav = (navigator.language || '').toLowerCase().indexOf('es') === 0 ? 'es' : 'en';
  var lang = fromUrl || saved || nav;
  show(lang === 'es' ? 'es' : 'en');
})();
</script>`;

function head({ title, description, canonical }) {
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${title}</title>
<meta name="description" content="${description}">
<link rel="canonical" href="${SITE.url}${canonical}">
<meta property="og:title" content="${title}">
<meta property="og:description" content="${description}">
<meta property="og:image" content="${SITE.url}/assets/discourse-home.jpg">
<meta name="theme-color" content="#000000">
<link rel="icon" href="/favicon.ico" sizes="48x48">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Geist:wght@400;600;700&family=Geist+Mono:wght@300;400;600;700&display=swap">
<link rel="stylesheet" href="/assets/site.css">
</head>`;
}

// A page with a title bar (back arrow, title, language toggle) and a white card.
// Written as <slug>.html at the root: GitHub Pages serves it at /<slug>, the
// URL the store listings and the app have always used.
function cardPage({ slug, title, description, body }) {
  return `${head({ title: `${title.en} · ${SITE.name}`, description, canonical: `/${slug}` })}
<body>
<main class="page">
  <header class="bar">
    <div class="bar-title">
      <a class="back" href="/" aria-label="Back to home">${ICONS.back}</a>
      <h1>${bi(title.en, title.es)}</h1>
    </div>
    <div class="lang" role="group" aria-label="Language">
      <button type="button" data-set="en" aria-pressed="true">English</button>
      <button type="button" data-set="es" aria-pressed="false">Español</button>
    </div>
  </header>
  <div class="card">
${body}
  </div>
</main>
${footer()}
${LANG_SCRIPT}
</body>
</html>
`;
}

function legalPage(slug, title, legal) {
  const body = `    <section data-lang="en" lang="en">
${legal.en}
    </section>
    <section data-lang="es" lang="es" hidden>
${legal.es}
    </section>`;
  const description = slug === 'privacy'
    ? `Privacy policy of the ${SITE.name} app.`
    : `Terms of service of the ${SITE.name} app.`;
  return cardPage({ slug, title, description, body });
}

function supportPage() {
  const body = `    <section class="support" data-lang="en" lang="en">
      <div class="block">
        <div class="lead">
          <h2>Get in touch</h2>
          <p>We’d love to hear from you!</p>
        </div>
        <div class="tile">
          <h3>General Support</h3>
          <dl><dt>Email</dt><dd><a href="mailto:${SITE.email}">${SITE.name} Support</a></dd></dl>
        </div>
      </div>
      <div class="block">
        <div class="lead">
          <h2>Visit us</h2>
          <p>We have events in the following locations:</p>
        </div>
        <div class="tile">
          <h3>Mexico City</h3>
          <address>Av. Álvaro Obregón 154-primer piso<br>Roma Norte, Cuauhtémoc<br>Mexico City, MX 06700</address>
        </div>
      </div>
    </section>
    <section class="support" data-lang="es" lang="es" hidden>
      <div class="block">
        <div class="lead">
          <h2>Ponte en contacto</h2>
          <p>¡Nos encantaría saber de ti!</p>
        </div>
        <div class="tile">
          <h3>Soporte General</h3>
          <dl><dt>Correo electrónico</dt><dd><a href="mailto:${SITE.email}">${SITE.name} Support</a></dd></dl>
        </div>
      </div>
      <div class="block">
        <div class="lead">
          <h2>Visítanos</h2>
          <p>Tenemos eventos en las siguientes ubicaciones:</p>
        </div>
        <div class="tile">
          <h3>Ciudad de México</h3>
          <address>Av. Álvaro Obregón 154-primer piso<br>Roma Norte, Cuauhtémoc<br>Ciudad de México, MX 06700</address>
        </div>
      </div>
    </section>`;
  return cardPage({
    slug: 'support',
    title: { en: 'Support', es: 'Soporte' },
    description: `Contact ${SITE.name}.`,
    body,
  });
}

// 404.html. GitHub Pages serves it for any path with no file, which makes it
// the invitation page too: a person's QR in the app holds
// https://discourseinternational.com/m/<their id>?c=<code>
// (CONNECTIONS-DESIGN.md, sections 1 and 7, in discourse-international-app),
// so a phone camera without the app lands here. Under /m/ it explains and
// links to the stores; anywhere else it is a plain "not found". On an iPhone
// or an Android phone it says, for two seconds, that the store is opening and
// to scan the code again after signing up, then opens the store (Greg,
// 2026-11-08); the steps and buttons stay underneath in case it doesn't.
// Nothing from the link (id or code) is shown, stored or sent anywhere.
function notFoundPage() {
  const store = (href, label) =>
    `<a class="store" href="${href}" rel="noopener">${label}</a>`;
  const body = `    <section id="invite" hidden>
      <p id="opening" class="opening" role="status" hidden>
        <strong>${bi('Opening <span class="store-name-en"></span>…', 'Abriendo <span class="store-name-es"></span>…')}</strong><br>
        ${bi('After you sign up, open <strong>Scan</strong> and scan their code again.', 'Después de registrarte, abre <strong>Escanear</strong> y escanea su código otra vez.')}
      </p>
      <h2>${bi('Exchange stamps on Discourse', 'Intercambia sellos en Discourse')}</h2>
      <p>${bi(
        'Someone just showed you their Discourse code. Discourse is a language exchange that meets in person, and everyone you meet gives you a stamp from their country.',
        'Alguien te acaba de mostrar su código de Discourse. Discourse es un intercambio de idiomas en persona, y cada persona que conoces te da un sello de su país.'
      )}</p>
      <ol class="steps">
        <li>${bi('Get the app and sign up.', 'Descarga la app y regístrate.')}</li>
        <li>${bi('Open <strong>Scan</strong>.', 'Abre <strong>Escanear</strong>.')}</li>
        <li>${bi('Ask them to show their code again and scan it: it changes every 30 seconds.', 'Pídele que vuelva a mostrar su código y escanéalo: cambia cada 30 segundos.')}</li>
      </ol>
      <div class="stores">
        ${store(SITE.appStore, 'App Store')}
        ${store(SITE.googlePlay, 'Google Play')}
      </div>
    </section>
    <section id="missing">
      <h2>${bi('Page not found', 'Página no encontrada')}</h2>
      <p><a href="/">${bi('Go to the home page', 'Ir a la página de inicio')}</a></p>
    </section>`;
  const page = cardPage({
    slug: '404',
    title: { en: 'Discourse', es: 'Discourse' },
    description: SITE.tagline,
    body,
  });
  // Not indexed; the invitation shows itself under /m/ only, and the store
  // the phone uses goes first.
  return page
    .replace('<meta name="description"', '<meta name="robots" content="noindex">\n<meta name="description"')
    .replace(
      '</body>',
      `<script>
(function () {
  if (location.pathname.indexOf('/m/') !== 0) return;
  document.getElementById('invite').hidden = false;
  document.getElementById('missing').hidden = true;
  document.title = 'Discourse · ' + document.querySelector('#invite h2 [data-lang]:not([hidden])').textContent;
  var ua = navigator.userAgent;
  var android = /android/i.test(ua);
  // iPadOS reports itself as a Mac; a touch screen tells them apart.
  var ios = /iPhone|iPad|iPod/.test(ua) || (/Macintosh/.test(ua) && navigator.maxTouchPoints > 1);
  if (android) {
    var stores = document.querySelector('.stores');
    stores.insertBefore(stores.lastElementChild, stores.firstElementChild);
  }
  if (!android && !ios) return;
  var target = android ? '${SITE.googlePlay}' : '${SITE.appStore}';
  document.querySelectorAll('.store-name-en').forEach(function (el) { el.textContent = android ? 'Google Play' : 'the App Store'; });
  document.querySelectorAll('.store-name-es').forEach(function (el) { el.textContent = android ? 'Google Play' : 'la App Store'; });
  document.getElementById('opening').hidden = false;
  setTimeout(function () { location.href = target; }, 2000);
})();
</script>
</body>`
    );
}

function homePage() {
  const rows = [
    ['left', ['DIALOGUE', 'CULTURE', 'CONNECTION', 'EXCHANGE', 'UNITY']],
    ['right', ['CONVERSATION', 'GLOBAL', 'VOICES', 'COMMUNITY', 'PERSPECTIVE']],
    ['left', ['IDEAS', 'BORDERS', 'UNDERSTANDING', 'STORIES', 'DIVERSITY']],
    ['right', ['DISCOURSE', 'INTERNATIONAL', 'COMMUNICATION', 'BRIDGE', 'WORLD']],
    ['left', ['IDEAS', 'BORDERS', 'UNDERSTANDING', 'STORIES', 'DIVERSITY']],
  ];
  // The track holds the words twice over; the animation moves it by half its width, so it loops without a seam.
  const marquee = rows
    .map(([dir, words]) => {
      const half = Array(4).fill(words).flat();
      const spans = [...half, ...half].map((w) => `<span>${w}</span>`).join('');
      return `      <div class="row"><div class="track ${dir}">${spans}</div></div>`;
    })
    .join('\n');
  return `${head({ title: SITE.name, description: SITE.tagline, canonical: '/' })}
<body>
<main class="hero">
  <div class="hero-bg" role="img" aria-label="A Discourse International event"></div>
  <div class="marquee" aria-hidden="true">
${marquee}
  </div>
  <div class="hero-text">
    <h1>DISCOURSE</h1>
    <p>${SITE.tagline}</p>
  </div>
</main>
${footer()}
${LANG_SCRIPT}
</body>
</html>
`;
}

// ---------------------------------------------------------------------------

function write(rel, html) {
  const file = path.join(ROOT, rel);
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, html);
  console.log(`${rel}: ${html.length} chars`);
}

const t = titles();
const privacy = legalScreen('privacy-policy.tsx');
const terms = legalScreen('terms-of-service.tsx');
console.log(`privacy: ${privacy.sections} sections, updated ${privacy.updated.en} / ${privacy.updated.es}`);
console.log(`terms: ${terms.sections} sections, updated ${terms.updated.en} / ${terms.updated.es}`);

write('index.html', homePage());
write('privacy.html', legalPage('privacy', t.privacy, privacy));
write('terms.html', legalPage('terms', t.terms, terms));
write('support.html', supportPage());
write('404.html', notFoundPage());
