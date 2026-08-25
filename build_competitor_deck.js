const pptxgen = require('pptxgenjs');

const pptx = new pptxgen();
pptx.layout = 'LAYOUT_WIDE';
pptx.author = 'OpenAI Codex';
pptx.subject = 'Competitive landscape for a user-governed digital diet and finite daily edition';
pptx.title = 'The Intentional Internet — Competitive Landscape';
pptx.company = 'Curation Station';
pptx.lang = 'en-US';
pptx.theme = {
  headFontFace: 'Georgia',
  bodyFontFace: 'Aptos',
  lang: 'en-US'
};
pptx.defineSlideMaster({
  title: 'MASTER',
  background: { color: 'F3F0E8' },
  objects: [
    { line: { x: 0.55, y: 7.08, w: 12.23, h: 0, line: { color: 'C9C4B8', width: 0.8 } } },
    { text: { text: 'CURATION STATION  /  MARKET LANDSCAPE  /  AUGUST 2026', options: { x: 0.58, y: 7.16, w: 8.6, h: 0.15, fontFace: 'Aptos', fontSize: 6.5, color: '746F66', charSpacing: 1.2, margin: 0 } } },
  ],
  slideNumber: { x: 12.2, y: 7.14, w: 0.55, h: 0.18, fontFace: 'Aptos', fontSize: 7, color: '746F66', align: 'right', margin: 0 }
});

const C = {
  paper: 'F3F0E8', ink: '171918', muted: '6E716C', rule: 'C9C4B8',
  orange: 'E05A3F', orange2: 'F6C0AF', teal: '187A73', teal2: 'B9D9D3',
  blue: '2E5F8A', blue2: 'BFD2E2', gold: 'C68B2C', gold2: 'ECD8AF',
  green: '437A52', green2: 'C9DDCC', red: 'B34337', red2: 'E9C4BF',
  white: 'FFFFFF', black: '000000', greybox: 'E7E3DA', dark: '242725'
};

const W = 13.333, H = 7.5;
function addSlide(title, kicker) {
  const s = pptx.addSlide('MASTER');
  if (kicker) s.addText(kicker.toUpperCase(), { x: 0.62, y: 0.34, w: 5.8, h: 0.18, fontFace: 'Aptos', fontSize: 7.3, bold: true, color: C.orange, charSpacing: 1.8, margin: 0 });
  s.addText(title, { x: 0.62, y: kicker ? 0.58 : 0.42, w: 12.05, h: 0.55, fontFace: 'Georgia', fontSize: 24, bold: false, color: C.ink, margin: 0, breakLine: false });
  return s;
}
function rect(s, x, y, w, h, fill, radius = 0, line = null) {
  s.addShape(radius ? pptx.ShapeType.roundRect : pptx.ShapeType.rect, { x, y, w, h, rectRadius: radius, fill: { color: fill }, line: line || { color: fill, transparency: 100 } });
}
function line(s, x, y, w, color = C.rule, width = 1, dash = 'solid') {
  s.addShape(pptx.ShapeType.line, { x, y, w, h: 0, line: { color, width, dash } });
}
function text(s, str, x, y, w, h, opt = {}) {
  s.addText(str, { x, y, w, h, fontFace: opt.fontFace || 'Aptos', fontSize: opt.fontSize || 12, color: opt.color || C.ink, bold: !!opt.bold, italic: !!opt.italic, align: opt.align || 'left', valign: opt.valign || 'top', margin: opt.margin === undefined ? 0 : opt.margin, breakLine: false, fit: 'shrink', bullet: opt.bullet, paraSpaceAfterPt: opt.paraSpaceAfterPt, charSpacing: opt.charSpacing, isTextBox: true, hyperlink: opt.hyperlink });
}
function rich(s, runs, x, y, w, h, opt = {}) {
  s.addText(runs, { x, y, w, h, fontFace: opt.fontFace || 'Aptos', fontSize: opt.fontSize || 12, color: opt.color || C.ink, margin: opt.margin === undefined ? 0 : opt.margin, valign: opt.valign || 'top', breakLine: false, fit: 'shrink', paraSpaceAfterPt: opt.paraSpaceAfterPt });
}
function pill(s, label, x, y, w, fill = C.ink, color = C.white) {
  rect(s, x, y, w, 0.3, fill, 0.14);
  text(s, label.toUpperCase(), x + 0.08, y + 0.055, w - 0.16, 0.15, { fontSize: 7, bold: true, color, align: 'center', charSpacing: 0.7 });
}
function card(s, x, y, w, h, title, body, accent = C.orange, num = null) {
  rect(s, x, y, w, h, C.white, 0.12, { color: C.rule, width: 0.8 });
  rect(s, x, y, 0.08, h, accent);
  if (num !== null) text(s, String(num).padStart(2, '0'), x + 0.22, y + 0.18, 0.5, 0.22, { fontSize: 9, bold: true, color: accent });
  text(s, title, x + 0.22, y + (num !== null ? 0.48 : 0.2), w - 0.42, 0.44, { fontFace: 'Georgia', fontSize: 15.5, color: C.ink });
  text(s, body, x + 0.22, y + (num !== null ? 0.93 : 0.75), w - 0.42, h - (num !== null ? 1.08 : 0.92), { fontSize: 9.5, color: C.muted });
}
function source(s, label, url, x, y, w) {
  rich(s, [
    { text: 'SOURCE  ', options: { bold: true, color: C.orange, fontSize: 6.5 } },
    { text: label, options: { color: C.muted, fontSize: 6.5, hyperlink: { url } } }
  ], x, y, w, 0.16, { margin: 0 });
}
function dot(s, x, y, color, r = 0.07) {
  s.addShape(pptx.ShapeType.ellipse, { x, y, w: r * 2, h: r * 2, fill: { color }, line: { color, transparency: 100 } });
}
function note(s, urls) { s.addNotes(urls.join('\n')); }

// 1 — Cover
{
  const s = pptx.addSlide();
  s.background = { color: C.ink };
  for (let i = 0; i < 7; i++) line(s, 0.65, 0.78 + i * 0.84, 12.0, i === 3 ? C.orange : '454945', i === 3 ? 2.2 : 0.7);
  for (let i = 0; i < 5; i++) s.addShape(pptx.ShapeType.line, { x: 0.85 + i * 3.0, y: 0.65, w: 0, h: 5.9, line: { color: '343835', width: 0.6 } });
  pill(s, 'Competitive landscape', 0.72, 0.55, 2.0, C.orange, C.white);
  text(s, 'THE\nINTENTIONAL\nINTERNET', 0.7, 1.18, 7.25, 3.1, { fontFace: 'Georgia', fontSize: 35, color: C.paper });
  text(s, 'A market map for a user-governed digital diet,\nAI editor, and finite daily edition', 0.74, 4.48, 5.9, 0.92, { fontSize: 16, color: 'D8D3C9' });
  rect(s, 8.45, 1.1, 3.72, 4.75, C.paper, 0.08);
  text(s, 'TODAY’S EDITION', 8.78, 1.42, 3.05, 0.18, { fontSize: 7.5, bold: true, color: C.orange, charSpacing: 1.5 });
  text(s, '28', 8.75, 1.72, 1.0, 0.8, { fontFace: 'Georgia', fontSize: 47, color: C.ink });
  text(s, 'companies and\nproduct families', 9.9, 1.9, 1.85, 0.55, { fontSize: 11, color: C.muted });
  line(s, 8.78, 2.72, 3.0, C.rule, 1.1);
  text(s, 'THE QUESTION', 8.78, 2.96, 3.0, 0.18, { fontSize: 7.5, bold: true, color: C.teal, charSpacing: 1.4 });
  text(s, 'Who decides what deserves access to your attention?', 8.78, 3.28, 2.98, 1.2, { fontFace: 'Georgia', fontSize: 20, color: C.ink });
  text(s, 'Research current to 23 Aug 2026', 8.78, 5.28, 2.95, 0.25, { fontSize: 8, color: C.muted });
  text(s, 'CURATION STATION', 0.74, 6.88, 5.0, 0.2, { fontSize: 7.5, bold: true, color: C.paper, charSpacing: 1.8 });
}

