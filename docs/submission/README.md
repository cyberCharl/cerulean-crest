# ChatGPT plugin submission packet

Prepared 18 September 2026. **Draft, not submitted.** The working product name is Cerulean Crest. Replace bracketed inputs consistently once the name and domain are final. These files do not publish policies or configure any provider.

## Ready to review

- [Listing copy and release notes](listing.md)
- [Reviewer setup, prompts, expected results and evidence sheet](reviewer-guide.md)
- [Privacy, terms and support page drafts](policy-drafts.md)
- [Technical publication runbook](../CHATGPT_PUBLICATION.md)

Current official route: remote MCP plus the curation skill, **With MCP → Universal**. No embedded ChatGPT UI is proposed. Enter the stable production `/mcp` endpoint in the portal and upload the final tested skill bundle; the repository's development `.mcp.json` is not the production submission. [Official submission procedure](https://developers.openai.com/plugins/deploy/submission)

## Inputs still needed

| Input | Where it goes | Status |
| --- | --- | --- |
| Final product name and logo | Listing, website, skill, tool descriptions | Owner decision |
| Stable HTTPS MCP origin | Portal, OAuth metadata/client settings | Owner decision; choose before submitting |
| Publisher's legal individual/business name | Verified OpenAI identity, policy pages | Owner decision and identity verification |
| OpenAI organization and project | Submission portal | Verify permissions and project eligibility |
| Support/privacy contact | Public support and privacy pages | Owner decision; test delivery |
| Retention, backups, deletion procedure | Privacy policy and support runbook | Decide and implement; no deletion deadline promised in drafts |
| Countries and commercial terms | Portal availability and terms | Owner decision |
| Effective date and applicable legal details | Final policy pages | Owner review |
| Dedicated reviewer account | Portal private credential fields | Create and rehearse; never commit credentials |
| Production release and live test evidence | Reviewer guide and scan | Run after implementation and deployment |

Identity must match the public policies and listing. Changing a published MCP origin requires a new plugin submission; choose a lasting host now. This is separate from changing the website's visible brand. See [remote MCP review requirements](https://developers.openai.com/plugins/deploy/app-review).

## Concrete completion sequence

1. Fill the inputs above. Review the policy drafts against actual provider configuration, logs, backups, data use and deletion operations; publish completed pages at `/privacy`, `/terms` and `/support` or update the listing URLs to their real locations.
2. Deploy the tested application and migrate the intended database. Verify the OAuth audience, scopes, PKCE and exact callback allowlist against the portal settings. Give reviewers a dedicated account without MFA, email/SMS gates or private-network access; retain normal protection on personal/operator accounts.
3. Use the portal-generated domain challenge with the new `/.well-known/openai-apps-challenge` route. Set `OPENAI_APPS_CHALLENGE` in the target deployment to the exact token, with no added newline. It is a public verification value, not an OAuth secret. The route returns 404 until configured and serves plain text without caching when configured. Redeploy after setting the variable, fetch the endpoint anonymously, and compare the returned bytes to the token.
4. Build the final skill archive from `plugins/cerulean-crest/skills/`. Inspect its contents and test that exact file tree. Supply the production MCP server separately through the portal. Do not include `.env` files, `.mcp.json` development bearer configuration, credentials, local databases, personal editions or test output containing tokens.
5. Scan tools on the live authenticated endpoint, compare the discovered schemas and annotations with the implementation, run [reviewer cases](reviewer-guide.md), and attach real output/screenshots. An automated test pass is supporting evidence, not a completed ChatGPT rehearsal.
6. Review the completed listing, identity, policies, availability, credentials and evidence as one packet. Submit from the portal once ready. Approval and the later publish action are separate; record the actual directory URL after publishing and configure onboarding with it.

CLI preparation for the skill archive (run only after final skill edits):

```bash
mkdir -p /tmp/cerulean-submission
cd plugins/cerulean-crest/skills
zip -r /tmp/cerulean-submission/curation-skills.zip curate-daily-edition -x '*/.DS_Store'
unzip -l /tmp/cerulean-submission/curation-skills.zip
```

The portal's current upload validation is authoritative. This packet is not an invented manifest format or a substitute for its authentication fields. A draft archive was generated and inspected at `/tmp/cerulean-submission/curation-skills.zip` after the editorial workflow update. It contains only the curation skill and its agent metadata. Regenerate after final naming or skill changes; this draft is not a submitted or ChatGPT-rehearsed artifact.

## Product claims to keep out of this first listing

- Public sharing, friends, email delivery and automatic resurfacing of saved articles.
- Guaranteed autonomous scheduling or universal availability of chat memory.
- Publicly published editions: edition links require the owning reader's login.
- A persistent learned profile unless that specific implementation has shipped and been verified. Article feedback can influence selection without writing a separate learned profile.

Read the [plugin guidelines](https://developers.openai.com/plugins/app-guidelines) before completing attestations. In particular, final privacy disclosures must match what the tools actually send and receive.
