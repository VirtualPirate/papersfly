# PostHog post-wizard report

The wizard has completed a PostHog integration for papersfly — a fully client-side Astro + React resume builder. PostHog is initialized via a reusable `src/components/posthog.astro` snippet (injected into `BaseLayout.astro` so it covers every page), and six custom events are captured across the core conversion funnel: homepage CTA → template gallery → builder → PDF download, plus style variant exploration and AI-import usage.

| Event | Description | File |
|---|---|---|
| `cta_clicked` | User clicks the primary "Create a document" CTA on the homepage | `src/pages/index.astro` |
| `template_selected` | User clicks a template card to open the builder | `src/components/create/TemplateCard.tsx` |
| `pdf_downloaded` | User successfully exports and downloads a PDF | `src/App.tsx` |
| `pdf_download_failed` | PDF generation encountered an error (also sends `captureException`) | `src/App.tsx` |
| `import_completed` | User successfully imports AI-generated content into the editor | `src/App.tsx` |
| `variant_changed` | User changes a color or font variant in the style picker | `src/App.tsx` |

## Next steps

We've built some insights and a dashboard for you to keep an eye on user behavior, based on the events we just instrumented:

- [Analytics basics (wizard) — Dashboard](https://us.posthog.com/project/507812/dashboard/1833170)
- [Template → PDF conversion funnel (wizard)](https://us.posthog.com/project/507812/insights/nQvEwOIo)
- [PDF downloads over time (wizard)](https://us.posthog.com/project/507812/insights/nS2LAabY)
- [Template selections by template (wizard)](https://us.posthog.com/project/507812/insights/wH2KXnzx)
- [Style variant changes (wizard)](https://us.posthog.com/project/507812/insights/yinrtKLK)
- [Homepage CTA clicks (wizard)](https://us.posthog.com/project/507812/insights/F5Y5RlyR)

## Verify before merging

- [ ] Run a full production build (`pnpm build`) and fix any lint or type errors introduced by the generated code.
- [ ] Run the test suite (`pnpm test`) — call sites that were rewritten or instrumented may need updated mocks or fixtures.
- [ ] Add `PUBLIC_POSTHOG_PROJECT_TOKEN` and `PUBLIC_POSTHOG_HOST` to `.env.example` and any onboarding scripts so collaborators know what to set.
- [ ] Wire source-map upload (`posthog-cli sourcemap` or your bundler's upload step) into CI so production stack traces de-minify.

### Agent skill

We've left an agent skill folder in your project. You can use this context for further agent development when using Claude Code. This will help ensure the model provides the most up-to-date approaches for integrating PostHog.