// 2 — Executive takeaway
{
  const s = addSlide('The category is real. The exact product is still unclaimed.', 'Executive takeaway');
  text(s, 'The market has validated every ingredient separately — but no durable consumer product yet combines them into one explicit attention-allocation system.', 0.64, 1.35, 11.95, 0.62, { fontFace: 'Georgia', fontSize: 17, color: C.ink });
  card(s, 0.65, 2.25, 3.85, 3.75, 'Validated demand', 'Mailbrew proves people want useful content without entering feeds. Tapestry proves people will crowdfund algorithm-free aggregation. Are.na proves an aligned, member-funded information environment can sustain meaningful revenue.', C.green, 1);
  card(s, 4.74, 2.25, 3.85, 3.75, 'Competitive compression', 'Specialist readers own ingestion, filters and reading. AI assistants now own proactive briefs, user context and natural-language goals. The opportunity is narrower — and more specific — than “AI news.”', C.orange, 2);
  card(s, 8.83, 2.25, 3.85, 3.75, 'The remaining wedge', 'A source-transparent AI editor constrained by a user-written editorial constitution, a hard time/content budget, a finite stop state, and trusted-human recommendations.', C.teal, 3);
  rect(s, 0.66, 6.25, 12.0, 0.55, C.dark, 0.08);
  text(s, 'BOTTOM LINE  →  Build an attention allocator, not another feed and not a generic daily brief.', 0.92, 6.41, 11.45, 0.18, { fontSize: 11.5, bold: true, color: C.white, align: 'center' });
  note(s, ['https://mailbrew.com/', 'https://www.kickstarter.com/projects/iconfactory/project-tapestry', 'https://www.are.na/about', 'https://gemini.google/overview/daily-brief/']);
}

// 3 — Idea anatomy
{
  const s = addSlide('The proposed product is a control system, not a reader.', 'Idea anatomy');
  const xs = [0.72, 2.86, 5.0, 7.14, 9.28, 11.42];
  const labels = [
    ['01', 'SOURCES', 'RSS · newsletters\nYouTube · saved links'],
    ['02', 'CONSTITUTION', 'Goals · values\nquality rules'],
    ['03', 'BUDGET', 'Time · mix\nnovelty · limits'],
    ['04', 'AI EDITOR', 'Rank · dedupe\nexplain · sequence'],
    ['05', 'FINITE EDITION', '8–15 items\nthen it ends'],
    ['06', 'HUMAN SIGNAL', 'Friends inject\nhigh-weight candidates']
  ];
  labels.forEach((d, i) => {
    rect(s, xs[i], 2.05, 1.6, 2.55, i === 3 ? C.dark : C.white, 0.12, { color: i === 3 ? C.dark : C.rule, width: 0.8 });
    text(s, d[0], xs[i] + 0.16, 2.25, 0.42, 0.22, { fontSize: 8, bold: true, color: i === 3 ? C.orange2 : C.orange });
    text(s, d[1], xs[i] + 0.16, 2.76, 1.26, 0.34, { fontSize: 9.5, bold: true, color: i === 3 ? C.white : C.ink, align: 'center' });
    text(s, d[2], xs[i] + 0.16, 3.45, 1.28, 0.58, { fontSize: 9, color: i === 3 ? 'D9DDD9' : C.muted, align: 'center' });
    if (i < labels.length - 1) text(s, '→', xs[i] + 1.7, 3.02, 0.35, 0.3, { fontSize: 18, color: C.rule, align: 'center' });
  });
  text(s, 'Existing products cluster around one or two boxes.', 0.72, 5.22, 5.55, 0.38, { fontFace: 'Georgia', fontSize: 17, color: C.ink });
  text(s, 'The concept’s differentiation comes from making the constitution and budget first-class — then turning the result into a bounded object rather than another stream.', 0.72, 5.76, 11.55, 0.7, { fontSize: 12.5, color: C.muted });
}

// 4 — Market signals
{
  const s = addSlide('Four signals say “intentional information” is a real paid niche.', 'Market signal');
  const stats = [
    ['60K+', 'Mailbrew users', '7.5M+ digests delivered', C.orange],
    ['$177.8K', 'Tapestry Kickstarter', '3,369 backers', C.blue],
    ['20,516', 'Are.na paying members', '$125,085 monthly recurring revenue', C.teal],
    ['42%', 'sometimes/often avoid news', 'up from 29% in 2017', C.red]
  ];
  stats.forEach((d, i) => {
    const x = 0.67 + i * 3.12;
    rect(s, x, 1.55, 2.85, 3.55, C.white, 0.12, { color: C.rule, width: 0.8 });
    rect(s, x, 1.55, 2.85, 0.11, d[3]);
    text(s, d[0], x + 0.18, 2.05, 2.48, 0.78, { fontFace: 'Georgia', fontSize: 30, color: d[3], align: 'center' });
    text(s, d[1], x + 0.18, 3.03, 2.48, 0.45, { fontSize: 11, bold: true, color: C.ink, align: 'center' });
    text(s, d[2], x + 0.22, 3.72, 2.4, 0.55, { fontSize: 9.5, color: C.muted, align: 'center' });
  });
  rect(s, 0.67, 5.45, 12.0, 0.98, C.gold2, 0.1);
  text(s, 'Interpretation', 0.9, 5.68, 1.25, 0.22, { fontSize: 9, bold: true, color: C.gold });
  text(s, 'This is stronger evidence for a $5–12/month power-user market than for a mass-market social platform. The demand is “help me remain informed without feeling captured.”', 2.15, 5.64, 10.1, 0.46, { fontFace: 'Georgia', fontSize: 13.2, color: C.ink });
  source(s, 'Mailbrew · Kickstarter · Are.na · Reuters Institute DNR 2026', 'https://reutersinstitute.politics.ox.ac.uk/digital-news-report/2026/dnr-executive-summary', 0.72, 6.65, 8.3);
  note(s, ['https://mailbrew.com/', 'https://www.kickstarter.com/projects/iconfactory/project-tapestry', 'https://www.are.na/about', 'https://reutersinstitute.politics.ox.ac.uk/digital-news-report/2026/dnr-executive-summary']);
}

// 5 — Market architecture
{
  const s = addSlide('The market is six overlapping categories, not one.', 'Competitive architecture');
  const groups = [
    ['DIGEST-FIRST', 'Mailbrew · NewsBlur\nMeco · newsletter digests', C.orange, 'Scheduled condensation'],
    ['FEED CONTROL', 'Tapestry · Reeder · Feeeed\nInoreader · Folo', C.blue, 'Own the inputs and order'],
    ['READING OS', 'Readwise Reader · Matter\nInstapaper · KTool', C.teal, 'Capture, consume, retain'],
    ['AI NEWS', 'Particle · Ground News\nApple News · Flipboard', C.gold, 'Summarize and personalize'],
    ['AI ASSISTANTS', 'Gemini · Claude · ChatGPT\nDia · Perplexity', C.red, 'Know goals and act proactively'],
    ['HUMAN DISCOVERY', 'Are.na · Sublime · Cosmos', C.green, 'Taste, people, serendipity']
  ];
  groups.forEach((g, i) => {
    const col = i % 3, row = Math.floor(i / 3);
    const x = 0.67 + col * 4.12, y = 1.55 + row * 2.45;
    rect(s, x, y, 3.75, 2.12, C.white, 0.12, { color: C.rule, width: 0.8 });
    rect(s, x, y, 0.09, 2.12, g[2]);
    text(s, g[0], x + 0.22, y + 0.18, 2.9, 0.2, { fontSize: 8, bold: true, color: g[2], charSpacing: 1.2 });
    text(s, g[1], x + 0.22, y + 0.61, 3.28, 0.62, { fontFace: 'Georgia', fontSize: 13.5, color: C.ink });
    line(s, x + 0.22, y + 1.42, 3.05, C.rule, 0.7);
    text(s, g[3], x + 0.22, y + 1.62, 3.08, 0.25, { fontSize: 9, color: C.muted });
  });
  text(s, 'The proposed product sits at the intersection of all six — which creates both differentiation and scope risk.', 0.68, 6.57, 11.95, 0.3, { fontSize: 11, bold: true, color: C.ink, align: 'center' });
}

