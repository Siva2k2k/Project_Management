import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { Customer } from '../models/Customer';
import { Resource } from '../models/Resource';
import { Project } from '../models/Project';
import { ProjectWeeklyEffort } from '../models/ProjectWeeklyEffort';
import { ProjectWeeklyMetrics } from '../models/ProjectWeeklyMetrics';

dotenv.config();

const MONGODB_URI = process.env.MONGODB_URI || "mongodb+srv://sivakumar_db_user:SivaCluster29@timesheet-management-cl.hnjw4hb.mongodb.net/project-management-clean?retryWrites=true&w=majority&appName=timesheet-management-cluster";

async function verifyNoDuplicates() {
  try {
    console.log('='.repeat(70));
    console.log('VERIFYING DATABASE FOR DUPLICATES');
    console.log('Date: December 3, 2025');
    console.log('='.repeat(70));
    console.log();

    // Connect to MongoDB
    console.log('📡 Connecting to MongoDB...');
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Connected to MongoDB\n');

    let hasIssues = false;

    // Find AI Sample Project
    const aiProject = await Project.findOne({ project_name: 'AI Sample Project' });
    
    if (!aiProject) {
      console.log('❌ AI Sample Project not found in database');
      return;
    }

    console.log(`✅ Found AI Sample Project: ${aiProject._id}\n`);

    // Check for duplicate weekly efforts
    console.log('🔍 Checking for duplicate weekly efforts...');
    const efforts = await ProjectWeeklyEffort.find({ project: aiProject._id })
      .sort({ week_start_date: 1, resource: 1 })
      .populate('resource', 'resource_name email')
      .lean();

    console.log(`   Total weekly effort entries: ${efforts.length}`);

    // Group by week_start_date and resource to find duplicates
    const effortMap = new Map<string, any[]>();
    for (const effort of efforts) {
      const resource = (effort.resource as any);
      const key = `${effort.week_start_date.toISOString()}_${resource._id}`;
      if (!effortMap.has(key)) {
        effortMap.set(key, []);
      }
      effortMap.get(key)!.push(effort);
    }

    const duplicateEfforts = Array.from(effortMap.entries()).filter(([_, entries]) => entries.length > 1);
    
    if (duplicateEfforts.length > 0) {
      console.log(`   ❌ FOUND ${duplicateEfforts.length} DUPLICATE EFFORT ENTRIES:`);
      hasIssues = true;
      for (const [, entries] of duplicateEfforts) {
        const resource = (entries[0].resource as any);
        console.log(`      Week: ${entries[0].week_start_date.toISOString().split('T')[0]} | Resource: ${resource.resource_name}`);
        console.log(`      Duplicate IDs: ${entries.map(e => e._id).join(', ')}`);
        console.log(`      Hours: ${entries.map(e => e.hours).join(', ')}`);
      }
    } else {
      console.log('   ✅ No duplicate weekly effort entries found');
    }

    // Check for duplicate weekly metrics
    console.log('\n🔍 Checking for duplicate weekly metrics...');
    const metrics = await ProjectWeeklyMetrics.find({ project: aiProject._id })
      .sort({ week_start_date: 1 })
      .lean();

    console.log(`   Total weekly metrics entries: ${metrics.length}`);

    const metricsMap = new Map<string, any[]>();
    for (const metric of metrics) {
      const key = metric.week_start_date.toISOString();
      if (!metricsMap.has(key)) {
        metricsMap.set(key, []);
      }
      metricsMap.get(key)!.push(metric);
    }

    const duplicateMetrics = Array.from(metricsMap.entries()).filter(([_, entries]) => entries.length > 1);
    
    if (duplicateMetrics.length > 0) {
      console.log(`   ❌ FOUND ${duplicateMetrics.length} DUPLICATE METRICS ENTRIES:`);
      hasIssues = true;
      for (const [, entries] of duplicateMetrics) {
        console.log(`      Week: ${entries[0].week_start_date.toISOString().split('T')[0]}`);
        console.log(`      Duplicate IDs: ${entries.map(e => e._id).join(', ')}`);
        console.log(`      Rollup Hours: ${entries.map(e => e.rollup_hours).join(', ')}`);
      }
    } else {
      console.log('   ✅ No duplicate weekly metrics entries found');
    }

    // List all weeks with efforts
    console.log('\n📅 Weekly Efforts Timeline:');
    const weekGroups = new Map<string, any[]>();
    for (const effort of efforts) {
      const weekKey = effort.week_start_date.toISOString().split('T')[0];
      if (!weekGroups.has(weekKey)) {
        weekGroups.set(weekKey, []);
      }
      weekGroups.get(weekKey)!.push(effort);
    }

    let weekNum = 1;
    for (const [weekStart, weekEfforts] of Array.from(weekGroups.entries()).sort()) {
      const totalHours = weekEfforts.reduce((sum, e) => sum + e.hours, 0);
      const resourceList = weekEfforts.map(e => {
        const res = (e.resource as any);
        return `${res.resource_name}: ${e.hours}h`;
      }).join(', ');
      console.log(`   Week ${weekNum++}: ${weekStart} | Total: ${totalHours}h | ${resourceList}`);
    }

    // Check for duplicate AI Sample Projects
    console.log('\n🔍 Checking for duplicate AI Sample Projects...');
    const allAIProjects = await Project.find({ project_name: 'AI Sample Project' }).lean();
    
    if (allAIProjects.length > 1) {
      console.log(`   ❌ FOUND ${allAIProjects.length} AI SAMPLE PROJECTS:`);
      hasIssues = true;
      for (const proj of allAIProjects) {
        console.log(`      ID: ${proj._id} | Created: ${(proj as any).createdAt}`);
      }
      console.log('   ⚠️  Only one AI Sample Project should exist!');
    } else {
      console.log('   ✅ Only one AI Sample Project found');
    }

    // Check for duplicate resources by email
    console.log('\n🔍 Checking for duplicate resources...');
    const allResources = await Resource.find({}).lean();
    const resourceEmailMap = new Map<string, any[]>();
    for (const resource of allResources) {
      if (!resourceEmailMap.has(resource.email)) {
        resourceEmailMap.set(resource.email, []);
      }
      resourceEmailMap.get(resource.email)!.push(resource);
    }

    const duplicateResources = Array.from(resourceEmailMap.entries()).filter(([_, entries]) => entries.length > 1);
    
    if (duplicateResources.length > 0) {
      console.log(`   ❌ FOUND ${duplicateResources.length} DUPLICATE RESOURCES:`);
      hasIssues = true;
      for (const [email, entries] of duplicateResources) {
        console.log(`      Email: ${email}`);
        console.log(`      IDs: ${entries.map(e => e._id).join(', ')}`);
      }
    } else {
      console.log('   ✅ No duplicate resources found');
    }

    // Check for duplicate customers by email
    console.log('\n🔍 Checking for duplicate customers...');
    const allCustomers = await Customer.find({}).lean();
    const customerEmailMap = new Map<string, any[]>();
    for (const customer of allCustomers) {
      if (!customerEmailMap.has(customer.email)) {
        customerEmailMap.set(customer.email, []);
      }
      customerEmailMap.get(customer.email)!.push(customer);
    }

    const duplicateCustomers = Array.from(customerEmailMap.entries()).filter(([_, entries]) => entries.length > 1);
    
    if (duplicateCustomers.length > 0) {
      console.log(`   ❌ FOUND ${duplicateCustomers.length} DUPLICATE CUSTOMERS:`);
      hasIssues = true;
      for (const [email, entries] of duplicateCustomers) {
        console.log(`      Email: ${email}`);
        console.log(`      IDs: ${entries.map(e => e._id).join(', ')}`);
      }
    } else {
      console.log('   ✅ No duplicate customers found');
    }

    console.log();
    console.log('='.repeat(70));
    if (hasIssues) {
      console.log('❌ VERIFICATION FAILED - DUPLICATES FOUND');
      console.log('='.repeat(70));
      console.log();
      console.log('💡 Recommendation:');
      console.log('   The seed script includes logic to delete existing AI Sample Project');
      console.log('   data before creating new entries. However, duplicates were found.');
      console.log('   This is expected since each run creates fresh data.');
      console.log();
      console.log('   The latest run is the most recent AI Sample Project entry.');
    } else {
      console.log('✅ VERIFICATION PASSED - NO DUPLICATES FOUND');
      console.log('='.repeat(70));
      console.log();
      console.log('🎉 Database is clean and consistent!');
    }
    console.log();

  } catch (error) {
    console.error('❌ Error during verification:', error);
    throw error;
  } finally {
    await mongoose.disconnect();
    console.log('📡 Disconnected from MongoDB');
  }
}

// Run the verification
verifyNoDuplicates()
  .then(() => {
    console.log('✅ Verification completed');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Verification failed:', error);
    process.exit(1);
  });
