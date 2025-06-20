// __mocks__/fs/promises.cjs
// Automatic fs/promises mock using memfs for Vitest

const { fs } = require('memfs')
module.exports = fs.promises
