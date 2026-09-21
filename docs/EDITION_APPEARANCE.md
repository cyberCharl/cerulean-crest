# Reader appearance

Quiet book is the default theme throughout Daybook. Readers can choose Quiet book or Tactile correspondence in **Settings → Appearance → Save appearance**. The preference is stored in the reader's existing settings JSON, follows the reader across devices, and is applied on the server before rendering. Existing accounts without a theme use Quiet book. No database migration is needed.

Editions use `/issues/YYYY-MM-DD`. The old `/quiet-book` and `/tactile-correspondence` comparison URLs redirect to the canonical edition and respect the saved preference. The original Cerulean appearance and edition appearance switcher have been retired.

On desktops at least 1100 CSS pixels wide, a centred reading column contains each title and summary. Author, publication, date, content type, and reading time sit in the left margin; source links, read state, saving, and private feedback sit on the right. Edition context follows the same column alignment. Smaller screens stack these elements in a single readable column.

Both themes share authentication, ownership, content, saved articles, feedback, and browser reading progress. Appearance updates patch only the theme, and editorial updates preserve it. MCP editorial tools cannot change the theme and exclude it from the editorial brief. Article image extraction is not part of this implementation.

The shared server renderer is `components/edition-page.tsx`; interactive reading controls live in `components/issue-content.tsx`. `app/reader-theme.css` supplies the common visual theme and responsive reader layout. `lib/reader-theme.ts` defines the supported choices and default.

The selected Daybook logo is **The spine, revised** (study 08), at `/brand/daybook/daybook-mark.svg`. Earlier iterations remain on `/brand/daybook/index.html` for reference. Daybook remains the working product name; the existing connector retains its configured name.

Validation covers unit tests for defaults, invalid input, ownership, concurrent settings changes, and exclusion from MCP; HTTP tests exercise the real appearance form, persistence across routes, and authentication. Both themes are also visually checked at desktop and mobile sizes. Postgres integration tests require an explicitly configured test database.
