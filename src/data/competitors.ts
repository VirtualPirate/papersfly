// src/data/competitors.ts
//
// Data behind the "papersfly vs X" comparison pages and the /alternatives hub.
// Content only — no design. Consumed by src/pages/vs/[competitor].astro and
// src/pages/alternatives.astro.
//
// FAIRNESS + ACCURACY (see seo-competitor-pages guidelines):
//   - Every claim here must be verifiable from a public source.
//   - Pricing is a moving target: keep `PRICING_AS_OF` current and cite sources.
//   - Acknowledge competitor strengths honestly; do not make false claims.
//   - Review quarterly or when a competitor ships a major change.

/** Human-readable date the pricing/feature facts were last verified. */
export const PRICING_AS_OF = "July 2026";

/** Outcome for one capability: ✓ (yes), ✗ (no), or – (partial/conditional). */
export type CapValue = "yes" | "no" | "partial";

/** A competitor's outcome on one capability row of the feature matrix. */
export interface Capability {
  v: CapValue;
  /** Optional ≤3-word note shown under the mark, e.g. "free = TXT", "1 doc". */
  note?: string;
}

export interface Competitor {
  /** URL slug: /vs/<slug>. */
  slug: string;
  /** Display name, exactly as the brand writes it. */
  name: string;
  /** Competitor's own site (for honest, followable citation). */
  url: string;
  /** One-line positioning used on the hub card. */
  tagline: string;
  /** 40-70 char meta-description-friendly summary of the difference. */
  cardBlurb: string;
  /** SEO title tag for the vs page. */
  title: string;
  /** Meta description for the vs page. */
  description: string;
  /** Lede paragraph (1-2 sentences) under the H1. */
  lede: string;
  /**
   * 2-4 short paragraphs of honest, sourced prose comparing the two. HTML is
   * NOT allowed; plain text only (rendered into <p> by the template).
   */
  body: string[];
  /** The bottom-line verdict shown in the callout. */
  verdict: string;
  /**
   * The competitor's outcomes on the shared `CAPABILITIES` rows — one entry per
   * capability, in the SAME ORDER as CAPABILITIES. papersfly's column is the
   * constant `us` value on each CAPABILITIES entry.
   */
  capabilities: Capability[];
  /**
   * The competitor's factual shortfalls — shown struck-through in the redline
   * block ("what you leave behind"). Must be verifiable negatives, never their
   * strengths (those live in `competitorStrengths`).
   */
  leaveBehind: string[];
  /** Where the competitor genuinely wins — kept honest. */
  competitorStrengths: string[];
  /** Where papersfly wins. */
  papersflyStrengths: string[];
  /** Page-specific FAQ (rendered visibly and emitted as FAQPage JSON-LD). */
  faq: { q: string; a: string }[];
  /** Public sources backing the pricing/feature claims. */
  sources: { label: string; url: string }[];
  /** Standardized cells for the /alternatives master table (short strings). */
  quick: {
    /** Cheapest realistic price to get a usable PDF, e.g. "Free" / "$2.95 trial → $24.95/mo". */
    price: string;
    /** Can you download a real PDF for free? */
    freeDownload: "Yes" | "No" | "Limited" | "Trial only" | "Watermarked";
    /** Usable with no account? */
    noSignup: "Yes" | "No";
    /** Does your data stay on your device (no server upload)? */
    onDevice: "Yes" | "No";
  };
}

// ---------------------------------------------------------------------------
// The seven capabilities compared on every /vs page, in display order. The
// competitor column varies per page (`Competitor.capabilities`); papersfly's
// column is the constant `us` value here. Keep this list and each competitor's
// `capabilities` array the same length and order.
// ---------------------------------------------------------------------------
export const CAPABILITIES: { label: string; us: CapValue }[] = [
  { label: "Free to use and download", us: "yes" },
  { label: "Real PDF, not just plain text", us: "yes" },
  { label: "No account or signup", us: "yes" },
  { label: "Data stays on your device", us: "yes" },
  { label: "Works offline", us: "yes" },
  { label: "True-vector, ATS-safe output", us: "yes" },
  { label: "AI writing help", us: "no" },
];

/**
 * papersfly's wins are the same on every comparison page, so the redline "what
 * you get" column is shared. Kept in sync with the US constant above.
 */
export const PAPERSFLY_GAINS = [
  "A true-vector PDF with selectable, embedded text",
  "Unlimited downloads, watermark-free, at no cost",
  "No account and no trial — nothing to cancel",
  "Nothing uploaded — it all stays in your browser",
  "Works offline after the first load",
];

