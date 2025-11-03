module.exports = {
  launch: {
    headless: process.env.HEADLESS !== 'false',
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-dev-shm-usage',
      '--disable-extensions',
      '--disable-gpu'
    ],
    defaultViewport: {
      width: 1280,
      height: 720
    }
  },
  browserContext: 'default',
  exitOnPageError: false
};