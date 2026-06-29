import { deleteNonAdminUsers } from './src/services/dbService.mjs';
import logger from './src/utils/logger.mjs';

async function runDeletion() {
  try {
    const deletedCount = await deleteNonAdminUsers();
    logger.info(`Successfully deleted ${deletedCount} non-admin users.`);
    process.exit(0);
  } catch (error) {
    logger.error('Error during non-admin user deletion:', error);
    process.exit(1);
  }
}

runDeletion();