// 6 — Threat map
{
  const s = addSlide('The strongest threat is no longer another RSS startup.', 'Threat map');
  text(s, 'Threat = ability to satisfy the same job with existing distribution, context, or habit.', 0.68, 1.28, 8.4, 0.3, { fontSize: 10.5, color: C.muted });
  const rows = [
    ['AI assistants', 'Gemini Daily Brief · Claude scheduled tasks · ChatGPT daily briefs · Dia Morning Brief', 5, 5, 'Own context + habit + proactive delivery'],
    ['Reading OS', 'Readwise Reader · Matter · Instapaper', 4, 4, 'Own capture and deep-reading workflow'],
    ['Digest tools', 'Mailbrew · NewsBlur · Meco', 4, 3, 'Own finite cadence and source aggregation'],
    ['Feed control', 'Inoreader · Tapestry · Reeder · Folo · Feeeed', 3, 4, 'Own source choice, rules and chronology'],
    ['AI news', 'Particle · Ground News · Apple News', 3, 4, 'Own packaged news and publisher relationships'],
    ['Human discovery', 'Are.na · Sublime · Cosmos', 2, 3, 'Own taste networks and social serendipity']
  ];
  const x0 = 0.7, y0 = 1.76, rh = 0.73;
  ['CATEGORY', 'REPRESENTATIVE PRODUCTS', 'NOW', '2Y', 'WHY IT MATTERS'].forEach((h, i) => {
    const xs = [x0, 2.42, 7.85, 8.65, 9.45]; const ws = [1.56, 5.15, 0.64, 0.64, 3.16];
    text(s, h, xs[i], y0 - 0.33, ws[i], 0.16, { fontSize: 6.8, bold: true, color: C.orange, charSpacing: 0.8, align: i === 2 || i === 3 ? 'center' : 'left' });
  });
  rows.forEach((r, i) => {
    const y = y0 + i * rh;
    rect(s, x0, y, 11.95, rh - 0.07, i % 2 ? 'EEEAE1' : C.white, 0.03);
    text(s, r[0], x0 + 0.12, y + 0.19, 1.5, 0.25, { fontSize: 9.5, bold: true, color: C.ink });
    text(s, r[1], 2.42, y + 0.16, 5.15, 0.34, { fontSize: 8.4, color: C.muted });
    [r[2], r[3]].forEach((v, j) => {
      for (let k = 0; k < 5; k++) dot(s, 7.9 + j * 0.8 + k * 0.105, y + 0.25, k < v ? (j ? C.red : C.gold) : C.rule, 0.04);
    });
    text(s, r[4], 9.46, y + 0.13, 3.02, 0.38, { fontSize: 8.1, color: C.ink });
  });
  rect(s, 0.7, 6.38, 11.95, 0.43, C.red2, 0.06);
  text(s, 'Strategic implication: source governance + bounded consumption must be the product, because “personalized morning brief” is becoming a platform feature.', 0.88, 6.50, 11.58, 0.17, { fontSize: 9.6, bold: true, color: C.red, align: 'center' });
}

// 7 — Direct universe I
{
  const s = addSlide('Direct and near-direct competitors: digest + feed control.', 'Competitor universe · 1 of 2');
  const data = [
    ['Mailbrew', 'Daily email digest', 'RSS, newsletters, YouTube, web sources', 'Finite cadence; strong demand proof', '$59/yr'],
    ['NewsBlur', 'Trainable RSS + daily briefing', 'RSS, web feeds, newsletters', 'User training; briefing; clustering', '$36–99/yr'],
    ['Inoreader', 'Power-user monitoring', 'RSS, web, newsletters, social', 'Rules, filters, digests, AI reports', '$90/yr'],
    ['Feedly', 'AI monitoring / intelligence', 'Web and publisher ecosystem', 'Strong AI feeds; B2B depth', '$1,600+/mo B2B'],
    ['Folo', 'AI RSS reader', 'RSS + broad content connectors', 'Open source; AI summaries/digest', 'Freemium'],
    ['Tapestry', 'Universal chronological timeline', 'RSS, Bluesky, Mastodon, YouTube', 'No algorithm; private; extensible', '$20/yr'],
    ['Reeder', 'Unified reading timeline', 'RSS, video, podcast, social', 'No unread pressure; local/privacy', '$10/yr'],
    ['Feeeed', 'Build-your-own anti-doom feed', 'RSS, YouTube, Reddit, email', 'Private; reminders + life cards', 'Free']
  ];
  const cols = [1.45, 2.2, 3.25, 3.45, 1.2];
  const xs = [0.64]; for (let i = 1; i < cols.length; i++) xs.push(xs[i - 1] + cols[i - 1]);
  const heads = ['PRODUCT', 'PRIMARY JOB', 'INPUTS', 'WHAT IT OWNS', 'PRICE SIGNAL'];
  heads.forEach((h, i) => text(s, h, xs[i] + 0.08, 1.34, cols[i] - 0.16, 0.2, { fontSize: 6.7, bold: true, color: C.orange, charSpacing: 0.8 }));
  data.forEach((r, ri) => {
    const y = 1.68 + ri * 0.61;
    rect(s, 0.64, y, 11.55, 0.54, ri % 2 ? 'EEEAE1' : C.white, 0.03);
    r.forEach((v, ci) => text(s, v, xs[ci] + 0.08, y + 0.12, cols[ci] - 0.16, 0.28, { fontSize: ci === 0 ? 8.8 : 7.8, bold: ci === 0, color: ci === 0 ? C.ink : C.muted }));
  });
  text(s, 'Closest current bundles', 0.67, 6.74, 1.5, 0.2, { fontSize: 7, bold: true, color: C.teal });
  text(s, 'Mailbrew ≈ finite digest  |  NewsBlur ≈ trainable ranking + briefing  |  Inoreader ≈ rules + automation  |  Folo ≈ AI reader', 2.25, 6.68, 9.85, 0.28, { fontSize: 9.2, color: C.ink });
  note(s, ['https://mailbrew.com/', 'https://newsblur.com/faq', 'https://www.inoreader.com/pricing', 'https://feedly.com/market-intelligence/pricing', 'https://folo.is/download', 'https://usetapestry.com/', 'https://apps.apple.com/us/app/reeder/id6475002485', 'https://feeeed.nateparrott.com/']);
}

// 8 — Direct universe II
{
  const s = addSlide('Direct and near-direct competitors: reading, news and daily briefs.', 'Competitor universe · 2 of 2');
  const data = [
    ['Readwise Reader', 'Reading operating system', 'Feeds, email, saved items, files', 'Capture, full text, highlights, AI', '$120/yr'],
    ['Matter', 'Read later + subscriptions', 'Saved links, newsletters, RSS', 'Polished reading + AI co-reader', '$60–80/yr'],
    ['Instapaper', 'Read later + Kindle digest', 'User-saved articles', 'Daily/weekly Kindle delivery', '$60/yr'],
    ['KTool', 'Send content to Kindle', 'Articles, newsletters, documents', 'Digest/magazine conversion', '$48/yr'],
    ['Meco', 'Newsletter reading hub', 'Gmail, Outlook, Meco inbox', 'AI summaries + daily audio roundup', '$40/yr'],
    ['Particle', 'AI-personalized news', 'Multi-publisher news + podcasts', 'Story synthesis + perspectives', '$30/yr'],
    ['Gemini Daily Brief', 'Proactive personal briefing', 'Gmail, Calendar, Gemini chats', 'Context, actions, habit surface', 'Bundled paid plan'],
    ['Claude scheduled tasks', 'Recurring research + briefings', 'Web + connected tools', 'Natural-language automation', 'Paid plans'],
    ['Dia Morning Brief', 'Workday attention brief', 'Calendar, email, Slack, tabs', 'Browser context + proactive surface', '$100/mo tier']
  ];
  const cols = [1.65, 2.2, 3.0, 3.32, 1.35];
  const xs = [0.64]; for (let i = 1; i < cols.length; i++) xs.push(xs[i - 1] + cols[i - 1]);
  const heads = ['PRODUCT', 'PRIMARY JOB', 'INPUTS', 'WHAT IT OWNS', 'PRICE SIGNAL'];
  heads.forEach((h, i) => text(s, h, xs[i] + 0.08, 1.34, cols[i] - 0.16, 0.2, { fontSize: 6.7, bold: true, color: C.orange, charSpacing: 0.8 }));
  data.forEach((r, ri) => {
    const y = 1.65 + ri * 0.52;
    rect(s, 0.64, y, 11.55, 0.46, ri % 2 ? 'EEEAE1' : C.white, 0.03);
    r.forEach((v, ci) => text(s, v, xs[ci] + 0.08, y + 0.095, cols[ci] - 0.16, 0.25, { fontSize: ci === 0 ? 8.3 : 7.3, bold: ci === 0, color: ci === 0 ? C.ink : C.muted }));
  });
  rect(s, 0.65, 6.52, 11.55, 0.43, C.orange2, 0.06);
  text(s, 'Most strategically important overlap: Instapaper already does scheduled Kindle digests; Gemini/Claude/Dia already do proactive, context-aware briefs.', 0.85, 6.64, 11.15, 0.18, { fontSize: 9.2, bold: true, color: C.red, align: 'center' });
  note(s, ['https://readwise.io/read', 'https://www.getmatter.com/patron', 'https://www.instapaper.com/docs/premium/overview', 'https://ktool.io/pricing', 'https://meco.app/', 'https://apps.apple.com/us/app/particle-personalized-news/id6683283775', 'https://gemini.google/overview/daily-brief/', 'https://support.claude.com/en/articles/13854387-schedule-recurring-tasks-in-claude-cowork', 'https://www.diabrowser.com/plans']);
}

