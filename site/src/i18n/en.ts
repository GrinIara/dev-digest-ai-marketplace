// Every piece of text a person reads on the site lives in this file: labels, headings, sentences,
// aria-labels, placeholders and error messages. Components import `m` from './index' and never write
// readable text themselves (src/i18n/no-hardcoded-text.test.ts enforces that).
//
// Conventions
//  - A plain string is a fixed text.
//  - A function takes the values to insert and returns the finished text.
//  - A string with {name} placeholders is filled with markup by `rich()`; it keeps the whole sentence
//    in one piece so a translation can reorder the words.
// To add a language, create a file with the same shape (it must satisfy `Messages`) and select it in index.ts.

const results = (n: number) => `${n} result${n === 1 ? '' : 's'}`;
const items = (n: number) => `${n} item${n === 1 ? '' : 's'}`;

export const en = {
  /** Locale used to format dates. */
  locale: 'en-GB',

  meta: {
    title: 'dev-digest marketplace',
    description: 'Plugins, skills and agents for Claude Code, searchable in one place.',
    /** Shown when the index has no marketplace name. */
    unnamedMarketplace: 'the marketplace',
  },

  a11y: {
    skipToContent: 'Skip to content',
    breadcrumb: 'Breadcrumb',
  },

  common: {
    browse: 'Browse',
    clear: 'Clear',
    close: 'Close',
    copy: 'Copy',
    noDate: 'No date',
    noDateRecorded: 'No date recorded',
    updated: (date: string) => `updated ${date}`,
    tag: (tag: string) => `#${tag}`,
    pluginLabel: 'Plugin',
    permissions: 'Permissions',
  },

  theme: {
    switchTo: { dark: 'Switch to dark theme', light: 'Switch to light theme' },
    button: { dark: 'Dark', light: 'Light' },
  },

  nav: {
    label: 'Main',
    browse: 'Browse',
    whatsNew: "What's new",
    start: 'Get started',
  },

  header: {
    brandAria: 'dev-digest marketplace, home',
    brandMark: 'dd',
    brandPrefix: 'dev-digest',
    brandSuffix: 'marketplace',
    searchPlaceholder: 'Search plugins, skills, agents…',
    searchLabel: 'Search the marketplace',
    clearSearch: 'Clear search',
    openPalette: 'Open command palette',
    paletteKeyMac: '⌘K',
    paletteKeyOther: 'Ctrl K',
    github: 'GitHub ↗',
  },

  footer: {
    atomFeed: 'Atom feed',
    meta: (commit: string | null) => `index.json · schema v1${commit ? ` · ${commit}` : ''}`,
  },

  types: {
    plugin: { label: 'Plugin', plural: 'Plugins' },
    skill: { label: 'Skill', plural: 'Skills' },
    agent: { label: 'Agent', plural: 'Agents' },
    command: { label: 'Command', plural: 'Commands' },
    hook: { label: 'Hook', plural: 'Hooks' },
    mcp: { label: 'MCP', plural: 'MCP servers' },
  },

  facets: {
    type: 'Type',
    category: 'Category',
    tag: 'Tag',
    author: 'Author',
  },

  badges: {
    hooks: { label: 'hooks', title: 'Runs hooks on Claude Code events' },
    mcp: { label: 'MCP', title: 'Starts an MCP server' },
    scripts: { label: 'scripts', title: 'Runs shell scripts' },
    warn: (label: string) => `⚠ ${label}`,
  },

  copy: {
    copied: '✓ Copied',
    failed: 'Copy failed',
    liveCopied: (text: string) => `Copied: ${text}`,
    liveFailed: 'Copy failed',
  },

  errors: {
    loadTitle: 'The catalog could not be loaded',
    retry: 'Try again',
    http: (status: number) => `index.json: HTTP ${status}`,
    schema: (version: unknown) => `index.json: unsupported schemaVersion ${String(version)}`,
  },

  palette: {
    dialogLabel: 'Command palette',
    inputLabel: 'Search or jump to',
    placeholder: 'Search or jump to…',
    resultsLabel: 'Results',
    loading: 'Loading index…',
    noMatch: (query: string) => `No match for “${query}”`,
    noMatchHint: 'Try another word. Search understands English and Ukrainian.',
    groupPages: 'Pages',
    groupPlugins: 'Plugins',
    actionSub: 'Action',
    pages: {
      browse: { label: 'Browse', sub: 'All artifacts' },
      whatsNew: { label: "What's new", sub: 'Release feed' },
      start: { label: 'Get started', sub: 'Connect the marketplace' },
    },
    artifactSub: (plugin: string, description: string) => `${plugin} · ${description}`,
    escKey: 'Esc',
    footerNavigate: '↑↓ navigate',
    footerOpen: '↵ open',
    footerClose: 'esc close',
  },

  home: {
    heroTitle: 'Plugins, skills and agents for Claude Code',
    lede: 'Everything in {name}, searchable in one place. Connect the marketplace once, then copy an install command from any card.',
    step1: 'Step 1 of 3 · Add the marketplace',
    copyMarketplaceAria: 'Copy marketplace add command',
    getStarted: 'Get started in 3 steps →',
    catalog: 'Catalog',

    filters: 'Filters',
    filtersWithCount: (n: number) => `Filters · ${n}`,
    clearFilterAria: (facet: string) => `Clear ${facet} filter`,
    showFewer: 'Show fewer',
    showAllTags: 'Show all tags',
    showResults: (n: number) => `Show ${results(n)}`,

    titleAll: 'All artifacts',
    titleQuery: (query: string) => `Results for “${query}”`,
    results,
    sort: 'Sort',
    sortRelevance: 'Relevance',
    sortName: 'Name',
    sortUpdated: 'Recently updated',

    chip: (facet: string, value: string) => `${facet}: ${value}`,
    removeFilterAria: (facet: string, value: string) => `Remove filter ${facet} ${value}`,
    clearAll: 'Clear all',

    emptyCatalogTitle: 'No plugins published yet',
    emptyCatalog: 'The catalog is built from {dir} in the repo. Plugins show up here after they are merged.',
    noResultsQuery: (query: string) => `No results for “${query}”`,
    noResultsFilters: 'No artifacts match these filters',
    noResultsHint: 'Try a shorter query, remove a filter, or one of these. Search understands English and Ukrainian.',
    clearSearchAndFilters: 'Clear search and filters',

    whatsNew: "What's new",
    allReleases: 'All releases →',
    noReleases: 'No releases recorded yet.',

    card: {
      items,
      inPlugin: (plugin: string) => `in ${plugin}`,
      copyInstall: 'Copy install',
      copyInstallAria: (name: string) => `Copy install command for ${name}`,
    },
  },

  detail: {
    tabsLabel: 'Details',
    tabs: {
      overview: 'Overview',
      includesPlugin: 'What it includes',
      includesChild: 'Plugin',
      perms: 'Permissions',
      compat: 'Compatibility',
      log: 'Changelog',
    },
    claudeCode: (version: string) => `Claude Code ${version}`,
    by: 'by {author}',
    sourceOnGithub: 'Source on GitHub ↗',
    copyInstall: 'Copy install command',
    copiedToClipboard: '✓ Copied to clipboard',
    copyFailedSelect: 'Copy failed. Select the text below',
    installsWhole: 'Installs the whole {plugin} plugin, which contains this {type}.',
    noDescriptionFile: (type: string) => `This ${type} has no description file yet.`,

    permsIntro: 'Plugins run with your permissions. Read what this one can do before installing.',
    perms: {
      tools: 'Tools',
      hooks: 'Hooks',
      mcp: 'MCP',
      scripts: 'Scripts',
      yes: '⚠ Yes',
      no: 'No',
      noTools: 'No tools declared in frontmatter',
      hooksYes: 'Runs hooks on Claude Code events (hooks/hooks.json)',
      hooksNo: 'No hooks',
      mcpYes: 'Starts an MCP server (.mcp.json)',
      mcpNo: 'No MCP servers',
      scriptsYes: 'Runs shell commands or bundled scripts',
      scriptsNo: 'No scripts',
    },

    compat: {
      claudeCode: 'Claude Code',
      os: 'OS',
      notStated: 'Not stated',
      note: 'From {file} of the {plugin} plugin. “Not stated” means the file does not say.',
    },

    noChangelog: 'No CHANGELOG.md entries for this plugin.',
    related: 'Related',
    noRelated: 'Nothing related yet.',
    sharedTag: (tag: string) => `Shared tag #${tag}`,
    samePlugin: 'Same plugin',
  },

  releases: {
    title: "What's new",
    note: "Releases from each plugin's {file}. A release without a recorded date shows no date.",
    pluginLabel: 'Plugin',
    allPlugins: 'All plugins',
    feedJson: 'feed.json',
    feedAtom: 'feed.xml (Atom)',
  },

  start: {
    title: 'Connect the marketplace',
    intro: 'Three commands in Claude Code. Copy each one and run it in order.',
    steps: [
      { title: 'Add the marketplace', note: 'Registers this repo as a plugin source. Run once per machine.' },
      { title: 'Install a plugin', note: 'Pick a plugin here, or copy the command from any card.' },
      { title: 'Reload', note: 'Makes the new skills, agents and commands available in the current session.' },
    ],
    pluginPlaceholder: '<plugin>',
    pluginLabel: 'Plugin',
    copyStepAria: (n: number) => `Copy step ${n} command`,
    warn: "Plugins can run hooks, MCP servers and scripts with your permissions. Review a plugin's {permissions} tab before installing it.",
    browsePlugins: 'Browse plugins',
  },

  notFound: {
    code: '404',
    title: 'Nothing at this address',
    body: 'The page may have moved, or the plugin was renamed. Search the catalog instead.',
    search: 'Search',
    back: '← Back to browse',
  },
};

export type Messages = typeof en;
