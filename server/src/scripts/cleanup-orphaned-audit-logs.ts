import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { AuditLog, User, Customer, Resource, Project } from '../models';

dotenv.config();

interface CleanupStats {
  entityType: string;
  totalLogs: number;
  orphanedLogs: number;
  deleted: number;
}

async function cleanupOrphanedAuditLogs() {
  try {
    await mongoose.connect(process.env.MONGODB_URI as string);
    console.log('Connected to MongoDB\n');

    const stats: CleanupStats[] = [];

    // Define entity types and their corresponding models
    const entityConfigs: Array<{ type: string; model: any }> = [
      { type: 'Project', model: Project },
      { type: 'User', model: User },
      { type: 'Customer', model: Customer },
      { type: 'Resource', model: Resource },
    ];

    for (const config of entityConfigs) {
      console.log(`\n🔍 Checking ${config.type} audit logs...`);
      
      // Get all audit logs for this entity type
      const logs = await AuditLog.find({ entity_type: config.type });
      const totalLogs = logs.length;
      console.log(`   Total ${config.type} logs: ${totalLogs}`);

      if (totalLogs === 0) {
        stats.push({
          entityType: config.type,
          totalLogs: 0,
          orphanedLogs: 0,
          deleted: 0,
        });
        continue;
      }

      // Check which entity IDs still exist
      const entityIds = [...new Set(logs.map(log => log.entity_id.toString()))];
      const orphanedIds: string[] = [];

      for (const entityId of entityIds) {
        const exists = await config.model.findById(entityId);
        if (!exists) {
          orphanedIds.push(entityId);
        }
      }

      console.log(`   Orphaned ${config.type} IDs: ${orphanedIds.length}`);

      if (orphanedIds.length > 0) {
        console.log(`   Deleting audit logs for orphaned ${config.type}s...`);
        
        // Delete audit logs for entities that no longer exist
        const deleteResult = await AuditLog.deleteMany({
          entity_type: config.type,
          entity_id: { $in: orphanedIds.map(id => new mongoose.Types.ObjectId(id)) },
        });

        console.log(`   ✅ Deleted ${deleteResult.deletedCount} orphaned audit logs`);

        stats.push({
          entityType: config.type,
          totalLogs,
          orphanedLogs: orphanedIds.length,
          deleted: deleteResult.deletedCount,
        });
      } else {
        console.log(`   ✅ No orphaned logs found`);
        stats.push({
          entityType: config.type,
          totalLogs,
          orphanedLogs: 0,
          deleted: 0,
        });
      }
    }

    // Print summary
    console.log('\n' + '='.repeat(60));
    console.log('CLEANUP SUMMARY');
    console.log('='.repeat(60));
    
    let totalDeleted = 0;
    stats.forEach(stat => {
      console.log(`\n${stat.entityType}:`);
      console.log(`  Total Logs: ${stat.totalLogs}`);
      console.log(`  Orphaned Entity IDs: ${stat.orphanedLogs}`);
      console.log(`  Logs Deleted: ${stat.deleted}`);
      totalDeleted += stat.deleted;
    });

    console.log('\n' + '='.repeat(60));
    console.log(`TOTAL AUDIT LOGS DELETED: ${totalDeleted}`);
    console.log('='.repeat(60) + '\n');

    await mongoose.disconnect();
    console.log('Disconnected from MongoDB');
  } catch (error) {
    console.error('Error during cleanup:', error);
    process.exit(1);
  }
}

cleanupOrphanedAuditLogs();
