import { defineConfig } from 'vitepress';
import { resolve } from 'node:path';
import { withMermaid } from 'vitepress-plugin-mermaid';

export default withMermaid(
  defineConfig({
    title: 'Responsible Vibe MCP',
    description:
      'Model Context Protocol server for intelligent conversation state management and development guidance',
    base: '/responsible-vibe-mcp/',
    ignoreDeadLinks: true, // Temporarily ignore dead links

    // Map files from project root to docs
    rewrites: {
      '../README.md': 'index.md',
    },

    vite: {
      resolve: {
        alias: {
          '@workflow-visualizer': resolve(
            __dirname,
            '../../workflow-visualizer/src'
          ),
        },
      },
      server: {
        fs: {
          allow: ['../..'],
        },
      },
    },

    themeConfig: {
      nav: [
        { text: 'Documentation', link: '/' },
        { text: 'Workflows', link: '/workflows' },
        {
          text: 'GitHub',
          link: 'https://github.com/mrsimpson/vibe-feature-mcp',
        },
      ],

      sidebar: [
        {
          text: 'User Guide',
          items: [
            { text: 'Overview', link: '/' },
            { text: 'How it works', link: '/user/how-it-works' },
            {
              text: 'Long term project memory',
              link: '/user/long-term-memory',
            },
            {
              text: 'Custom State Machine',
              link: '/user/custom-state-machine',
            },
            { text: 'Commits', link: '/user/git-commit-feature' },
          ],
        },
        {
          text: 'Development',
          items: [
            { text: 'Architecture', link: '/dev/architecture' },
            { text: 'Development Guide', link: '/dev/development' },
            { text: 'Logging', link: '/dev/logging' },
            { text: 'Publishing', link: '/dev/publishing' },
          ],
        },
      ],

      socialLinks: [
        {
          icon: 'github',
          link: 'https://github.com/mrsimpson/vibe-feature-mcp',
        },
        {
          icon: 'npm',
          link: 'https://www.npmjs.com/package/responsible-vibe-mcp',
        },
      ],

      footer: {
        message: 'Released under the MIT License.',
        copyright: 'Copyright © 2025 Oliver Jägle',
      },
    },

    head: [
      ['link', { rel: 'icon', href: '/responsible-vibe-mcp/favicon.ico' }],
    ],
  })
);