// 9 — Digest-first
{
  const s = addSlide('Digest-first products validate the behavior — and expose the gap.', 'Deep dive · scheduled condensation');
  card(s, 0.68, 1.55, 3.75, 4.55, 'Mailbrew', 'Closest behavioral analogue. A scheduled email digest across multiple internet sources. Strong language around “unplugging from feeds,” clear demand proof, and a modest $59/year ceiling.\n\nGap: configuration is mostly sources + cadence, not a persistent editorial constitution or explicit attention allocation.', C.orange);
  card(s, 4.79, 1.55, 3.75, 4.55, 'NewsBlur', 'The most underrated technical competitor. Users train by author, tag, title and full text; Archive adds clustering, Ask AI and a Daily Briefing.\n\nGap: still an inbox/reader mental model. Training is preference-based, not goal/value-based; no hard edition budget.', C.blue);
  card(s, 8.90, 1.55, 3.75, 4.55, 'Meco', 'Turns newsletters into a calmer reading space and now produces daily personalized audio roundups plus AI summaries.\n\nGap: newsletter-limited and optimized for skimming/listening, not cross-source editorial allocation.', C.teal);
  rect(s, 0.68, 6.33, 11.97, 0.52, C.dark, 0.07);
  text(s, 'Design lesson  →  A fixed delivery ritual is valuable; “why this item earned one of today’s slots” is still unowned.', 0.98, 6.49, 11.35, 0.18, { fontSize: 10, bold: true, color: C.white, align: 'center' });
  source(s, 'Mailbrew · NewsBlur · Meco', 'https://mailbrew.com/', 0.74, 6.92, 4.0);
}

// 10 — Power readers
{
  const s = addSlide('Power readers are feature-rich — but make the user do editorial work.', 'Deep dive · feeds and intelligence');
  const products = [
    ['INOREADER', 'Rules, filters, monitoring feeds, newsletters, web feeds, AI summaries/reports, scheduled email digests.', 'Excellent ingestion + automation backend.', 'Complex; weak opinion about a healthy finished edition.', C.blue],
    ['FEEDLY', 'AI feeds for topics, companies and trends; deep enterprise monitoring and newsletter automation.', 'Strong relevance models and B2B willingness to pay.', 'Enterprise economics; not a personal wellbeing product.', C.gold],
    ['FOLO', 'Open-source AI RSS reader spanning multiple media types, summaries and digest workflows.', 'Modern UX + fast community adoption.', 'Still centered on a reader/feed; governance is mostly implicit.', C.teal]
  ];
  products.forEach((p, i) => {
    const x = 0.68 + i * 4.1;
    rect(s, x, 1.5, 3.72, 4.95, C.white, 0.12, { color: C.rule, width: 0.8 });
    pill(s, p[0], x + 0.22, 1.78, 1.45, p[4]);
    text(s, p[1], x + 0.22, 2.4, 3.26, 1.15, { fontFace: 'Georgia', fontSize: 13.5, color: C.ink });
    text(s, 'WHAT IT PROVES', x + 0.22, 3.85, 1.4, 0.16, { fontSize: 6.8, bold: true, color: p[4], charSpacing: 1 });
    text(s, p[2], x + 0.22, 4.16, 3.22, 0.58, { fontSize: 9.4, color: C.ink });
    text(s, 'OPENING', x + 0.22, 5.02, 1.0, 0.16, { fontSize: 6.8, bold: true, color: C.orange, charSpacing: 1 });
    text(s, p[3], x + 0.22, 5.32, 3.22, 0.66, { fontSize: 9.4, color: C.muted });
  });
  text(s, 'Their feature breadth is a warning: do not compete by rebuilding every connector and rule engine first.', 0.7, 6.66, 11.8, 0.25, { fontSize: 10, bold: true, color: C.red, align: 'center' });
}

// 11 — E-reader lane
{
  const s = addSlide('The Kindle wedge is validated — and already monetized.', 'Deep dive · reading object');
  const steps = [
    ['INSTAPAPER', 'Daily or weekly Kindle digests', '$60/year', C.orange],
    ['KTOOL', 'Custom digests, magazines + newsletters', '$48/year', C.teal],
    ['READWISE READER', 'Send documents to Kindle; e-ink modes', '$120/year', C.blue],
    ['AMAZON', 'Free Send to Kindle document transport', 'Infrastructure', C.gold]
  ];
  steps.forEach((d, i) => {
    const x = 0.68 + i * 3.08;
    rect(s, x, 1.62, 2.78, 2.65, C.white, 0.1, { color: C.rule, width: 0.8 });
    text(s, d[0], x + 0.18, 1.88, 2.4, 0.2, { fontSize: 7.5, bold: true, color: d[3], charSpacing: 1.2, align: 'center' });
    text(s, d[1], x + 0.25, 2.45, 2.28, 0.72, { fontFace: 'Georgia', fontSize: 14.2, color: C.ink, align: 'center' });
    pill(s, d[2], x + 0.65, 3.48, 1.48, d[3]);
  });
  text(s, 'The differentiator cannot be “articles on Kindle.”', 0.72, 4.75, 5.5, 0.45, { fontFace: 'Georgia', fontSize: 20, color: C.ink });
  const points = [
    'Selection before conversion — the edition is composed, not merely bundled.',
    'A hard daily content/time budget — scarcity is a feature.',
    'Traceable reasons and balance — every slot has an editorial rationale.',
    'Feedback improves the constitution, not an opaque engagement score.'
  ];
  points.forEach((p, i) => {
    dot(s, 6.55, 4.82 + i * 0.47, C.orange, 0.05);
    text(s, p, 6.77, 4.72 + i * 0.47, 5.4, 0.32, { fontSize: 10.2, color: C.muted });
  });
  source(s, 'Instapaper premium · KTool pricing · Readwise Reader', 'https://www.instapaper.com/docs/premium/overview', 0.74, 6.64, 5.8);
  note(s, ['https://www.instapaper.com/docs/premium/overview', 'https://ktool.io/pricing', 'https://readwise.io/read']);
}

// 12 — User-controlled feeds
{
  const s = addSlide('Algorithm-free products prove control matters — but preserve the scroll.', 'Deep dive · user-controlled feeds');
  const ys = [1.58, 3.25, 4.92];
  const rows = [
    ['TAPESTRY', 'One private chronological timeline across RSS, Bluesky, Mastodon, Tumblr, YouTube and more.', 'Control mechanism: mute/muffle rules + source choice', C.blue],
    ['REEDER', 'A unified inbox for reading, watching and listening; removes unread counts and syncs timeline position.', 'Control mechanism: chronology + filters + calm interface', C.teal],
    ['FEEEEED', '“A feed curated by you” spanning RSS, YouTube, Reddit, email, reminders and personal cards.', 'Control mechanism: user-built feed + private-by-design', C.orange]
  ];
  rows.forEach((r, i) => {
    pill(s, r[0], 0.72, ys[i], 1.35, r[3]);
    text(s, r[1], 2.35, ys[i] - 0.03, 6.4, 0.65, { fontFace: 'Georgia', fontSize: 14, color: C.ink });
    rect(s, 9.0, ys[i] - 0.08, 3.6, 0.86, i === 0 ? C.blue2 : i === 1 ? C.teal2 : C.orange2, 0.08);
    text(s, r[2], 9.18, ys[i] + 0.12, 3.24, 0.45, { fontSize: 8.6, bold: true, color: C.ink, align: 'center' });
    if (i < 2) line(s, 0.72, ys[i] + 1.2, 11.88, C.rule, 0.7);
  });
  rect(s, 0.72, 6.44, 11.88, 0.43, C.dark, 0.06);
  text(s, 'Opportunity: preserve user sovereignty, then replace “keep scrolling” with “today is complete.”', 0.95, 6.57, 11.4, 0.17, { fontSize: 10.2, bold: true, color: C.white, align: 'center' });
}

