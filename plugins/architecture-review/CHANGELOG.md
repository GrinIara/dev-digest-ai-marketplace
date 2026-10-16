# Changelog

## 1.0.0 - 2026-10-16

- First release: the `architecture-reviewer` agent.
- Depends on `engineering-paved-path` `^1.0.0`: the reviewer loads its architecture, framework and data skills by namespaced name.
- Ported from the maintainer's own project setup (`GrinIara/dev-digest`, commit `7381eb1`) and generalised: the fixed project-specific check catalog was replaced by a generic one (backend layering, pure core, frontend structure, cross-package), and the rule sources are now the project's own documents plus the matching skills.
