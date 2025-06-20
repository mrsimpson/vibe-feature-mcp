// __mocks__/fs.cjs
// Automatic fs mock using memfs for Vitest

const { fs } = require('memfs')
module.exports = fs