// 13 — AI news
{
  const s = addSlide('AI news products solve synthesis, not the user’s wider information diet.', 'Deep dive · news');
  card(s, 0.68, 1.48, 3.74, 4.85, 'Particle', 'Multi-source stories, opposite-side views, custom summary styles, questions, podcasts and daily digests. $15.3M raised; iOS + Android; 1.2K US App Store ratings at 4.8.\n\nStrategic read: best current AI-news execution — but the unit is a news story, not a life goal or attention budget.', C.orange);
  card(s, 4.79, 1.48, 3.74, 4.85, 'Ground News', 'Clusters reporting across 50,000+ outlets and exposes political bias, factuality, ownership and blindspots.\n\nStrategic read: users will pay for epistemic tools and source comparison; its differentiator is perspective, not finite curation.', C.blue);
  card(s, 8.90, 1.48, 3.74, 4.85, 'Apple News / Flipboard', 'Large-scale personalized aggregation, editorial packaging, publisher access and established distribution.\n\nStrategic read: never compete on generic “personalized news.” Win on user governance, cross-domain scope and an intentionally bounded object.', C.gold);
  source(s, 'Particle · Ground News · Apple News', 'https://particle.news/blog/particle-news-launches-android-app-bringing-fact-forward-personalized-news-to-more-users-worldwide', 0.74, 6.63, 5.9);
}

// 14 — AI assistants
{
  const s = addSlide('General AI assistants have crossed into the core job-to-be-done.', 'Category shift · proactive assistants');
  text(s, 'In 2026, daily briefing is becoming a platform primitive.', 0.68, 1.25, 7.7, 0.45, { fontFace: 'Georgia', fontSize: 18, color: C.ink });
  const items = [
    ['GEMINI', 'Daily Brief curates Gmail, Calendar and chat context every morning; adapts to feedback and suggests actions.', C.blue],
    ['CLAUDE', 'Scheduled tasks explicitly support daily briefings and recurring topic/competitor research across connected tools.', C.orange],
    ['CHATGPT', 'Official workflows support source-backed daily work briefs and recurring automation around user context.', C.teal],
    ['DIA', 'Morning Brief draws from calendar, email, Slack and tabs; it appears in the browser’s default surface.', C.gold]
  ];
  items.forEach((it, i) => {
    const y = 1.92 + i * 1.05;
    pill(s, it[0], 0.72, y, 1.25, it[2]);
    text(s, it[1], 2.22, y - 0.03, 6.55, 0.62, { fontSize: 11.2, color: C.ink });
    text(s, i === 0 ? 'VERY HIGH' : i === 1 ? 'HIGH' : i === 2 ? 'HIGH' : 'MED–HIGH', 9.15, y + 0.04, 1.05, 0.2, { fontSize: 7.5, bold: true, color: it[2], align: 'center' });
    for (let k = 0; k < 5; k++) dot(s, 10.38 + k * 0.26, y + 0.03, k < [5,4,4,3][i] ? it[2] : C.rule, 0.075);
  });
  rect(s, 0.7, 6.28, 11.92, 0.62, C.red2, 0.08);
  text(s, 'Survival rule: do what platform briefs structurally will not — let the user inspect and govern the editorial policy, cap the edition, preserve full-source reading, and route to e-ink/offline.', 0.95, 6.43, 11.45, 0.29, { fontSize: 9.7, bold: true, color: C.red, align: 'center' });
  note(s, ['https://gemini.google/overview/daily-brief/', 'https://support.claude.com/en/articles/13854387-schedule-recurring-tasks-in-claude-cowork', 'https://learn.chatgpt.com/use-cases', 'https://www.diabrowser.com/release-notes/1-19-0-tab-groups-and-proactive-suggestions']);
}

// 15 — Human discovery
{
  const s = addSlide('Human curation is not a side feature — it is the trust and serendipity layer.', 'Adjacent category · taste networks');
  const products = [
    ['ARE.NA', 'Member-supported knowledge network with no advertising. 20,516 paying members and $125K MRR.', 'Proof: aligned incentives can be the business model.', C.teal],
    ['SUBLIME', 'Human-curated ideas and related material; $75/year premium with Kindle, X, Instagram and Readwise integrations.', 'Proof: users pay for slower, idea-centric discovery.', C.orange],
    ['COSMOS', 'Visual inspiration network built around tastemakers, friends and collaborative collections; can hide AI content.', 'Proof: taste graphs can outperform topic graphs for discovery.', C.blue]
  ];
  products.forEach((p, i) => {
    const x = 0.7 + i * 4.1;
    rect(s, x, 1.55, 3.72, 4.38, C.white, 0.12, { color: C.rule, width: 0.8 });
    text(s, p[0], x + 0.25, 1.87, 3.22, 0.35, { fontFace: 'Georgia', fontSize: 18, color: p[3], align: 'center' });
    text(s, p[1], x + 0.28, 2.55, 3.16, 1.2, { fontSize: 10.2, color: C.ink, align: 'center' });
    line(s, x + 0.45, 4.07, 2.82, C.rule, 0.8);
    text(s, p[2], x + 0.28, 4.41, 3.16, 0.88, { fontFace: 'Georgia', fontSize: 12.5, color: C.muted, align: 'center' });
  });
  rect(s, 0.7, 6.17, 11.92, 0.66, C.green2, 0.08);
  text(s, 'Product mechanic to test: “send to Charl’s paper” adds a high-weight candidate — not a notification, public post, like count or obligation.', 0.96, 6.37, 11.4, 0.26, { fontSize: 10, bold: true, color: C.green, align: 'center' });
}

// 16 — Feature matrix
{
  const s = addSlide('No competitor currently combines all seven control primitives.', 'Capability matrix');
  const products = ['Mailbrew','NewsBlur','Inoreader','Readwise','Instapaper','Particle','Gemini','Proposed'];
  const feats = ['Own sources','Natural-language goals','Editorial constitution','Hard attention budget','Finite stop state','Full-source reading','Trusted friend signal'];
  const m = [
    [2,0,0,1,2,1,0], [2,0,1,0,1,2,1], [2,0,1,0,1,2,1], [2,1,0,0,0,2,0],
    [1,0,0,0,2,2,0], [1,1,0,0,1,1,1], [0,2,1,0,2,0,0], [2,2,2,2,2,2,2]
  ];
  const x0 = 0.7, y0 = 1.75, fw = 2.85, cw = 1.17, rh = 0.58;
  text(s, 'CONTROL PRIMITIVE', x0 + 0.08, 1.35, fw - 0.12, 0.2, { fontSize: 6.8, bold: true, color: C.orange, charSpacing: 0.8 });
  products.forEach((p, i) => text(s, p, x0 + fw + i*cw, 1.25, cw, 0.35, { fontSize: 7.2, bold: p === 'Proposed', color: p === 'Proposed' ? C.orange : C.muted, align: 'center' }));
  feats.forEach((f, ri) => {
    const y = y0 + ri*rh;
    rect(s, x0, y, fw + products.length*cw, rh - 0.04, ri % 2 ? 'EEEAE1' : C.white, 0.02);
    text(s, f, x0 + 0.12, y + 0.16, fw - 0.18, 0.24, { fontSize: 9.3, bold: true, color: C.ink });
    products.forEach((p, ci) => {
      const v = m[ci][ri];
      const col = p === 'Proposed' ? C.orange : v === 2 ? C.teal : v === 1 ? C.gold : C.rule;
      if (v === 2) dot(s, x0 + fw + ci*cw + 0.51, y + 0.18, col, 0.085);
      else if (v === 1) {
        s.addShape(pptx.ShapeType.ellipse, { x: x0 + fw + ci*cw + 0.43, y: y + 0.10, w: 0.17, h: 0.17, fill: { color: C.paper }, line: { color: col, width: 1.5 } });
      } else text(s, '—', x0 + fw + ci*cw + 0.34, y + 0.12, 0.35, 0.18, { fontSize: 10, color: C.rule, align: 'center' });
    });
  });
  dot(s, 0.82, 6.16, C.teal, 0.07); text(s, 'Strong/native', 1.05, 6.12, 1.25, 0.22, { fontSize: 8.5, color: C.muted });
  s.addShape(pptx.ShapeType.ellipse, { x: 2.45, y: 6.16, w: 0.14, h: 0.14, fill: { color: C.paper }, line: { color: C.gold, width: 1.3 } }); text(s, 'Partial/adjacent', 2.72, 6.12, 1.55, 0.22, { fontSize: 8.5, color: C.muted });
  rect(s, 8.62, 6.05, 3.65, 0.48, C.dark, 0.06); text(s, 'Whitespace = policy + budget + stop state', 8.78, 6.20, 3.33, 0.18, { fontSize: 8.4, bold: true, color: C.white, align: 'center' });
}

