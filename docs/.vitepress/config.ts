import { defineConfig } from 'vitepress'
import { resolve } from 'path'

export default defineConfig({
  title: 'Responsible Vibe MCP',
  description: 'Model Context Protocol server for intelligent conversation state management and development guidance',
  base: '/responsible-vibe-mcp/',
  srcDir: '../',  // Use root directory as source
  ignoreDeadLinks: true,  // Temporarily ignore dead links
  
  vite: {
    resolve: {
      alias: {
        '@workflow-visualizer': resolve(__dirname, '../../workflow-visualizer/src')
      }
    },
    server: {
      fs: {
        allow: ['../..']
      }
    }
  },
  
  themeConfig: {
    nav: [
      { text: 'Home', link: '/' },
      { text: 'Workflows', link: '/workflows' },
      { text: 'GitHub', link: 'https://github.com/mrsimpson/vibe-feature-mcp' }
    ],

    sidebar: [
      {
        text: 'Getting Started',
        items: [
          { text: 'Introduction', link: '/README' },
          { text: 'Workflows Visualizer', link: '/workflows' }
        ]
      }
    ],

    socialLinks: [
      { icon: 'github', link: 'https://github.com/mrsimpson/vibe-feature-mcp' },
      { icon: 'npm', link: 'https://www.npmjs.com/package/responsible-vibe-mcp' }
    ],

    footer: {
      message: 'Released under the MIT License.',
      copyright: 'Copyright © 2025 Oliver Jägle'
    }
  },

  head: [
    ['link', { rel: 'icon', href: '/responsible-vibe-mcp/favicon.ico' }]
  ],

  // Rewrites to use existing files
  rewrites: {
    'README.md': 'index.md'
  }
})