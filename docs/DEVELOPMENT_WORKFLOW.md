# Development workflow follow-up

Recorded 17 September 2026 after the request to deploy onboarding for owner testing. This is proposed work, not a configured pipeline.

## Next implementation scope

- Establish a clean, committed baseline that matches the deployed application; retain a release record tying each deployment to its source revision.
- Develop on short-lived branches with pull requests and Vercel previews. Run unit tests, TypeScript, production build and authenticated HTTP integration checks before release.
- Give previews isolated database state and separate Auth0 configuration. Make realistic fixture accounts/editions easy to recreate without copying private production data.
- Add a repeatable browser test for signup/login, onboarding saves, per-user isolation and opening the first edition. Keep real external ChatGPT authorization as an explicit integration acceptance test.
- Define production release and rollback commands, with migration compatibility and recovery checked before promotion. Ensure the promoted artifact uses production configuration; do not blindly promote a preview connected to a preview database.
- Pin the Node 24 toolchain and provide a single documented local setup command.

## Current priority

Mobile app work is deferred by the owner. Focus on a reliable web development workflow before expanding accounts, friends and sharing. No mobile-specific API or packaging work is required now.

See [the prioritized Friday checklist](TODO.md) for the work order. Preserve account isolation as social features introduce explicit sharing permissions.