// 17 — 2x2 whitespace map
{
  const s = addSlide('The whitespace is “governed + finite,” not merely “personalized.”', 'Positioning map');
  const x = 1.25, y = 1.48, w = 10.55, h = 4.72;
  rect(s, x, y, w/2, h/2, 'E7EDF2');
  rect(s, x+w/2, y, w/2, h/2, 'D6E7E3');
  rect(s, x, y+h/2, w/2, h/2, 'EEE7D7');
  rect(s, x+w/2, y+h/2, w/2, h/2, 'F3DDD6');
  line(s, x+w/2, y, 0, C.ink, 1.2); s.addShape(pptx.ShapeType.line,{x:x+w/2,y,w:0,h,line:{color:C.ink,width:1.2}});
  line(s, x, y+h/2, w, C.ink, 1.2);
  text(s, 'FINITE /\nBOUNDED', 0.18, 1.76, 0.92, 0.55, { fontSize: 7.2, bold: true, color: C.muted, charSpacing: 1.1, align: 'center', valign: 'mid' });
  text(s, 'CONTINUOUS /\nOPEN-ENDED', 0.14, 5.2, 0.98, 0.62, { fontSize: 6.8, bold: true, color: C.muted, charSpacing: 0.8, align: 'center', valign: 'mid' });
  text(s, 'PLATFORM / OPAQUE PERSONALIZATION', 1.34, 6.4, 4.85, 0.25, { fontSize: 7.3, bold: true, color: C.muted, charSpacing: 0.8, align: 'center' });
  text(s, 'USER-GOVERNED EDITORIAL POLICY', 7.05, 6.4, 4.55, 0.25, { fontSize: 7.3, bold: true, color: C.muted, charSpacing: 0.8, align: 'center' });
  const pts = [
    ['Gemini / Claude briefs', 2.1, 2.15, C.red], ['Particle', 4.15, 3.0, C.orange], ['Mailbrew', 7.55, 2.9, C.blue],
    ['Instapaper digest', 9.0, 2.25, C.teal], ['Apple News', 2.15, 5.1, C.gold], ['Folo', 4.35, 5.2, C.teal],
    ['Tapestry / Reeder', 7.55, 5.0, C.blue], ['Are.na / Sublime', 9.4, 4.55, C.green]
  ];
  pts.forEach(p => { dot(s, p[1], p[2], p[3], 0.09); text(s, p[0], p[1]+0.22, p[2]-0.07, 1.6, 0.22, { fontSize: 7.7, bold: true, color: C.ink }); });
  rect(s, 9.05, 1.66, 2.2, 0.72, C.orange, 0.11);
  text(s, 'TARGET\nPOSITION', 9.23, 1.82, 1.84, 0.38, { fontSize: 10, bold: true, color: C.white, align: 'center' });
}

// 18 — Pricing
{
  const s = addSlide('Consumer willingness to pay clusters around $40–120/year.', 'Pricing landscape');
  const prices = [
    ['Reeder',10,C.blue],['Tapestry',20,C.blue],['Particle',30,C.orange],['NewsBlur',36,C.teal],['Meco',40,C.teal],['KTool',48,C.gold],['Mailbrew',59,C.orange],['Matter',60,C.blue],['Instapaper',60,C.gold],['Are.na',70,C.green],['Sublime',75,C.green],['Inoreader',90,C.teal],['NewsBlur Archive',99,C.teal],['Readwise',120,C.blue]
  ];
  const bx = 3.05, by = 1.55, bw = 8.55, rowH = 0.34;
  const p40 = bx + (40/120)*bw, p80 = bx + (80/120)*bw;
  s.addShape(pptx.ShapeType.line,{x:p40,y:by-0.13,w:0,h:4.88,line:{color:C.orange,width:1,dash:'dash'}});
  s.addShape(pptx.ShapeType.line,{x:p80,y:by-0.13,w:0,h:4.88,line:{color:C.orange,width:1,dash:'dash'}});
  pill(s, 'Likely launch band · $40–80/yr', 5.04, 1.16, 2.62, C.orange);
  prices.forEach((p,i)=>{
    const yy = by + i*rowH;
    const xx = bx + (p[1]/120)*bw;
    text(s,p[0],0.8,yy-0.01,1.82,0.2,{fontSize:8.1,color:C.ink,bold:p[0]==='Mailbrew'||p[0]==='Instapaper'});
    line(s,bx,yy+0.085,bw,C.rule,0.55);
    dot(s,xx-0.065,yy+0.02,p[2],0.065);
    text(s,'$'+p[1],11.76,yy-0.01,0.65,0.2,{fontSize:7.8,color:p[2],bold:true,align:'right'});
  });
  for (let v=0; v<=120; v+=20) {
    const px = bx + (v/120)*bw;
    text(s, '$'+v, px-0.25, 6.37, 0.5, 0.2, { fontSize: 7.2, color: v===60?C.orange:C.muted, align:'center', bold:v===60 });
  }
  rect(s, 0.78, 6.62, 11.62, 0.28, C.dark, 0.05);
  text(s, 'Price hypothesis  →  $6–10/month, annual-first; charge for editorial value and calm, not connector count.', 1.0, 6.69, 11.18, 0.14, { fontSize: 8.2, bold: true, color: C.white, align:'center' });
  text(s, 'USD annualized; representative public prices, Aug 2026. App-store/local pricing varies.', 0.82, 6.94, 7.5, 0.11, {fontSize:5.8,color:C.muted});
}

// 19 — Traction
{
  const s = addSlide('Small cohorts can support meaningful businesses — but love is not mass-market proof.', 'Traction signals');
  const sigs = [
    ['Mailbrew', '60K+ users', 'Behavior validated', C.orange],
    ['Are.na', '20.5K payers', '$125K MRR', C.teal],
    ['Tapestry', '3,369 backers', '$177.8K crowdfund', C.blue],
    ['Particle', '$15.3M raised', '1.2K ratings · 4.8', C.gold],
    ['Omnivore', '500K users', 'Acquired; standalone ended', C.red],
    ['Artifact', 'strong launch buzz', 'Standalone product ended', C.red]
  ];
  sigs.forEach((d,i)=>{
    const col=i%3,row=Math.floor(i/3),x=0.7+col*4.12,y=1.55+row*2.38;
    rect(s,x,y,3.76,2.05,C.white,0.11,{color:C.rule,width:0.8});
    text(s,d[0],x+0.22,y+0.22,3.3,0.32,{fontFace:'Georgia',fontSize:17,color:d[3]});
    text(s,d[1],x+0.22,y+0.85,3.3,0.33,{fontSize:14,bold:true,color:C.ink});
    text(s,d[2],x+0.22,y+1.43,3.3,0.25,{fontSize:9,color:C.muted});
  });
  rect(s,0.7,6.38,11.95,0.45,C.dark,0.06);
  text(s,'Base case: a durable, high-retention niche. Upside case requires proving behavior substitution — users actually stop opening feeds.',0.92,6.51,11.5,0.18,{fontSize:9.4,bold:true,color:C.white,align:'center'});
}

// 20 — Graveyard
{
  const s = addSlide('The graveyard is a strategic asset: three failure modes to avoid.', 'Negative evidence');
  const dead = [
    ['ARTIFACT', 'Excellent AI-personalized news was not enough.', 'The founders said the opportunity was not large enough for continued investment; Yahoo acquired the technology, not the standalone app.', 'Do not pitch “better AI news.”', C.red],
    ['POCKET', 'Scale and brand did not guarantee permanence.', 'Mozilla shut Pocket in July 2025 to focus elsewhere, despite its iconic read-later position.', 'Make data portability and direct revenue foundational.', C.gold],
    ['OMNIVORE', 'A beloved free reader can become acquisition fuel.', 'The team joined ElevenLabs after reaching a reported 500K global users; the open-source code survived, the standalone service did not.', 'Free utility alone is not a business model.', C.blue]
  ];
  dead.forEach((d,i)=>{
    const x=0.7+i*4.11;
    rect(s,x,1.52,3.74,4.9,'EAE7DF',0.12,{color:C.rule,width:0.8});
    text(s,'✕',x+0.2,1.76,0.45,0.45,{fontSize:25,bold:true,color:d[4],align:'center'});
    text(s,d[0],x+0.78,1.86,2.7,0.24,{fontSize:8,bold:true,color:d[4],charSpacing:1.2});
    text(s,d[1],x+0.24,2.56,3.24,0.9,{fontFace:'Georgia',fontSize:17,color:C.ink,align:'center'});
    text(s,d[2],x+0.3,3.82,3.12,1.1,{fontSize:9.2,color:C.muted,align:'center'});
    rect(s,x+0.28,5.36,3.18,0.68,d[4],0.08);
    text(s,d[3],x+0.48,5.55,2.78,0.28,{fontSize:8.8,bold:true,color:C.white,align:'center'});
  });
  source(s,'Yahoo Artifact acquisition · Mozilla Pocket closure · ElevenLabs/Omnivore','https://www.yahooinc.com/press/yahoo-announces-the-acquisition-of-artifact-the-news-discovery-platform-created-by-instagram-cofounders-kevin-systrom-and-mike-krieger',0.74,6.67,8.1);
}