export const competitors: Competitor[] = [
  {
    slug: "zety",
    name: "Zety",
    url: "https://zety.com/",
    tagline: "The pay-to-download builder",
    leaveBehind: [
      "A free tier that only exports plain text",
      "The formatted PDF, locked behind a paid plan",
      "A trial that auto-renews at ~$25.95 / 4 weeks",
      "Your resume stored on Zety's servers",
    ],
    cardBlurb:
      "Zety's free plan only exports plain text — the PDF is paywalled. papersfly's PDF is free and unlimited.",
    title: "papersfly vs Zety: free PDF vs pay-to-download (2026)",
    description:
      "Zety lets you build a resume free but only exports TXT — the PDF is paywalled behind a paid subscription. Compare with papersfly, which exports a free, unlimited, watermark-free vector PDF with no signup.",
    lede:
      "Zety is a polished, content-rich resume builder — but its free plan only downloads plain text, and the formatted PDF sits behind a paid trial that auto-renews. papersfly gives you the real PDF for free.",
    body: [
      "Zety's biggest strength is its writing help: pre-written bullet points, phrasing suggestions, and ATS-oriented templates make it fast to draft strong content. If you want a builder to coach you through what to say, Zety does that well.",
      "The catch is the download. On the free plan you can build and preview your resume, but exporting it produces a plain-text (TXT) file — the formatted PDF and Word downloads require a paid plan. That plan typically starts with a low-cost trial (around $1.95) that rolls into roughly $25.95 every four weeks unless you cancel, which is the source of most complaints about the service.",
      "papersfly takes the opposite approach: there is no paid tier and no trial. You build in the browser and download a true-vector PDF — selectable text, embedded fonts — for free, as many times as you like, with no watermark. Nothing is uploaded and no account is created.",
    ],
    verdict:
      "If you want AI-assisted phrasing and don't mind a subscription, Zety is capable. If you just need a clean, ATS-safe PDF without a paywall, auto-renewing trial, or account, papersfly is the simpler, free choice.",
    capabilities: [
      { v: "no", note: "PDF is paid" }, // free to use & download
      { v: "no", note: "free = TXT" },  // real PDF, not just text
      { v: "no" },                      // no account
      { v: "no" },                      // data on device
      { v: "no" },                      // works offline
      { v: "yes" },                     // ATS-safe output
      { v: "yes" },                     // AI writing help
    ],
    competitorStrengths: [
      "You want pre-written bullet points and phrasing help while drafting.",
      "You value a large, tested template library with content guidance.",
      "A subscription is fine as long as the writing tools save you time.",
    ],
    papersflyStrengths: [
      "You don't want to pay — or hand over card details for a trial — just to download.",
      "You want the PDF unlimited and watermark-free.",
      "You'd rather no account exists and nothing is uploaded.",
      "You want to keep editing and exporting offline.",
    ],
    faq: [
      { q: "Is Zety actually free?", a: "You can build and preview a resume on Zety for free, but the free export is a plain-text file. To download a formatted PDF or Word document you need a paid plan, which usually begins with a small trial charge that renews at a higher monthly rate. papersfly's PDF download is free with no plan." },
      { q: "Does papersfly have AI writing help like Zety?", a: "No. papersfly focuses on rendering your content into a precise, ATS-safe vector PDF rather than writing it for you. If AI phrasing is your priority, Zety is stronger there; if a free, private PDF is the priority, papersfly is the better fit." },
      { q: "Do I have to cancel anything with papersfly?", a: "No. There is no trial, no subscription, and no account — so there is nothing to cancel and no auto-renewal to watch for." },
    ],
    sources: [
      { label: "zety.com/pricing", url: "https://zety.com/pricing" },
      { label: "Zety review (SoundCV)", url: "https://www.soundcv.com/blog/zety-review-2026" },
    ],
    quick: { price: "~$1.95 trial → ~$25.95/4wk", freeDownload: "No", noSignup: "No", onDevice: "No" },
  },
  {
    slug: "resume-io",
    name: "Resume.io",
    url: "https://resume.io/",
    tagline: "The category's biggest paywall",
    leaveBehind: [
      "A free tier limited to a plain-text download",
      "The formatted PDF, paywalled behind a plan",
      "A paid trial renewing at ~$29.95 / 4 weeks",
      "Your data uploaded to Resume.io's servers",
    ],
    cardBlurb:
      "Resume.io's free tier exports TXT only; the PDF is locked behind an auto-renewing trial. papersfly's is free.",
    title: "papersfly vs Resume.io: free vector PDF, no trial (2026)",
    description:
      "Resume.io is the most-used resume builder, but downloading the PDF requires a paid, auto-renewing plan. Compare with papersfly's free, unlimited, watermark-free vector PDF — no account, works offline.",
    lede:
      "Resume.io is the highest-traffic resume builder on the web, with smooth UX and strong default templates. But the formatted PDF is paywalled behind a trial that auto-renews — papersfly hands you the PDF for free.",
    body: [
      "Resume.io earned its ~6M monthly visits for good reason: the editor is polished, the templates look professional out of the box, and the flow from blank page to finished layout is quick and pleasant.",
      "As with its sibling product Zety, the free plan is limited to a plain-text download — the real PDF requires a paid subscription. That subscription commonly starts as a roughly $2.95 seven-day trial that converts to about $29.95 every four weeks, and the auto-renewal catches a lot of people out.",
      "papersfly has no trial and no subscription. You build in your browser and export a true-vector PDF — selectable text with embedded fonts, not a screenshot — for free and without limits. There's no account, and your resume is never uploaded anywhere.",
    ],
    verdict:
      "Resume.io is a strong, polished builder if you're willing to subscribe. If you want the same professional PDF without a paywall, a card-on-file trial, or an account, papersfly does the job for free.",
    capabilities: [
      { v: "no", note: "PDF is paid" }, // free to use & download
      { v: "no", note: "free = TXT" },  // real PDF, not just text
      { v: "no" },                      // no account
      { v: "no" },                      // data on device
      { v: "no" },                      // works offline
      { v: "yes" },                     // ATS-safe output
      { v: "yes" },                     // AI writing help
    ],
    competitorStrengths: [
      "You want the most polished, mainstream editing experience.",
      "You want a big library of professionally designed templates.",
      "A subscription is acceptable for the extra design options.",
    ],
    papersflyStrengths: [
      "You don't want to enter card details for a trial just to download.",
      "You want an unlimited, watermark-free PDF at no cost.",
      "You'd rather nothing be uploaded and no account exist.",
      "You want offline editing and export.",
    ],
    faq: [
      { q: "Can I download a PDF from Resume.io for free?", a: "The free plan exports plain text only. A formatted PDF requires a paid plan, which typically starts with a short paid trial that renews at a monthly rate. papersfly exports a formatted vector PDF for free." },
      { q: "Is papersfly as polished as Resume.io?", a: "Resume.io has a larger template library and a more feature-rich editor. papersfly deliberately keeps a focused set of clean, print-accurate templates and puts its effort into a precise, ATS-safe PDF and full privacy. Which matters more depends on your priorities." },
      { q: "Will papersfly charge me later?", a: "No. There is no paid tier, no trial, and no stored payment method. It's free client-side software." },
    ],
    sources: [
      { label: "resume.io/pricing", url: "https://resume.io/pricing" },
      { label: "Resume.io review (Enhancv)", url: "https://enhancv.com/blog/resume-io-review/" },
    ],
    quick: { price: "~$2.95 trial → ~$29.95/4wk", freeDownload: "No", noSignup: "No", onDevice: "No" },
  },
  {
    slug: "canva",
    name: "Canva",
    url: "https://www.canva.com/resumes/",
    tagline: "Beautiful, but often not ATS-safe",
    leaveBehind: [
      "Multi-column, graphic templates that often break ATS",
      "A design that can import into ATS as jumbled text",
      "A cloud-only workflow tied to an account",
      "No offline mode",
    ],
    cardBlurb:
      "Canva's resumes are free and gorgeous — but multi-column, graphic-heavy PDFs often confuse ATS. papersfly stays readable.",
    title: "papersfly vs Canva resumes: ATS-safe vector text (2026)",
    description:
      "Canva resumes are free to download but their multi-column, graphic-heavy layouts often fail applicant tracking systems. Compare with papersfly's true-vector, single-column, ATS-readable PDF that works offline.",
    lede:
      "Canva is genuinely free and its resume templates look stunning. The problem is downstream: many of those designs are hard for applicant tracking systems (ATS) to parse. papersfly trades some design flourish for text a recruiter's software can actually read.",
    body: [
      "Unlike most builders here, Canva doesn't paywall the download — you can build and export a resume PDF for free, and the design flexibility is unmatched. For a portfolio, a creative role, or a human-only review, a Canva resume can look fantastic.",
      "The risk is the applicant tracking system. Canva's most popular resume templates lean on multiple columns, icons, graphics, and text placed inside shapes — all of which ATS parsers routinely scramble or drop. A beautiful resume that imports as jumbled text can quietly sink an application before a person ever sees it.",
      "papersfly's templates are built as single-column, real-text layouts and export as true-vector PDFs with selectable text — the format ATS software reads cleanly. You give up some of Canva's visual freedom, but you gain confidence that the machine on the other side can parse your name, roles, and dates.",
    ],
    verdict:
      "For a design-led resume reviewed by a human, Canva is hard to beat and it's free. For an online application that will pass through ATS, papersfly's clean, real-text vector PDF is the safer bet — also free, with no account and full offline use.",
    capabilities: [
      { v: "yes" },                        // free to use & download
      { v: "yes" },                        // real PDF, not just text
      { v: "no" },                         // no account
      { v: "no" },                         // data on device
      { v: "no" },                         // works offline
      { v: "partial", note: "often not" }, // ATS-safe output
      { v: "yes" },                        // AI writing help
    ],
    competitorStrengths: [
      "Your resume will be reviewed by a human, not filtered by ATS first.",
      "You want maximum visual creativity and design control.",
      "You already use Canva and want everything in one place.",
    ],
    papersflyStrengths: [
      "You're applying online, where ATS parsing matters most.",
      "You want a clean, single-column layout with real, selectable text.",
      "You want the PDF without an account or upload, and offline.",
      "You want a print-accurate, true-vector file rather than a design export.",
    ],
    faq: [
      { q: "Are Canva resumes ATS-friendly?", a: "Some are, but many of Canva's most popular templates use multiple columns, icons, and text inside graphics, which applicant tracking systems often misread. If your resume will be screened by ATS, a single-column, real-text layout like papersfly's is safer." },
      { q: "Is Canva free like papersfly?", a: "Yes — Canva lets you download resume PDFs for free, which is one of the few builders that doesn't paywall the download. The difference is ATS-safety, privacy (Canva stores your file in your account), and offline use, not price." },
      { q: "Can papersfly match Canva's designs?", a: "Not for heavily illustrated layouts — papersfly focuses on clean, print-accurate, ATS-safe templates. If visual flair for a human reviewer is the goal, Canva wins; if machine-readability and privacy matter, papersfly does." },
    ],
    sources: [
      { label: "canva.com/resumes", url: "https://www.canva.com/resumes/" },
      { label: "Are Canva resumes ATS-friendly? (Rezi)", url: "https://www.rezi.ai/posts/canva-resume-templates" },
    ],
    quick: { price: "Free", freeDownload: "Yes", noSignup: "No", onDevice: "No" },
  },
  {
    slug: "flowcv",
    name: "FlowCV",
    url: "https://flowcv.com/",
    tagline: "\"Privacy-first\" vs actually private",
    leaveBehind: [
      "A required account and cloud storage",
      "A free tier capped at one resume / version",
      "AI and extra versions behind a paid plan",
      "No offline mode",
    ],
    cardBlurb:
      "FlowCV is genuinely free but requires an account and stores your resume on its servers. papersfly stores nothing.",
    title: "papersfly vs FlowCV: no account, nothing uploaded (2026)",
    description:
      "FlowCV offers an excellent free resume builder, but it requires an account and stores your data on its servers. Compare with papersfly, which needs no signup, uploads nothing, and works fully offline.",
    lede:
      "FlowCV is the closest thing to papersfly: genuinely free, watermark-free PDFs, ATS-friendly templates. The difference is what happens to your data — FlowCV requires an account and stores your resume on its servers; papersfly stores nothing, anywhere.",
    body: [
      "Credit where it's due: FlowCV has the best free tier of the mainstream builders. One resume forever, unlimited watermark-free PDF downloads, all templates included, and clean ATS-friendly output. It markets itself as privacy-first and GDPR-compliant, and for a cloud tool it's a strong offering.",
      "But \"privacy-first\" still means cloud-first. FlowCV requires you to create an account, and your resume is saved on their servers so you can return to it. The free tier also caps you at a single resume/version — multiple tailored versions and AI features move you to a paid plan (roughly $36–$60 per year, per third-party reviews).",
      "papersfly is private by architecture rather than by policy. There is no account to create and no server to upload to — your resume is built, rendered, and exported entirely in your browser, and it works offline after the first load. You can keep as many documents as you like locally, and none of them are ever transmitted.",
    ],
    verdict:
      "FlowCV is an excellent free, cloud-based builder and the right pick if you want your resume synced to an account. If \"nothing uploaded, no signup, works offline\" is the point, papersfly is the one builder that can actually claim it.",
    capabilities: [
      { v: "yes", note: "1 doc" },     // free to use & download
      { v: "yes" },                    // real PDF, not just text
      { v: "no" },                     // no account
      { v: "no" },                     // data on device
      { v: "no" },                     // works offline
      { v: "yes" },                    // ATS-safe output
      { v: "partial", note: "paid" },  // AI writing help
    ],
    competitorStrengths: [
      "You want your resume saved to an account and synced across devices.",
      "You want built-in import and AI features (on a paid plan).",
      "A best-in-class free cloud tier is exactly what you're after.",
    ],
    papersflyStrengths: [
      "You want zero account and zero upload — private by architecture.",
      "You want to keep multiple documents locally with no version cap.",
      "You need it to work fully offline.",
      "You prefer no data ever leaving your device over a privacy policy.",
    ],
    faq: [
      { q: "Is FlowCV private?", a: "FlowCV markets itself as privacy-first and GDPR-compliant, but it still requires an account and stores your resume on its servers. papersfly is private by architecture: there is no account and nothing is uploaded — everything happens in your browser." },
      { q: "Is FlowCV really free?", a: "Yes, its free tier is genuinely generous: one resume with unlimited watermark-free PDF downloads. papersfly is also free, with no cap on how many documents you keep locally and no account required." },
      { q: "Which is more ATS-friendly?", a: "Both produce clean, ATS-readable output. The deciding factors between them are signup, data storage, offline support, and document limits — where papersfly's client-side model differs." },
    ],
    sources: [
      { label: "flowcv.com", url: "https://flowcv.com/" },
      { label: "FlowCV review (ResuFit)", url: "https://resufit.com/blog/flowcv-review-free-resume-builder-worth-trying/" },
    ],
    quick: { price: "Free (1 doc); paid ~$36/yr", freeDownload: "Yes", noSignup: "No", onDevice: "No" },
  },
  {
    slug: "novoresume",
    name: "Novoresume",
    url: "https://novoresume.com/",
    tagline: "Free, but watermarked",
    leaveBehind: [
      "A watermark on every free download",
      "A one-page, single-resume free limit",
      "Word export and clean PDF behind Premium",
      "Your data stored on Novoresume's servers",
    ],
    cardBlurb:
      "Novoresume's free downloads carry a watermark and cap you at one page. papersfly exports clean, unlimited PDFs.",
    title: "papersfly vs Novoresume: no watermark, no page cap (2026)",
    description:
      "Novoresume's free tier limits you to one page and stamps a watermark on downloads. Compare with papersfly's free, unlimited, watermark-free vector PDF — no account, works offline.",
    lede:
      "Novoresume makes clean, modern one-page designs, but its free tier watermarks your download and caps you at a single page. papersfly exports a clean, unlimited PDF with no watermark and no page limit.",
    body: [
      "Novoresume is good at what it does: tidy, structured, one-page resume layouts that look modern and read well. The guidance and design system nudge you toward a focused, recruiter-friendly document.",
      "The free plan is where it pinches. Free downloads carry a Novoresume watermark, you're limited to one resume and effectively one page, and Word export and the nicer options require Premium (roughly $12–$24/month depending on term). A watermark is an instant tell that you used a free builder, which is exactly what you don't want on an application.",
      "papersfly has no watermark on anything, no page cap, and no premium tier to unlock. You export a true-vector PDF with selectable text for free, and because it all runs in your browser, nothing is uploaded and it works offline.",
    ],
    verdict:
      "Novoresume is a fine choice for a polished one-pager if you'll pay to remove the watermark. If you want a clean, unbranded PDF for free — with no page limit, account, or upload — papersfly is the more straightforward option.",
    capabilities: [
      { v: "partial", note: "watermark" }, // free to use & download
      { v: "yes" },                        // real PDF, not just text
      { v: "no" },                         // no account
      { v: "no" },                         // data on device
      { v: "no" },                         // works offline
      { v: "yes" },                        // ATS-safe output
      { v: "yes" },                        // AI writing help
    ],
    competitorStrengths: [
      "You want a guided, modern one-page design system.",
      "You're happy to pay Premium to remove the watermark.",
      "You value the structure and content prompts it provides.",
    ],
    papersflyStrengths: [
      "You want a clean PDF with no watermark, for free.",
      "You don't want a one-page or single-document cap.",
      "You'd rather no account exist and nothing be uploaded.",
      "You want offline editing and export.",
    ],
    faq: [
      { q: "Does Novoresume watermark free resumes?", a: "Yes — free downloads carry a Novoresume watermark, and removing it (plus Word export and extra options) requires the Premium plan. papersfly never adds a watermark." },
      { q: "Can I make a two-page resume free on Novoresume?", a: "The free tier is oriented around a single one-page resume. papersfly has no page or document limit." },
      { q: "Is my data uploaded with papersfly?", a: "No. Everything is built and rendered in your browser; nothing is sent to a server, unlike Novoresume's cloud model." },
    ],
    sources: [
      { label: "novoresume.com/page/pricing", url: "https://novoresume.com/page/pricing" },
      { label: "Novoresume review (SoundCV)", url: "https://www.soundcv.com/blog/novoresume-review-2026" },
    ],
    quick: { price: "~$12–24/mo for clean PDF", freeDownload: "Watermarked", noSignup: "No", onDevice: "No" },
  },
  {
    slug: "enhancv",
    name: "Enhancv",
    url: "https://enhancv.com/",
    tagline: "Great coaching, branded free export",
    leaveBehind: [
      "Enhancv branding on free downloads",
      "A 7-day trial before you can export cleanly",
      "Unbranded export locked behind Pro (~$19.99/mo)",
      "Your resume stored on Enhancv's servers",
    ],
    cardBlurb:
      "Enhancv's free downloads carry its branding; removing it needs Pro. papersfly's export is always unbranded.",
    title: "papersfly vs Enhancv: unbranded free PDF (2026)",
    description:
      "Enhancv offers strong content coaching, but free downloads carry Enhancv branding and clean export requires Pro. Compare with papersfly's free, unbranded, true-vector PDF — no account, works offline.",
    lede:
      "Enhancv is one of the best builders for content coaching and standout sections — but its free downloads carry Enhancv branding, and exporting a clean file requires the Pro plan. papersfly's export is unbranded, free, and unlimited.",
    body: [
      "Enhancv's strength is helping you say the right things: distinctive sections, recruiter-tested advice, and strong content prompts that push your resume beyond a bland list of duties. For candidates who struggle with wording, it's genuinely useful.",
      "The free experience is a 7-day trial and free downloads include Enhancv branding — to export a clean, unbranded resume you need Pro (around $19.99/month, less on longer terms). As with watermarks elsewhere, visible branding signals a free-tool resume, which undercuts the polish Enhancv otherwise gives you.",
      "papersfly doesn't brand your output and doesn't gate exports. You get an unbranded, true-vector PDF for free, built entirely in your browser with no account and full offline support. It won't coach your writing the way Enhancv does — that's the trade.",
    ],
    verdict:
      "Choose Enhancv if content coaching and standout formatting are worth a subscription. Choose papersfly if you want a clean, unbranded PDF for free, with no account, no upload, and offline use.",
    capabilities: [
      { v: "partial", note: "branding" }, // free to use & download
      { v: "yes" },                       // real PDF, not just text
      { v: "no" },                        // no account
      { v: "no" },                        // data on device
      { v: "no" },                        // works offline
      { v: "yes" },                       // ATS-safe output
      { v: "yes" },                       // AI writing help
    ],
    competitorStrengths: [
      "You want strong content coaching and distinctive section designs.",
      "You'll pay Pro to remove branding and unlock features.",
      "You value recruiter-tested advice baked into the editor.",
    ],
    papersflyStrengths: [
      "You want an unbranded PDF without paying.",
      "You'd rather not create an account or upload your resume.",
      "You want unlimited free exports.",
      "You want offline editing and export.",
    ],
    faq: [
      { q: "Does Enhancv put branding on free resumes?", a: "Yes — free/trial downloads include Enhancv branding, and a clean unbranded export requires the Pro plan. papersfly never brands your resume." },
      { q: "Does papersfly help write my resume like Enhancv?", a: "No. Enhancv is stronger for content coaching. papersfly focuses on turning your content into a precise, ATS-safe, unbranded vector PDF, privately and for free." },
      { q: "Is there a trial to worry about with papersfly?", a: "No. There's no trial and no subscription — it's free client-side software with nothing to cancel." },
    ],
    sources: [
      { label: "enhancv.com/pricing", url: "https://enhancv.com/pricing/" },
      { label: "What's in Enhancv's free version", url: "https://help.enhancv.com/en/articles/1208865-what-is-included-in-the-free-version" },
    ],
    quick: { price: "~$19.99/mo for clean PDF", freeDownload: "Watermarked", noSignup: "No", onDevice: "No" },
  },
  {
    slug: "rezi",
    name: "Rezi",
    url: "https://www.rezi.ai/",
    tagline: "ATS scoring, capped free downloads",
    leaveBehind: [
      "A free tier capped at ~3 PDF downloads",
      "Pro at $29/mo (or $149) for unlimited exports",
      "A required account with cloud storage",
      "No offline mode",
    ],
    cardBlurb:
      "Rezi's free tier allows only a few PDF downloads before you hit Pro. papersfly's downloads are unlimited.",
    title: "papersfly vs Rezi: unlimited free downloads (2026)",
    description:
      "Rezi's free plan caps you at a handful of PDF downloads and limited AI before Pro ($29/mo or $149 lifetime). Compare with papersfly's unlimited, free, private vector PDF that works offline.",
    lede:
      "Rezi is built around ATS scoring and keyword targeting, which is its real value. But the free tier caps you at just a few PDF downloads before pushing you to Pro. papersfly's exports are unlimited and free.",
    body: [
      "Rezi's differentiator is the Rezi Score — an ATS checker that grades your resume against ~23 criteria and helps you tailor keywords to a specific job description. If optimizing against ATS scoring is your main goal, that engine is genuinely helpful.",
      "The free plan, though, allows only a limited number of PDF downloads (commonly cited as three) and limited AI before you hit the Pro plan at about $29/month, or a $149 one-time lifetime license. For a longer job search with many tailored versions, those download caps add up.",
      "papersfly doesn't score your resume or generate content — but it does let you export a true-vector, ATS-readable PDF as many times as you want, for free, with no account and no upload. It complements a tool like Rezi rather than replacing its scoring features.",
    ],
    verdict:
      "If ATS scoring and AI keyword tailoring are what you're paying for, Rezi delivers that. If you just need to export clean, ATS-safe PDFs without a download cap, account, or upload, papersfly does that for free.",
    capabilities: [
      { v: "partial", note: "~3 free" }, // free to use & download
      { v: "yes" },                      // real PDF, not just text
      { v: "no" },                       // no account
      { v: "no" },                       // data on device
      { v: "no" },                       // works offline
      { v: "yes" },                      // ATS-safe output
      { v: "yes" },                      // AI writing help
    ],
    competitorStrengths: [
      "You want an ATS score and keyword targeting against job posts.",
      "You want AI help tailoring content to each application.",
      "A lifetime license or Pro plan fits your search.",
    ],
    papersflyStrengths: [
      "You want unlimited free PDF downloads, not a capped free tier.",
      "You don't need AI scoring and won't pay for it.",
      "You want no account and nothing uploaded.",
      "You want offline editing and export.",
    ],
    faq: [
      { q: "How many resumes can I download free on Rezi?", a: "Rezi's free tier is commonly limited to around three PDF downloads before requiring Pro. papersfly's downloads are unlimited and free." },
      { q: "Does papersfly have an ATS score like Rezi?", a: "No. Rezi's ATS scoring is its main feature. papersfly ensures the output itself is ATS-readable (real, selectable text, single column) but doesn't grade or rewrite your content." },
      { q: "Is Rezi's lifetime plan a good deal?", a: "If you value the ATS scoring long-term, a one-time license can beat a subscription. If you only need clean PDF exports, papersfly gives you those free without any purchase." },
    ],
    sources: [
      { label: "rezi.ai/pricing", url: "https://www.rezi.ai/pricing" },
    ],
    quick: { price: "$29/mo or $149 lifetime", freeDownload: "Limited", noSignup: "No", onDevice: "No" },
  },
  {
    slug: "kickresume",
    name: "Kickresume",
    url: "https://www.kickresume.com/",
    tagline: "Usable free tier, gated formatting",
    leaveBehind: [
      "The full template set behind premium",
      "AI writing and the ATS checker behind premium",
      "A required account with cloud storage",
      "No offline mode",
    ],
    cardBlurb:
      "Kickresume's free tier limits templates and gates AI/formatting behind premium. papersfly has no feature gates.",
    title: "papersfly vs Kickresume: no feature gates, private (2026)",
    description:
      "Kickresume's free tier limits templates and locks AI and full formatting behind premium. Compare with papersfly's free, private, true-vector PDF — no account, works offline, no gates.",
    lede:
      "Kickresume has a usable free tier and strong AI writing tools, but the best templates, the ATS checker, and full formatting are gated behind premium. papersfly gives you the whole thing free — minus the AI.",
    body: [
      "Kickresume is a capable, GPT-powered builder with 40+ HR-designed templates and an ATS checker. Its free tier is more usable than most — you get a handful of templates with unlimited downloads — which is a genuine plus.",
      "But the good stuff is gated: the full template set, AI writing, and the ATS checker require premium (roughly $4.50–$24/month depending on term). Everything is account-based and stored in Kickresume's cloud, and there's no offline mode.",
      "papersfly doesn't gate anything, because there's nothing to gate — every template and unlimited watermark-free vector PDF export is free. It has no AI writer or ATS checker, so if those are what you want, Kickresume is stronger; if you want a clean private PDF with no gates, papersfly wins.",
    ],
    verdict:
      "Kickresume is a solid pick if you want AI writing and an ATS checker and don't mind premium for the best templates. papersfly is better if you want every feature free, with no account, no upload, and offline support.",
    capabilities: [
      { v: "yes", note: "4 templates" }, // free to use & download
      { v: "yes" },                      // real PDF, not just text
      { v: "no" },                       // no account
      { v: "no" },                       // data on device
      { v: "no" },                       // works offline
      { v: "yes" },                      // ATS-safe output
      { v: "yes", note: "premium" },     // AI writing help
    ],
    competitorStrengths: [
      "You want AI-generated content and an ATS checker.",
      "You want 40+ HR-designed templates (premium unlocks all).",
      "A usable free tier plus optional premium suits you.",
    ],
    papersflyStrengths: [
      "You want every template and unlimited exports free, no gates.",
      "You don't need AI writing and won't pay for it.",
      "You want no account and nothing uploaded.",
      "You want offline editing and export.",
    ],
    faq: [
      { q: "Is Kickresume free?", a: "It has a usable free tier (a few templates, unlimited downloads), but AI writing, the ATS checker, and the full template set require premium. papersfly's features are all free." },
      { q: "Does papersfly have AI like Kickresume?", a: "No. Kickresume is stronger for AI content and ATS checking. papersfly focuses on a clean, private, ATS-safe vector PDF with no feature gating." },
      { q: "Is my resume stored online with papersfly?", a: "No — it stays in your browser. Kickresume stores your resume in its cloud account." },
    ],
    sources: [
      { label: "kickresume.com/pricing", url: "https://www.kickresume.com/en/pricing/sale/" },
    ],
    quick: { price: "~$4.50–24/mo for full", freeDownload: "Limited", noSignup: "No", onDevice: "No" },
  },
  {
    slug: "teal",
    name: "Teal",
    url: "https://www.tealhq.com/",
    tagline: "A job-search suite, not just a builder",
    leaveBehind: [
      "A subscription with no annual plan (~$29/mo)",
      "Full resume tailoring behind Teal+",
      "A required account with cloud storage",
      "A whole suite when you only wanted a PDF",
    ],
    cardBlurb:
      "Teal bundles a builder with job tracking at a premium subscription. papersfly is a focused, free, private PDF builder.",
    title: "papersfly vs Teal: focused free builder vs job suite (2026)",
    description:
      "Teal is a full job-search suite (builder + tracker + Chrome extension) on a premium subscription with no annual plan. Compare with papersfly's focused, free, private, offline resume PDF builder.",
    lede:
      "Teal is really a job-search platform — resume builder, job tracker, and a Chrome extension — with a genuinely useful free tier and a premium plan. papersfly does one thing: a free, private resume PDF, in your browser.",
    body: [
      "Teal's value is the whole workflow: track applications, save jobs from a browser extension, and tailor your resume to each one. The free tier is genuinely useful for tracking and building, which sets it apart from paywalled builders.",
      "Teal+ unlocks the heavier tailoring and analysis features, and pricing runs on the expensive side — reported around $9/week to $29/month with no annual plan, which adds up over a long search. Everything is account-based and cloud-stored.",
      "papersfly isn't trying to be a job-search suite. It's a focused, free tool for producing a clean, ATS-safe vector PDF entirely in your browser — no account, no upload, offline. If you want tracking and tailoring, Teal is the broader product; if you just want the document, papersfly is simpler and free.",
    ],
    verdict:
      "Teal is the better tool if you want an all-in-one job-search workflow and will pay for it. papersfly is the better tool if you just need a free, private, offline resume PDF without the suite or subscription.",
    capabilities: [
      { v: "yes" },                  // free to use & download
      { v: "yes" },                  // real PDF, not just text
      { v: "no" },                   // no account
      { v: "no" },                   // data on device
      { v: "no" },                   // works offline
      { v: "yes" },                  // ATS-safe output
      { v: "yes", note: "Teal+" },   // AI writing help
    ],
    competitorStrengths: [
      "You want application tracking and job saving in one place.",
      "You want per-job resume tailoring and analysis.",
      "A subscription for a full job-search suite is worth it to you.",
    ],
    papersflyStrengths: [
      "You just want a resume PDF, not a whole platform.",
      "You want it free with no subscription.",
      "You want no account and nothing uploaded.",
      "You want offline editing and export.",
    ],
    faq: [
      { q: "Is Teal a resume builder?", a: "It includes one, but Teal is really a job-search suite with tracking and a Chrome extension. papersfly is a focused resume PDF builder — narrower, but free and private." },
      { q: "Does Teal have an annual plan?", a: "Reports indicate Teal+ is billed weekly, monthly, or quarterly with no annual option, which can make long searches costly. papersfly has no subscription at all." },
      { q: "Can I use papersfly for job tracking?", a: "No — it only builds documents. If you need tracking and tailoring, Teal is the broader tool; for a private, free PDF, papersfly is the fit." },
    ],
    sources: [
      { label: "tealhq.com/pricing", url: "https://www.tealhq.com/pricing" },
    ],
    quick: { price: "Teal+ ~$29/mo (no annual)", freeDownload: "Yes", noSignup: "No", onDevice: "No" },
  },
  {
    slug: "visualcv",
    name: "VisualCV",
    url: "https://www.visualcv.com/",
    tagline: "Watermarked free downloads",
    leaveBehind: [
      "A VisualCV watermark on the free PDF",
      "Analytics and clean export behind Pro",
      "A required account with cloud storage",
      "No offline mode",
    ],
    cardBlurb:
      "VisualCV's free PDF carries a watermark; a clean file needs Pro. papersfly's export is always unbranded and free.",
    title: "papersfly vs VisualCV: unbranded free PDF (2026)",
    description:
      "VisualCV's free tier watermarks your PDF and unlocks clean export, analytics and portfolios only on Pro. Compare with papersfly's free, unbranded, private, offline vector PDF.",
    lede:
      "VisualCV pairs a resume builder with analytics and web-resume features, but its free download carries a VisualCV watermark, and a clean file requires Pro. papersfly's export is unbranded, free, and unlimited.",
    body: [
      "VisualCV's angle is the extras: a hosted web resume, view analytics, version control, and a portfolio. For people who share a resume link and want to see engagement, that's a real feature set.",
      "On the free tier, the downloaded PDF includes a VisualCV watermark, and removing it — plus the analytics and portfolio features — requires Pro (roughly $9–$24/month depending on term). Everything is account-based and stored in VisualCV's cloud.",
      "papersfly doesn't offer analytics or a hosted web resume — it produces one thing, a clean unbranded true-vector PDF, for free and privately in your browser, with offline support. If you want the sharing and analytics layer, VisualCV has it; if you want a clean free PDF, papersfly is simpler.",
    ],
    verdict:
      "VisualCV suits people who want a shareable web resume with analytics and will pay Pro. papersfly suits people who want a clean, unbranded PDF for free, with no account, no upload, and offline use.",
    capabilities: [
      { v: "partial", note: "watermark" }, // free to use & download
      { v: "yes" },                        // real PDF, not just text
      { v: "no" },                         // no account
      { v: "no" },                         // data on device
      { v: "no" },                         // works offline
      { v: "yes" },                        // ATS-safe output
      { v: "yes", note: "Pro" },           // AI writing help
    ],
    competitorStrengths: [
      "You want a hosted web resume with view analytics.",
      "You want version control and a portfolio in one place.",
      "You'll pay Pro to remove the watermark and unlock features.",
    ],
    papersflyStrengths: [
      "You want a clean, unbranded PDF for free.",
      "You don't need analytics or a hosted resume.",
      "You want no account and nothing uploaded.",
      "You want offline editing and export.",
    ],
    faq: [
      { q: "Does VisualCV watermark free resumes?", a: "Yes — the free tier adds a VisualCV watermark to your PDF, and a clean export requires Pro. papersfly never watermarks your resume." },
      { q: "Does papersfly offer a web resume or analytics?", a: "No. Those are VisualCV features. papersfly focuses on a clean, private, unbranded vector PDF." },
      { q: "Is my data private with papersfly?", a: "Yes — nothing is uploaded; it all stays in your browser. VisualCV stores your resume in its cloud account." },
    ],
    sources: [
      { label: "visualcv.com/pricing", url: "https://www.visualcv.com/pricing/" },
    ],
    quick: { price: "~$9–24/mo for clean PDF", freeDownload: "Watermarked", noSignup: "No", onDevice: "No" },
  },
  {
    slug: "standard-resume",
    name: "Standard Resume",
    url: "https://standardresume.co/",
    tagline: "Free PDF, but still cloud + account",
    leaveBehind: [
      "A required account and cloud storage",
      "Branding removal behind Pro ($19/mo)",
      "Your resume stored on their servers",
      "No offline mode",
    ],
    cardBlurb:
      "Standard Resume's free tier includes PDF downloads, but requires an account and stores your data. papersfly needs neither.",
    title: "papersfly vs Standard Resume: no account, offline (2026)",
    description:
      "Standard Resume offers free PDF downloads with a clean tech-friendly design, but requires an account and cloud storage. Compare with papersfly, which needs no signup, uploads nothing, and works offline.",
    lede:
      "Standard Resume is one of the few builders with genuinely free PDF downloads and a clean, tech-friendly single-column design. The difference from papersfly is the account and the cloud — Standard Resume needs both; papersfly needs neither.",
    body: [
      "Standard Resume does the honest-free thing well: its Basic (free) plan includes real PDF downloads, LinkedIn import, and a web resume, with a clean single-column layout that developers and technical candidates tend to like. It's ATS-friendly and not paywalled at the download.",
      "It is still an account-based cloud tool, though. You sign up, your resume is stored on Standard Resume's servers, and Pro ($19/month) adds branding removal, tracking, AI review, and a custom URL. There's no offline mode.",
      "papersfly matches the free-PDF and clean single-column strengths but removes the account and the cloud entirely — nothing is uploaded, no signup is required, and it works offline after first load. On price and PDF access the two are close; on privacy and offline they aren't.",
    ],
    verdict:
      "Standard Resume is a great free, clean builder if you're comfortable with an account and cloud storage. papersfly is the pick if you want the same free PDF while keeping everything on your own device, with no signup and offline support.",
    capabilities: [
      { v: "yes" },                // free to use & download
      { v: "yes" },                // real PDF, not just text
      { v: "no" },                 // no account
      { v: "no" },                 // data on device
      { v: "no" },                 // works offline
      { v: "yes" },                // ATS-safe output
      { v: "partial", note: "Pro" }, // AI writing help
    ],
    competitorStrengths: [
      "You want LinkedIn import and a hosted web resume.",
      "You're fine with an account and cloud sync.",
      "You like its clean, tech-oriented single-column design.",
    ],
    papersflyStrengths: [
      "You want the free PDF without creating an account.",
      "You want nothing uploaded to any server.",
      "You need it to work offline.",
      "You want to keep unlimited documents locally.",
    ],
    faq: [
      { q: "Is Standard Resume free?", a: "Yes — its Basic plan includes free PDF downloads, which makes it one of the honest-free builders. papersfly is also free; the difference is that papersfly needs no account and stores nothing on a server." },
      { q: "Does Standard Resume store my data?", a: "Yes — it's an account-based cloud tool, so your resume is stored on its servers. papersfly keeps everything in your browser." },
      { q: "Can papersfly import from LinkedIn?", a: "No. That's a Standard Resume feature. papersfly focuses on private, offline PDF generation from a form you fill in." },
    ],
    sources: [
      { label: "standardresume.co/pricing", url: "https://standardresume.co/pricing" },
    ],
    quick: { price: "Free (Pro $19/mo)", freeDownload: "Yes", noSignup: "No", onDevice: "No" },
  },
];

