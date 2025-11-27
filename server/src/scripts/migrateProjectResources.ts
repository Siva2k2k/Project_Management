/**
 * Migration Script: Populate Project Resources from Weekly Efforts
 * 
 * This script analyzes ProjectWeeklyEffort records to determine which resources
 * have worked on each project and updates the Project.resources field accordingly.
 * 
 * Run: npm run migrate:resources
 */

import 'dotenv/config';
import mongoose from 'mongoose';
import { Project } from '../models/Project';
import { ProjectWeeklyEffort } from '../models/ProjectWeeklyEffort';
import { connectDatabase } from '../config/database';

interface ProjectResourceMap {
  [projectId: string]: Set<string>;
}

async function migrateProjectResources() {
  try {
    console.log('🔄 Starting project resources migration...\n');

    // Connect to database
    await connectDatabase();
    console.log('✅ Connected to database\n');

    // Fetch all weekly efforts
    console.log('📊 Fetching weekly effort records...');
    const weeklyEfforts = await ProjectWeeklyEffort.find({})
      .select('project resource')
      .lean();
    
    console.log(`   Found ${weeklyEfforts.length} weekly effort records\n`);

    if (weeklyEfforts.length === 0) {
      console.log('⚠️  No weekly effort records found. Nothing to migrate.');
      return;
    }

    // Build a map: projectId -> Set of resourceIds
    const projectResourceMap: ProjectResourceMap = {};
    
    for (const effort of weeklyEfforts) {
      const projectId = effort.project.toString();
      const resourceId = effort.resource.toString();
      
      if (!projectResourceMap[projectId]) {
        projectResourceMap[projectId] = new Set<string>();
      }
      
      projectResourceMap[projectId].add(resourceId);
    }

    console.log(`📦 Found resources for ${Object.keys(projectResourceMap).length} projects\n`);

    // Update each project with its resources
    let updatedCount = 0;
    let skippedCount = 0;
    let errorCount = 0;

    for (const [projectId, resourceIds] of Object.entries(projectResourceMap)) {
      try {
        const resourceArray = Array.from(resourceIds).map(id => new mongoose.Types.ObjectId(id));
        
        const project = await Project.findById(projectId);
        
        if (!project) {
          console.log(`   ⚠️  Project ${projectId} not found, skipping...`);
          skippedCount++;
          continue;
        }

        // Check if resources already populated
        if (project.resources && project.resources.length > 0) {
          console.log(`   ℹ️  Project "${project.project_name}" already has ${project.resources.length} resources, skipping...`);
          skippedCount++;
          continue;
        }

        // Update the project
        project.resources = resourceArray;
        await project.save();
        
        console.log(`   ✅ Updated project "${project.project_name}" with ${resourceArray.length} resource(s)`);
        updatedCount++;
        
      } catch (error: any) {
        console.error(`   ❌ Error updating project ${projectId}:`, error.message);
        errorCount++;
      }
    }

    // Summary
    console.log('\n' + '='.repeat(60));
    console.log('📊 Migration Summary:');
    console.log('='.repeat(60));
    console.log(`✅ Projects updated:     ${updatedCount}`);
    console.log(`ℹ️  Projects skipped:     ${skippedCount}`);
    console.log(`❌ Errors encountered:   ${errorCount}`);
    console.log('='.repeat(60));

    console.log('\n✨ Migration completed successfully!\n');

  } catch (error: any) {
    console.error('\n❌ Migration failed:', error.message);
    console.error(error.stack);
    process.exit(1);
  } finally {
    await mongoose.connection.close();
    console.log('🔌 Database connection closed');
    process.exit(0);
  }
}

// Run the migration
migrateProjectResources();