// 21 — Ingestion constraints
{
  const s = addSlide('Universal ingestion is the moat trap.', 'Data access and economics');
  const rows = [
    ['RSS / Substack', 'Open / low friction', 'Best MVP substrate; Substack exposes /feed.', C.green],
    ['YouTube', 'Quota-managed', 'Useful metadata access; transcripts/content add complexity.', C.gold],
    ['X', '$0.005 per post read', '10,000 new posts = $50 before AI processing.', C.red],
    ['Reddit', 'Approval + contract risk', 'Commercial use requires explicit written approval.', C.red],
    ['LinkedIn', 'Restricted permission', 'Member social reads available only to approved users.', C.red],
    ['Email newsletters', 'Permissioned but messy', 'High-value content; parsing and account trust matter.', C.gold]
  ];
  rows.forEach((r,i)=>{
    const y=1.48+i*0.78;
    rect(s,0.7,y,11.93,0.66,i%2?'EEEAE1':C.white,0.04);
    pill(s,r[0],0.86,y+0.17,1.55,r[3]);
    text(s,r[1],2.75,y+0.18,2.3,0.22,{fontSize:10,bold:true,color:r[3]});
    text(s,r[2],5.18,y+0.15,6.98,0.3,{fontSize:9.5,color:C.ink});
  });
  rect(s,0.7,6.32,11.93,0.54,C.dark,0.07);
  text(s,'Recommended boundary  →  Start with RSS, newsletters, YouTube metadata and saved URLs. Add social sources only after the core selection behavior is proven.',0.94,6.48,11.44,0.23,{fontSize:9.5,bold:true,color:C.white,align:'center'});
  note(s,['https://docs.x.com/x-api/getting-started/pricing','https://support.reddithelp.com/hc/en-us/articles/42728983564564-Responsible-Builder-Policy','https://learn.microsoft.com/en-us/linkedin/marketing/community-management/shares/posts-api','https://developers.google.com/youtube/v3/getting-started','https://support.substack.com/hc/en-us/articles/360038239391-Is-there-an-RSS-feed-for-my-publication']);
}

// 22 — Strategic wedge
{
  const s = addSlide('A defensible wedge has five non-negotiables.', 'Strategic synthesis');
  const wedges = [
    ['01','A constitution, not interests','Natural-language goals, values, quality preferences, exclusions and diversity requirements.'],
    ['02','A hard attention budget','Minutes, item count, topic mix and novelty constraints determine the edition’s size.'],
    ['03','An explainable editorial ledger','Every selection states why it won, what it displaced and how it satisfies the policy.'],
    ['04','A finite reading object','One daily edition that ends — ideally email + web + EPUB/Kindle from the start.'],
    ['05','Trusted-human injection','Friends add weighted candidates without importing social graphs, virality or obligation.']
  ];
  wedges.forEach((w,i)=>{
    const y=1.4+i*1.03;
    text(s,w[0],0.72,y,0.55,0.35,{fontFace:'Georgia',fontSize:19,color:C.orange});
    text(s,w[1],1.48,y+0.02,3.5,0.3,{fontFace:'Georgia',fontSize:15,color:C.ink});
    text(s,w[2],5.2,y,7.03,0.48,{fontSize:10,color:C.muted});
    if(i<4) line(s,1.45,y+0.76,10.78,C.rule,0.7);
  });
  rect(s,0.72,6.55,11.82,0.32,C.orange,0.05);
  text(s,'Positioning sentence: “Your values decide what earns a place in today’s finite edition.”',0.92,6.64,11.42,0.14,{fontSize:8.7,bold:true,color:C.white,align:'center'});
}

// 23 — MVP
{
  const s = addSlide('The MVP should test editorial delegation, not aggregation breadth.', 'Recommended market entry');
  const phases = [
    ['1','10 users · 14 days','Manual onboarding interview + constitution; RSS/newsletters/saved URLs; 8–15-item daily web/email edition.','Prove replacement behavior.',C.orange],
    ['2','30–50 paying users','Add EPUB/Kindle delivery, explanations, mix controls, “more/less like this” and one friend-send path.','Prove willingness to pay + retention.',C.teal],
    ['3','Cohort expansion','Add YouTube, source-health diagnostics, edition analytics and referrals. Delay restricted social APIs.','Prove scalable acquisition.',C.blue]
  ];
  phases.forEach((p,i)=>{
    const x=0.7+i*4.12;
    rect(s,x,1.5,3.75,4.65,C.white,0.12,{color:C.rule,width:0.8});
    text(s,p[0],x+0.22,1.76,0.48,0.48,{fontFace:'Georgia',fontSize:28,color:p[4]});
    text(s,p[1],x+0.78,1.87,2.72,0.25,{fontSize:10,bold:true,color:p[4]});
    text(s,p[2],x+0.3,2.68,3.15,1.6,{fontFace:'Georgia',fontSize:13.5,color:C.ink,align:'center'});
    rect(s,x+0.3,4.85,3.15,0.86,p[4],0.08);
    text(s,p[3],x+0.48,5.13,2.8,0.25,{fontSize:9.3,bold:true,color:C.white,align:'center'});
  });
  text(s,'Primary metric',0.78,6.42,1.22,0.2,{fontSize:7,bold:true,color:C.orange,charSpacing:0.8});
  text(s,'Reduction in visits to the feeds the edition was intended to replace — not “articles opened.”',2.12,6.36,9.85,0.3,{fontFace:'Georgia',fontSize:13,color:C.ink});
}

// 24 — Experiments
{
  const s = addSlide('Four experiments can falsify the thesis quickly.', 'Diligence plan');
  const ex = [
    ['REPLACEMENT', 'Does the edition reduce feed visits?', 'Baseline device/self-report → 2-week delta', '≥25% reduction among retained users'],
    ['POLICY VALUE', 'Does a constitution beat source/topic setup?', 'Randomize onboarding: topics vs constitution', 'Higher day-14 use + fewer manual edits'],
    ['FINITE VALUE', 'Does ending improve satisfaction?', 'Finite 10-item edition vs ranked endless list', 'Lower time, equal/higher “felt informed”'],
    ['HUMAN SIGNAL', 'Do friend-sent candidates increase delight?', 'One trusted sender per user', 'Higher save/read rate without notification burden']
  ];
  const heads=['HYPOTHESIS','TEST','DESIGN','PASS SIGNAL'];
  const xs=[0.7,2.25,5.45,8.85], ws=[1.35,3.0,3.15,3.8];
  heads.forEach((h,i)=>text(s,h,xs[i],1.33,ws[i],0.18,{fontSize:6.8,bold:true,color:C.orange,charSpacing:0.9}));
  ex.forEach((r,ri)=>{
    const y=1.68+ri*1.18;
    rect(s,0.7,y,11.95,1.0,ri%2?'EEEAE1':C.white,0.05);
    r.forEach((v,ci)=>text(s,v,xs[ci]+0.08,y+0.18,ws[ci]-0.16,0.55,{fontSize:ci===0?8.3:9.1,bold:ci===0||ci===3,color:ci===0?C.teal:ci===3?C.green:C.ink}));
  });
  rect(s,0.7,6.54,11.95,0.3,C.dark,0.05);
  text(s,'Kill criterion: users like the output but do not change any underlying consumption habit.',0.95,6.62,11.45,0.14,{fontSize:8.6,bold:true,color:C.white,align:'center'});
}

