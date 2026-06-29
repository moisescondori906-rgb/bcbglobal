import { runUploadCleanupOnce } from '../src/services/uploadCleanupService.mjs';

async function manual() {
  console.log('--- MANUAL UPLOAD CLEANUP START ---');
  const stats = await runUploadCleanupOnce();
  console.log('--- MANUAL UPLOAD CLEANUP END ---');
  console.log(JSON.stringify(stats, null, 2));
  process.exit(0);
}

manual().catch(err => {
  console.error('Manual cleanup failed:', err);
  process.exit(1);
});