/**
 * General, site-authored FAQ for the /alternatives hub. Rendered visibly and
 * emitted as FAQPage JSON-LD. Every claim is verifiable against the per-competitor
 * facts above (quick.freeDownload / noSignup / onDevice / price).
 */
export const ALTERNATIVES_FAQ: { q: string; a: string }[] = [
  {
    q: "Which resume builders are actually free?",
    a: "Only a handful let you download a real, formatted PDF at no cost with no catch. papersfly, Canva, FlowCV, Teal and Standard Resume offer genuinely free PDF downloads; Novoresume, Enhancv and VisualCV stamp a watermark or branding on the free tier; Rezi and Kickresume cap how many times you can download; and Zety and Resume.io only export plain text for free, paywalling the formatted PDF. Of the free options, papersfly is the only one that needs no account and uploads nothing.",
  },
  {
    q: "What does \"ATS-safe\" mean?",
    a: "An applicant tracking system (ATS) is the software employers use to scan resumes before a human sees them. An ATS-safe resume uses a single-column layout and real, selectable text — not words baked into images or hidden in multi-column graphics — so the parser reads your name, roles and dates correctly. Most builders here export ATS-readable PDFs; Canva's popular multi-column, graphic-heavy templates are the main exception.",
  },
  {
    q: "Which resume builder keeps my data private?",
    a: "Every mainstream builder except papersfly is a cloud tool: you create an account and your resume is stored on their servers. papersfly is private by architecture — there is no account and nothing is uploaded. Your document is built, rendered and exported entirely in your browser, and it works offline after the first load.",
  },
  {
    q: "Do I have to create an account to build a resume?",
    a: "For most builders on this page, yes — an account is required and your data is saved to the cloud. papersfly needs no signup: you open it and start building, and nothing is transmitted.",
  },
  {
    q: "Can I download a resume PDF for free without a watermark?",
    a: "Yes, with papersfly — exports are unlimited, unbranded and watermark-free. Novoresume, Enhancv and VisualCV add a watermark or branding on free downloads, and Zety and Resume.io only give you plain text for free, so a clean PDF from those requires paying.",
  },
];

export function getCompetitor(slug: string): Competitor | undefined {
  return competitors.find((c) => c.slug === slug);
}

/** Build a Schema.org FAQPage node from a list of Q&A pairs. */
export function faqPageJsonLd(faq: { q: string; a: string }[]) {
  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: faq.map((f) => ({
      "@type": "Question",
      name: f.q,
      acceptedAnswer: { "@type": "Answer", text: `<p>${f.a}</p>` },
    })),
  };
}