// 25 — Watchlist
{
  const s = addSlide('The broader watchlist: 28 products and product families.', 'Market monitoring');
  const cols = [
    ['DIRECT / DIGEST', ['Mailbrew','NewsBlur','Meco','Instapaper','KTool','Particle']],
    ['FEEDS / READERS', ['Inoreader','Feedly','Folo','Tapestry','Reeder','Feeeed']],
    ['READING / PKM', ['Readwise Reader','Matter','Sublime','Are.na','Cosmos','Raindrop.io']],
    ['AI / DISTRIBUTION', ['Gemini Daily Brief','Claude scheduled tasks','ChatGPT daily briefs','Dia Morning Brief','Perplexity Discover','Apple News']],
    ['WELLBEING / SUBSTITUTES', ['one sec','Opal','Freedom','ScreenZen','Unpluq','Minimalist Phone']]
  ];
  cols.forEach((c,i)=>{
    const x=0.65+i*2.48;
    rect(s,x,1.55,2.25,4.85,i===3?C.dark:C.white,0.11,{color:i===3?C.dark:C.rule,width:0.8});
    text(s,c[0],x+0.18,1.83,1.9,0.48,{fontSize:7.2,bold:true,color:i===3?C.orange2:C.orange,charSpacing:0.8,align:'center'});
    c[1].forEach((v,j)=>{
      line(s,x+0.25,2.65+j*0.54,1.75,i===3?'4A4D4B':C.rule,0.6);
      text(s,v,x+0.18,2.35+j*0.54,1.9,0.22,{fontSize:8.6,bold:j===0,color:i===3?C.white:C.ink,align:'center'});
    });
  });
  text(s,'Monitor monthly for: launches · pricing · platform connectors · shutdowns/acquisitions · traction disclosures · daily-brief behavior · publisher deals',0.72,6.67,11.85,0.23,{fontSize:8.9,bold:true,color:C.muted,align:'center'});
}

// 26 — Sources 1
{
  const s = addSlide('Selected sources: competitors and pricing.', 'Research sources · 1 of 2');
  const srcs = [
    ['Mailbrew — product, traction, pricing','https://mailbrew.com/'],
    ['Tapestry — product','https://usetapestry.com/'],
    ['Tapestry — Kickstarter results','https://www.kickstarter.com/projects/iconfactory/project-tapestry'],
    ['Reeder — App Store listing / price','https://apps.apple.com/us/app/reeder/id6475002485'],
    ['Feeeed — product','https://feeeed.nateparrott.com/'],
    ['Inoreader — features and pricing','https://www.inoreader.com/pricing'],
    ['Feedly Market Intelligence — pricing','https://feedly.com/market-intelligence/pricing'],
    ['NewsBlur — features and pricing','https://newsblur.com/faq'],
    ['Readwise Reader — product and pricing','https://readwise.io/read'],
    ['Matter — business model / pricing','https://www.getmatter.com/patron'],
    ['Instapaper — Premium and Kindle digests','https://www.instapaper.com/docs/premium/overview'],
    ['KTool — pricing and digest features','https://ktool.io/pricing'],
    ['Meco — product','https://meco.app/'],
    ['Meco PRO — pricing','https://docs.meco.app/docs/meco-pro/overview'],
    ['Particle — product, funding and Android launch','https://particle.news/blog/particle-news-launches-android-app-bringing-fact-forward-personalized-news-to-more-users-worldwide'],
    ['Particle — App Store pricing and ratings','https://apps.apple.com/us/app/particle-personalized-news/id6683283775'],
    ['Ground News — methodology','https://ground.news/rating-system'],
    ['Are.na — live member and revenue metrics','https://www.are.na/about'],
    ['Sublime — pricing','https://sublime.app/pricing'],
    ['Cosmos — product / pricing','https://apps.apple.com/us/app/cosmos-search-discover/id1577975475']
  ];
  srcs.forEach((a,i)=>{
    const col=i<10?0:1, row=i%10, x=0.75+col*6.15, y=1.45+row*0.51;
    dot(s,x,y+0.04,col?C.teal:C.orange,0.04);
    rich(s,[{text:a[0],options:{fontSize:8.7,color:C.ink,hyperlink:{url:a[1]}}}],x+0.18,y,5.65,0.28,{margin:0});
  });
  text(s,'Hyperlinks are clickable in PowerPoint. Prices are public US web/App Store prices observed 23 Aug 2026; taxes, location and platform may change them.',0.76,6.72,11.85,0.24,{fontSize:7.1,color:C.muted,italic:true});
}

// 27 — Sources 2
{
  const s = addSlide('Selected sources: market context, platforms and failure cases.', 'Research sources · 2 of 2');
  const srcs = [
    ['Reuters Institute Digital News Report 2026','https://reutersinstitute.politics.ox.ac.uk/digital-news-report/2026/dnr-executive-summary'],
    ['Gemini Daily Brief','https://gemini.google/overview/daily-brief/'],
    ['Gemini scheduled actions','https://support.google.com/gemini/answer/16316416'],
    ['Claude Cowork scheduled tasks','https://support.claude.com/en/articles/13854387-schedule-recurring-tasks-in-claude-cowork'],
    ['OpenAI Docs — ChatGPT/Codex use cases','https://learn.chatgpt.com/use-cases'],
    ['Dia Morning Brief release note','https://www.diabrowser.com/release-notes/1-19-0-tab-groups-and-proactive-suggestions'],
    ['Dia pricing','https://www.diabrowser.com/plans'],
    ['Yahoo — Artifact acquisition','https://www.yahooinc.com/press/yahoo-announces-the-acquisition-of-artifact-the-news-discovery-platform-created-by-instagram-cofounders-kevin-systrom-and-mike-krieger'],
    ['Mozilla — Pocket closure','https://blog.mozilla.org/en/mozilla/building-whats-next/'],
    ['ElevenLabs — Omnivore acquisition','https://elevenlabs.io/blog/omnivore-joins-elevenlabs'],
    ['X API pricing','https://docs.x.com/x-api/getting-started/pricing'],
    ['Reddit Responsible Builder Policy','https://support.reddithelp.com/hc/en-us/articles/42728983564564-Responsible-Builder-Policy'],
    ['LinkedIn Posts API permissions','https://learn.microsoft.com/en-us/linkedin/marketing/community-management/shares/posts-api'],
    ['YouTube Data API quota','https://developers.google.com/youtube/v3/getting-started'],
    ['Substack RSS documentation','https://support.substack.com/hc/en-us/articles/360038239391-Is-there-an-RSS-feed-for-my-publication'],
    ['Apple News App Store listing','https://apps.apple.com/us/app/apple-news/id1066498020']
  ];
  srcs.forEach((a,i)=>{
    const col=i<8?0:1,row=i%8,x=0.75+col*6.15,y=1.48+row*0.63;
    dot(s,x,y+0.04,col?C.blue:C.orange,0.04);
    rich(s,[{text:a[0],options:{fontSize:9.2,color:C.ink,hyperlink:{url:a[1]}}}],x+0.18,y,5.65,0.3,{margin:0});
  });
  rect(s,0.75,6.52,11.82,0.35,C.greybox,0.05);
  text(s,'Research emphasis: primary/official sources for features, prices, policies and company metrics; secondary reporting used sparingly for context.',0.95,6.62,11.42,0.15,{fontSize:7.8,bold:true,color:C.muted,align:'center'});
}

// 28 — Methodology
{
  const s = addSlide('How to read this deck.', 'Methodology and caveats');
  card(s,0.7,1.45,3.75,4.9,'Scope','Consumer and prosumer products that aggregate, filter, summarize, schedule, package or socially curate internet information; adjacent AI-assistant and wellbeing substitutes included where they compete for the same job.',C.orange,1);
  card(s,4.79,1.45,3.75,4.9,'Assessment','Features and public prices were checked against official sources where available. Threat, “ownership” and whitespace judgments are strategic inference — they are not claims made by the companies.',C.teal,2);
  card(s,8.88,1.45,3.75,4.9,'Limits','Private-company revenue, retention and user counts are usually undisclosed. “All competitors” therefore means a structured, decision-useful universe, not a claim of exhaustive global enumeration.',C.blue,3);
  text(s,'Recommended refresh cadence: quarterly for the specialist landscape; monthly for AI assistants and platform API access.',0.76,6.59,11.8,0.28,{fontFace:'Georgia',fontSize:12.5,color:C.ink,align:'center'});
}

pptx.writeFile({ fileName: 'deliverables/curation-station-competitive-landscape-2026.pptx' });
