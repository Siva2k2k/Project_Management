import mongoose from 'mongoose';
import dotenv from 'dotenv';
import * as fs from 'fs';
import * as path from 'path';
import { User } from '../models/User';
import { Customer } from '../models/Customer';
import { Resource } from '../models/Resource';
import { Project } from '../models/Project';
import { ProjectWeeklyEffort } from '../models/ProjectWeeklyEffort';
import { ProjectWeeklyMetrics } from '../models/ProjectWeeklyMetrics';

dotenv.config();

const MONGODB_URI = process.env.MONGODB_URI || "mongodb+srv://sivakumar_db_user:SivaCluster29@timesheet-management-cl.hnjw4hb.mongodb.net/project-management-clean?retryWrites=true&w=majority&appName=timesheet-management-cluster";

/**
 * Escape CSV field value
 */
function escapeCsvField(value: any): string {
  if (value === null || value === undefined) return '';
  const str = String(value);
  // If contains comma, quote, or newline, wrap in quotes and escape quotes
  if (str.includes(',') || str.includes('"') || str.includes('\n') || str.includes('\r')) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

/**
 * Format date for CSV
 */
function formatDate(date: Date | string | undefined): string {
  if (!date) return '';
  const d = typeof date === 'string' ? new Date(date) : date;
  return d.toISOString();
}

async function exportSeededDataToCsv() {
  try {
    console.log('='.repeat(70));
    console.log('EXPORTING SEEDED DATA TO CSV');
    console.log('='.repeat(70));
    console.log();

    // Connect to MongoDB
    console.log('📡 Connecting to MongoDB...');
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Connected to MongoDB\n');

    const outputLines: string[] = [];
    
    // Add header
    outputLines.push('='.repeat(70));
    outputLines.push('AI SAMPLE PROJECT - COMPLETE SEEDED DATA EXPORT');
    outputLines.push(`Generated: ${new Date().toISOString()}`);
    outputLines.push('='.repeat(70));
    outputLines.push('');

    // ============================================================
    // USERS
    // ============================================================
    console.log('👥 Exporting Users...');
    const users = await User.find({}).lean();
    
    outputLines.push('');
    outputLines.push('### USERS ###');
    outputLines.push('ID,Name,Email,Role,Is Active,Email Verified,Created At,Updated At');
    
    users.forEach((user: any) => {
      const row = [
        user._id,
        user.name,
        user.email,
        user.role,
        user.is_active,
        user.email_verified,
        formatDate(user.createdAt),
        formatDate(user.updatedAt),
      ].map(escapeCsvField).join(',');
      outputLines.push(row);
    });
    console.log(`   ✓ Exported ${users.length} users`);

    // ============================================================
    // CUSTOMERS
    // ============================================================
    console.log('🏢 Exporting Customers...');
    const customers = await Customer.find({}).populate('created_by', 'name email').lean();
    
    outputLines.push('');
    outputLines.push('### CUSTOMERS ###');
    outputLines.push('ID,Customer Name,Email,Contact Info,Created By,Is Deleted,Last Modified Date,Created At,Updated At');
    
    customers.forEach((customer: any) => {
      const createdBy = (customer.created_by as any)?.name || customer.created_by;
      const row = [
        customer._id,
        customer.customer_name,
        customer.email,
        customer.contact_info || '',
        createdBy,
        customer.is_deleted,
        formatDate(customer.last_modified_date),
        formatDate(customer.createdAt),
        formatDate(customer.updatedAt),
      ].map(escapeCsvField).join(',');
      outputLines.push(row);
    });
    console.log(`   ✓ Exported ${customers.length} customers`);

    // ============================================================
    // RESOURCES
    // ============================================================
    console.log('👨‍💻 Exporting Resources...');
    const resources = await Resource.find({}).populate('last_modified_by', 'name email').lean();
    
    outputLines.push('');
    outputLines.push('### RESOURCES ###');
    outputLines.push('ID,Resource Name,Email,Status,Per Hour Rate,Currency,Last Modified By,Last Modified Date,Created At,Updated At');
    
    resources.forEach((resource: any) => {
      const modifiedBy = (resource.last_modified_by as any)?.name || resource.last_modified_by;
      const row = [
        resource._id,
        resource.resource_name,
        resource.email,
        resource.status,
        resource.per_hour_rate,
        resource.currency,
        modifiedBy,
        formatDate(resource.last_modified_date),
        formatDate(resource.createdAt),
        formatDate(resource.updatedAt),
      ].map(escapeCsvField).join(',');
      outputLines.push(row);
    });
    console.log(`   ✓ Exported ${resources.length} resources`);

    // ============================================================
    // PROJECTS
    // ============================================================
    console.log('📁 Exporting Projects...');
    const projects = await Project.find({})
      .populate('assigned_manager', 'name email')
      .populate('customer', 'customer_name')
      .populate('resources', 'resource_name email')
      .lean();
    
    outputLines.push('');
    outputLines.push('### PROJECTS ###');
    outputLines.push('ID,Project Name,Start Date,End Date,Project Type,Estimated Effort,Estimated Budget,Estimated Resources,Scope Completed,Overall Status,Assigned Manager,Customer,Project Status,Hourly Rate,Hourly Rate Source,Estimation,Scope Estimation,Resources (Count),Tracking By,Scope Status,Quality Status,Budget Status,Is Deleted,Last Modified Date,Created At,Updated At');
    
    projects.forEach((project: any) => {
      const manager = (project.assigned_manager as any)?.name || project.assigned_manager;
      const customer = (project.customer as any)?.customer_name || project.customer;
      const resourceCount = Array.isArray(project.resources) ? project.resources.length : 0;
      
      const row = [
        project._id,
        project.project_name,
        formatDate(project.start_date),
        formatDate(project.end_date),
        project.project_type,
        project.estimated_effort,
        project.estimated_budget,
        project.estimated_resources,
        project.scope_completed,
        project.overall_status,
        manager,
        customer,
        project.project_status,
        project.hourly_rate || '',
        project.hourly_rate_source,
        project.estimation || '',
        project.scope_estimation || '',
        resourceCount,
        project.tracking_by || '',
        project.scope_status,
        project.quality_status,
        project.budget_status,
        project.is_deleted,
        formatDate(project.last_modified_date),
        formatDate(project.createdAt),
        formatDate(project.updatedAt),
      ].map(escapeCsvField).join(',');
      outputLines.push(row);
    });
    console.log(`   ✓ Exported ${projects.length} projects`);

    // ============================================================
    // PROJECT WEEKLY EFFORTS
    // ============================================================
    console.log('📊 Exporting Project Weekly Efforts...');
    const aiProject = await Project.findOne({ project_name: 'AI Sample Project' }).lean();
    
    if (aiProject) {
      const efforts = await ProjectWeeklyEffort.find({ project: aiProject._id })
        .populate('resource', 'resource_name email')
        .populate('last_modified_by', 'name email')
        .sort({ week_start_date: 1 })
        .lean();
      
      outputLines.push('');
      outputLines.push('### PROJECT WEEKLY EFFORTS (AI Sample Project) ###');
      outputLines.push('ID,Project ID,Resource Name,Resource Email,Hours,Week Start Date,Week End Date,Last Modified By,Last Modified Date,Created At,Updated At');
      
      efforts.forEach((effort: any) => {
        const resource = effort.resource as any;
        const modifiedBy = (effort.last_modified_by as any)?.name || effort.last_modified_by;
        
        const row = [
          effort._id,
          effort.project,
          resource?.resource_name || '',
          resource?.email || '',
          effort.hours,
          formatDate(effort.week_start_date),
          formatDate(effort.week_end_date),
          modifiedBy,
          formatDate(effort.last_modified_date),
          formatDate(effort.createdAt),
          formatDate(effort.updatedAt),
        ].map(escapeCsvField).join(',');
        outputLines.push(row);
      });
      console.log(`   ✓ Exported ${efforts.length} weekly effort entries`);

      // ============================================================
      // PROJECT WEEKLY METRICS
      // ============================================================
      console.log('📈 Exporting Project Weekly Metrics...');
      const metrics = await ProjectWeeklyMetrics.find({ project: aiProject._id })
        .populate('last_modified_by', 'name email')
        .sort({ week_start_date: 1 })
        .lean();
      
      outputLines.push('');
      outputLines.push('### PROJECT WEEKLY METRICS (AI Sample Project) ###');
      outputLines.push('ID,Project ID,Week Start Date,Week End Date,Rollup Hours,Scope Completed,Comments,Last Modified By,Last Modified Date,Created At,Updated At');
      
      metrics.forEach((metric: any) => {
        const modifiedBy = (metric.last_modified_by as any)?.name || metric.last_modified_by;
        
        const row = [
          metric._id,
          metric.project,
          formatDate(metric.week_start_date),
          formatDate(metric.week_end_date),
          metric.rollup_hours,
          metric.scope_completed,
          metric.comments || '',
          modifiedBy,
          formatDate(metric.last_modified_date),
          formatDate(metric.createdAt),
          formatDate(metric.updatedAt),
        ].map(escapeCsvField).join(',');
        outputLines.push(row);
      });
      console.log(`   ✓ Exported ${metrics.length} weekly metrics entries`);

      // ============================================================
      // SUMMARY STATISTICS
      // ============================================================
      outputLines.push('');
      outputLines.push('### SUMMARY STATISTICS ###');
      outputLines.push('');
      outputLines.push('Entity,Count');
      outputLines.push(`Users,${users.length}`);
      outputLines.push(`Customers,${customers.length}`);
      outputLines.push(`Resources,${resources.length}`);
      outputLines.push(`Projects,${projects.length}`);
      outputLines.push(`Weekly Efforts,${efforts.length}`);
      outputLines.push(`Weekly Metrics,${metrics.length}`);
      
      outputLines.push('');
      outputLines.push('### AI SAMPLE PROJECT STATISTICS ###');
      outputLines.push('');
      outputLines.push('Metric,Value');
      outputLines.push(`Project Name,${aiProject.project_name}`);
      outputLines.push(`Start Date,${formatDate(aiProject.start_date)}`);
      outputLines.push(`End Date,${formatDate(aiProject.end_date)}`);
      outputLines.push(`Estimated Effort (hours),${aiProject.estimated_effort}`);
      outputLines.push(`Estimated Budget ($),${aiProject.estimated_budget}`);
      outputLines.push(`Hourly Rate ($),${aiProject.hourly_rate}`);
      outputLines.push(`Hourly Rate Source,${aiProject.hourly_rate_source}`);
      outputLines.push(`Current Scope Completed (%),${aiProject.scope_completed}`);
      outputLines.push(`Overall Status,${aiProject.overall_status}`);
      
      const totalActualHours = efforts.reduce((sum: number, e: any) => sum + e.hours, 0);
      const totalPlannedHours = 12 * 40 * 3;
      const utilizationRate = ((totalActualHours / totalPlannedHours) * 100).toFixed(1);
      
      outputLines.push(`Planned Hours (12 weeks),${totalPlannedHours}`);
      outputLines.push(`Actual Hours Logged,${totalActualHours}`);
      outputLines.push(`Utilization Rate (%),${utilizationRate}`);
      outputLines.push(`Variance (hours),${totalActualHours - totalPlannedHours}`);
    } else {
      console.log('   ⚠️  AI Sample Project not found');
    }

    outputLines.push('');
    outputLines.push('='.repeat(70));
    outputLines.push('END OF EXPORT');
    outputLines.push('='.repeat(70));

    // Write to file
    const outputDir = path.join(__dirname, '..', '..', 'exports');
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }

    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5);
    const filename = `ai-sample-project-seeded-data-${timestamp}.csv`;
    const filepath = path.join(outputDir, filename);

    fs.writeFileSync(filepath, outputLines.join('\n'), 'utf-8');

    console.log();
    console.log('='.repeat(70));
    console.log('✅ EXPORT COMPLETED SUCCESSFULLY');
    console.log('='.repeat(70));
    console.log();
    console.log(`📄 File: ${filename}`);
    console.log(`📁 Location: ${filepath}`);
    console.log(`📏 Size: ${(fs.statSync(filepath).size / 1024).toFixed(2)} KB`);
    console.log(`📊 Total Lines: ${outputLines.length}`);
    console.log();

  } catch (error) {
    console.error('❌ Error exporting data:', error);
    throw error;
  } finally {
    await mongoose.disconnect();
    console.log('📡 Disconnected from MongoDB');
  }
}

// Run the export script
exportSeededDataToCsv()
  .then(() => {
    console.log('✅ Script completed successfully');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Script failed:', error);
    process.exit(1);
  });
