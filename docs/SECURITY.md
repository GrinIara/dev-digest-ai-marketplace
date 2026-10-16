# Security

Plugins run with the user's permissions: hooks and MCP servers execute code, and skills can drive tools. After the first install, updates load new code without asking again. Everything merged here ships to every user of the marketplace.

## Secrets

- No tokens, keys or passwords in the repo. CI scans plugin files for common secret formats, but it is not a guarantee.
- For values a plugin needs at runtime, declare them in `userConfig` with `"sensitive": true` (stored in the OS keychain) and reference them as `${user_config.KEY}`.
- Shell-form hooks cannot use `${user_config.KEY}`; read `$CLAUDE_PLUGIN_OPTION_<KEY>` from the environment instead.
- In `.mcp.json`, take credentials from `${VAR}` environment variables, never literals.

## Hooks

- Keep hooks fast and idempotent. Exit code 2 blocks the tool call; only block on purpose.
- Fail open on unexpected errors unless blocking is the hook's job.
- Do not download and execute code from a hook.
- Quote `"${CLAUDE_PLUGIN_ROOT}"`, or use exec form with `args`, to avoid word splitting and injection through paths.

## MCP servers

- Use `https://` for remote servers. `claude plugin validate` warns on `http://` to non-local hosts.
- Document every server, its host and the data it receives in the plugin's `COMPATIBILITY.md`.

## Review checklist

Reviewers read every change to these with extra care:

- `hooks/hooks.json` and any script it calls
- `.mcp.json` and `mcpServers` in `plugin.json`
- any script, binary or `package.json`
- new network hosts

## Access to this marketplace

If the repository is private, users need git credentials Claude Code can use without a prompt:

- `gh auth login` then `gh auth setup-git`, or
- an SSH key loaded in `ssh-agent`.

A `GITHUB_TOKEN` environment variable alone does not authenticate background updates. Without stored credentials, auto-update fails silently and users stay on the old version.

## Reporting a problem

Open a private security advisory on GitHub, or contact the code owners in `.github/CODEOWNERS`. Do not file a public issue for vulnerabilities.
