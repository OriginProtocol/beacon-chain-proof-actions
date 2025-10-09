const { cleanOldCache } = require('./utils/common');
const { hideBin } = require('yargs/helpers');
const yargs = require('yargs');

const argv = yargs(hideBin(process.argv))
  .usage('Clean old cache files')
  .help()
  .argv;

async function cleanCacheStandalone() {
  console.log('🧹 Cleaning old cache files...');
  
  try {
    cleanOldCache();
    console.log('✅ Cache cleanup completed successfully');
  } catch (error) {
    console.error('❌ Error during cache cleanup:', error.message);
    process.exit(1);
  }
}

cleanCacheStandalone();
