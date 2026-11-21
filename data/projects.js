/* Projects — single source of truth for the Projects listing
   (and the "Featured projects" section on the home page).
   To add a project: (1) copy /templates/project.html to
   /projects/<slug>/index.html and fill it in, then (2) prepend
   an entry here. Newest first. See README.md. */
window.PROJECTS = [
  {
    title: 'blobshelf',
    href: 'blobshelf/index.html',
    meta: '2026 · Active · Swift · macOS',
    tagline: 'A native Mac app for your Upstash Blob buckets, with automatic folder backups. Sandboxed, zero dependencies.',
    foot: 'Landing page →',
    icon: '🗄️',
    accent: '#3b82f6'
  },
  {
    title: 'nitpick',
    href: 'nitpick/index.html',
    meta: '2026 · Active · TypeScript · CLI',
    tagline: 'Parallel AI code review for GitHub pull requests. Specialist reviewers run in isolated sandboxes, a verifier checks every finding, and agents get JSON plus exit codes to gate on.',
    foot: 'Landing page →',
    icon: '🔎',
    accent: '#14b8a6'
  }
];
