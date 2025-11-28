import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { User } from './models/User';
import { Customer } from './models/Customer';
import { Resource } from './models/Resource';
import { Project } from './models/Project';
import { ProjectWeeklyEffort } from './models/ProjectWeeklyEffort';
import { ProjectWeeklyMetrics } from './models/ProjectWeeklyMetrics';
import {
  UserRole,
  ResourceStatus,
  ProjectType,
  RAGStatus,
  Currency,
  ProjectTrackingBy,
  ProjectStatus,
  HourlyRateSource,
} from './types';

dotenv.config();

const MONGODB_URI = "mongodb+srv://sivakumar_db_user:SivaCluster29@timesheet-management-cl.hnjw4hb.mongodb.net/project-management-clean?retryWrites=true&w=majority&appName=timesheet-management-cluster";

/**
 * Get week start (Monday) and end (Sunday) dates
 * Current week: Nov 24, 2025 (Monday) - Nov 30, 2025 (Sunday)
 */
function getWeekDates(weeksAgo: number = 0): { start: Date; end: Date } {
  // Today is Thursday, November 27, 2025
  // Current week starts on Monday, November 24, 2025
  const currentWeekStart = new Date('2025-11-24');
  
  const start = new Date(currentWeekStart);
  start.setDate(start.getDate() - (weeksAgo * 7));
  start.setUTCHours(0, 0, 0, 0);

  const end = new Date(start);
  end.setDate(end.getDate() + 6); // Sunday
  end.setUTCHours(23, 59, 59, 999);

  return { start, end };
}

/**
 * Format date for display
 */
function formatDate(date: Date): string {
  return date.toISOString().split('T')[0];
}

async function seedDatabase() {
  try {
    console.log('='.repeat(60));
    console.log('COMPREHENSIVE DATABASE SEEDING');
    console.log('Date: November 27, 2025 (Thursday)');
    console.log('Current Week: Nov 24 (Mon) - Nov 30 (Sun), 2025');
    console.log('='.repeat(60));
    console.log();

    // Connect to MongoDB
    console.log('📡 Connecting to MongoDB...');
    console.log(`   URI: ${MONGODB_URI.replace(/\/\/([^:]+):([^@]+)@/, '//$1:***@')}`);
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Connected to MongoDB\n');

    // Clear existing data
    console.log('🗑️  Clearing existing data...');
    const collections = [
      { name: 'Users', model: User },
      { name: 'Customers', model: Customer },
      { name: 'Resources', model: Resource },
      { name: 'Projects', model: Project },
      { name: 'Weekly Efforts', model: ProjectWeeklyEffort },
      { name: 'Weekly Metrics', model: ProjectWeeklyMetrics },
    ];

    for (const { name, model } of collections) {
      const count = await model.countDocuments();
      await (model as any).deleteMany({});
      console.log(`   Deleted ${count} ${name}`);
    }
    console.log('✅ Database cleared\n');

    // ============================================================
    // CREATE USERS
    // ============================================================
    console.log('👥 Creating Users...');
    
    const adminUser = await User.create({
      name: 'Admin User',
      email: 'admin@example.com',
      password: 'Admin@123',
      role: UserRole.ADMIN,
      is_active: true,
      email_verified: true,
    });
    console.log('   ✓ Admin User (admin@example.com)');

    await User.create({
      name: 'Robert CEO',
      email: 'ceo@example.com',
      password: 'Ceo@1234',
      role: UserRole.CEO,
      is_active: true,
      email_verified: true,
    });
    console.log('   ✓ CEO User (ceo@example.com)');

    const manager1 = await User.create({
      name: 'John Manager',
      email: 'john@example.com',
      password: 'Manager@123',
      role: UserRole.MANAGER,
      is_active: true,
      email_verified: true,
    });
    console.log('   ✓ Manager 1 - John (john@example.com)');

    const manager2 = await User.create({
      name: 'Sarah Manager',
      email: 'sarah@example.com',
      password: 'Manager@123',
      role: UserRole.MANAGER,
      is_active: true,
      email_verified: true,
    });
    console.log('   ✓ Manager 2 - Sarah (sarah@example.com)');

    const manager3 = await User.create({
      name: 'Michael Manager',
      email: 'michael@example.com',
      password: 'Manager@123',
      role: UserRole.MANAGER,
      is_active: true,
      email_verified: true,
    });
    console.log('   ✓ Manager 3 - Michael (michael@example.com)');

    console.log(`✅ Created ${await User.countDocuments()} Users\n`);

    // ============================================================
    // CREATE CUSTOMERS
    // ============================================================
    console.log('🏢 Creating Customers...');

    const customer1 = await Customer.create({
      customer_name: 'Acme Corporation',
      email: 'contact@acme.com',
      contact_info: 'Phone: +1-555-0101, Address: 123 Business St, New York, NY 10001',
      created_by: adminUser._id,
      last_modified_by: adminUser._id,
    });
    console.log('   ✓ Acme Corporation');

    const customer2 = await Customer.create({
      customer_name: 'TechStart Inc',
      email: 'info@techstart.com',
      contact_info: 'Phone: +1-555-0202, Address: 456 Innovation Ave, San Francisco, CA 94102',
      created_by: adminUser._id,
      last_modified_by: adminUser._id,
    });
    console.log('   ✓ TechStart Inc');

    const customer3 = await Customer.create({
      customer_name: 'Global Solutions Ltd',
      email: 'hello@globalsolutions.com',
      contact_info: 'Phone: +44-20-1234-5678, Address: 789 Corporate Blvd, London, UK',
      created_by: adminUser._id,
      last_modified_by: adminUser._id,
    });
    console.log('   ✓ Global Solutions Ltd');

    const customer4 = await Customer.create({
      customer_name: 'FinTech Innovations',
      email: 'support@fintech-innovations.com',
      contact_info: 'Phone: +1-555-0303, Address: 321 Finance Plaza, Chicago, IL 60601',
      created_by: adminUser._id,
      last_modified_by: adminUser._id,
    });
    console.log('   ✓ FinTech Innovations');

    console.log(`✅ Created ${await Customer.countDocuments()} Customers\n`);

    // ============================================================
    // CREATE RESOURCES
    // ============================================================
    console.log('👨‍💻 Creating Resources...');

    const resource1 = await Resource.create({
      resource_name: 'Alice Johnson',
      email: 'alice.johnson@company.com',
      status: ResourceStatus.ACTIVE,
      per_hour_rate: 85,
      currency: Currency.USD,
      last_modified_by: adminUser._id,
    });
    console.log('   ✓ Alice Johnson ($85/hr)');

    const resource2 = await Resource.create({
      resource_name: 'Bob Smith',
      email: 'bob.smith@company.com',
      status: ResourceStatus.ACTIVE,
      per_hour_rate: 75,
      currency: Currency.USD,
      last_modified_by: adminUser._id,
    });
    console.log('   ✓ Bob Smith ($75/hr)');

    const resource3 = await Resource.create({
      resource_name: 'Charlie Brown',
      email: 'charlie.brown@company.com',
      status: ResourceStatus.ACTIVE,
      per_hour_rate: 90,
      currency: Currency.USD,
      last_modified_by: adminUser._id,
    });
    console.log('   ✓ Charlie Brown ($90/hr)');

    const resource4 = await Resource.create({
      resource_name: 'Diana Prince',
      email: 'diana.prince@company.com',
      status: ResourceStatus.ACTIVE,
      per_hour_rate: 95,
      currency: Currency.USD,
      last_modified_by: adminUser._id,
    });
    console.log('   ✓ Diana Prince ($95/hr)');

    const resource5 = await Resource.create({
      resource_name: 'Ethan Hunt',
      email: 'ethan.hunt@company.com',
      status: ResourceStatus.ACTIVE,
      per_hour_rate: 80,
      currency: Currency.USD,
      last_modified_by: adminUser._id,
    });
    console.log('   ✓ Ethan Hunt ($80/hr)');

    const resource6 = await Resource.create({
      resource_name: 'Fiona Green',
      email: 'fiona.green@company.com',
      status: ResourceStatus.ACTIVE,
      per_hour_rate: 70,
      currency: Currency.USD,
      last_modified_by: adminUser._id,
    });
    console.log('   ✓ Fiona Green ($70/hr)');

    await Resource.create({
      resource_name: 'George Wilson',
      email: 'george.wilson@company.com',
      status: ResourceStatus.INACTIVE,
      per_hour_rate: 65,
      currency: Currency.USD,
      last_modified_by: adminUser._id,
    });
    console.log('   ✓ George Wilson ($65/hr - INACTIVE)');

    console.log(`✅ Created ${await Resource.countDocuments()} Resources\n`);

    // ============================================================
    // CREATE PROJECTS
    // ============================================================
    console.log('📁 Creating Projects...');

    // Project 1: E-commerce Platform (Active, Resource-based rates, On Track)
    const project1 = await Project.create({
      project_name: 'E-commerce Platform Development',
      start_date: new Date('2025-01-15'),
      end_date: new Date('2025-12-31'),
      project_type: ProjectType.FIXED_PRICE,
      estimated_effort: 2000,
      estimated_budget: 180000,
      estimated_resources: 5,
      scope_completed: 35,
      overall_status: RAGStatus.GREEN,
      assigned_manager: manager1._id,
      resources: [resource1._id, resource2._id, resource3._id],
      tracking_by: ProjectTrackingBy.MILESTONE,
      scope_status: RAGStatus.GREEN,
      quality_status: RAGStatus.GREEN,
      budget_status: RAGStatus.GREEN,
      customer: customer1._id,
      project_status: ProjectStatus.ACTIVE,
      hourly_rate_source: HourlyRateSource.RESOURCE,
      last_modified_by: manager1._id,
      milestones: [
        {
          description: 'Requirements & Design Phase',
          estimated_date: new Date('2025-03-15'),
          estimated_effort: 300,
          scope_completed: 100,
          completed_date: new Date('2025-03-10'),
        },
        {
          description: 'Backend API Development',
          estimated_date: new Date('2025-06-30'),
          estimated_effort: 600,
          scope_completed: 60,
        },
        {
          description: 'Frontend Development',
          estimated_date: new Date('2025-09-30'),
          estimated_effort: 700,
          scope_completed: 20,
        },
        {
          description: 'Testing & QA',
          estimated_date: new Date('2025-11-30'),
          estimated_effort: 250,
          scope_completed: 0,
        },
        {
          description: 'Deployment & Go-Live',
          estimated_date: new Date('2025-12-31'),
          estimated_effort: 150,
          scope_completed: 0,
        },
      ],
    });
    console.log('   ✓ E-commerce Platform (Green, Resource-based rates)');

    // Project 2: Mobile Banking App (Active, Project-based rate, At Risk)
    const project2 = await Project.create({
      project_name: 'Mobile Banking App',
      start_date: new Date('2025-03-01'),
      end_date: new Date('2026-03-31'),
      project_type: ProjectType.TIME_MATERIAL,
      estimated_effort: 1500,
      estimated_budget: 180000,
      estimated_resources: 4,
      scope_completed: 25,
      overall_status: RAGStatus.AMBER,
      assigned_manager: manager2._id,
      resources: [resource2._id, resource4._id, resource5._id],
      tracking_by: ProjectTrackingBy.ENDDATE,
      scope_status: RAGStatus.AMBER,
      quality_status: RAGStatus.GREEN,
      budget_status: RAGStatus.AMBER,
      customer: customer2._id,
      project_status: ProjectStatus.ACTIVE,
      hourly_rate: 120,
      hourly_rate_source: HourlyRateSource.PROJECT,
      last_modified_by: manager2._id,
      milestones: [],
    });
    console.log('   ✓ Mobile Banking App (Amber, $120/hr project rate)');

    // Project 3: Enterprise CRM System (Active, Org rate, Critical)
    const project3 = await Project.create({
      project_name: 'Enterprise CRM System',
      start_date: new Date('2025-02-01'),
      end_date: new Date('2025-12-31'),
      project_type: ProjectType.FIXED_PRICE,
      estimated_effort: 1800,
      estimated_budget: 90000,
      estimated_resources: 6,
      scope_completed: 40,
      overall_status: RAGStatus.RED,
      assigned_manager: manager1._id,
      resources: [resource1._id, resource3._id, resource5._id, resource6._id],
      tracking_by: ProjectTrackingBy.MILESTONE,
      scope_status: RAGStatus.RED,
      quality_status: RAGStatus.AMBER,
      budget_status: RAGStatus.RED,
      customer: customer1._id,
      project_status: ProjectStatus.ACTIVE,
      hourly_rate_source: HourlyRateSource.ORGANIZATION,
      last_modified_by: manager1._id,
      milestones: [
        {
          description: 'Discovery & Planning',
          estimated_date: new Date('2025-03-15'),
          estimated_effort: 200,
          scope_completed: 100,
          completed_date: new Date('2025-03-12'),
        },
        {
          description: 'Core Module Development',
          estimated_date: new Date('2025-07-31'),
          estimated_effort: 800,
          scope_completed: 55,
        },
        {
          description: 'Integration & Testing',
          estimated_date: new Date('2025-11-15'),
          estimated_effort: 500,
          scope_completed: 15,
        },
        {
          description: 'User Training & Deployment',
          estimated_date: new Date('2025-12-31'),
          estimated_effort: 300,
          scope_completed: 0,
        },
      ],
    });
    console.log('   ✓ Enterprise CRM System (Red, Org rate)');

    // Project 4: Data Analytics Dashboard (Completed)
    await Project.create({
      project_name: 'Data Analytics Dashboard',
      start_date: new Date('2024-09-01'),
      end_date: new Date('2025-03-31'),
      project_type: ProjectType.TIME_MATERIAL,
      estimated_effort: 800,
      estimated_budget: 72000,
      estimated_resources: 3,
      scope_completed: 100,
      overall_status: RAGStatus.GREEN,
      assigned_manager: manager2._id,
      resources: [resource2._id, resource4._id],
      tracking_by: ProjectTrackingBy.ENDDATE,
      scope_status: RAGStatus.GREEN,
      quality_status: RAGStatus.GREEN,
      budget_status: RAGStatus.GREEN,
      customer: customer2._id,
      project_status: ProjectStatus.COMPLETED,
      hourly_rate_source: HourlyRateSource.RESOURCE,
      last_modified_by: manager2._id,
      milestones: [],
    });
    console.log('   ✓ Data Analytics Dashboard (Completed)');

    // Project 5: Cloud Migration (Starting Soon)
    const project5 = await Project.create({
      project_name: 'Cloud Infrastructure Migration',
      start_date: new Date('2025-11-01'),
      end_date: new Date('2026-08-31'),
      project_type: ProjectType.FIXED_PRICE,
      estimated_effort: 1200,
      estimated_budget: 144000,
      estimated_resources: 4,
      scope_completed: 10,
      overall_status: RAGStatus.GREEN,
      assigned_manager: manager3._id,
      resources: [resource4._id, resource5._id, resource6._id],
      tracking_by: ProjectTrackingBy.MILESTONE,
      scope_status: RAGStatus.GREEN,
      quality_status: RAGStatus.GREEN,
      budget_status: RAGStatus.GREEN,
      customer: customer3._id,
      project_status: ProjectStatus.ACTIVE,
      hourly_rate: 120,
      hourly_rate_source: HourlyRateSource.PROJECT,
      last_modified_by: manager3._id,
      milestones: [
        {
          description: 'Assessment & Planning',
          estimated_date: new Date('2026-01-15'),
          estimated_effort: 150,
          scope_completed: 30,
        },
        {
          description: 'Infrastructure Setup',
          estimated_date: new Date('2026-03-31'),
          estimated_effort: 300,
          scope_completed: 5,
        },
        {
          description: 'Migration Execution',
          estimated_date: new Date('2026-06-30'),
          estimated_effort: 500,
          scope_completed: 0,
        },
        {
          description: 'Optimization & Handover',
          estimated_date: new Date('2026-08-31'),
          estimated_effort: 250,
          scope_completed: 0,
        },
      ],
    });
    console.log('   ✓ Cloud Infrastructure Migration (New, $120/hr)');

    // Project 6: API Integration Platform
    const project6 = await Project.create({
      project_name: 'API Integration Platform',
      start_date: new Date('2025-06-01'),
      end_date: new Date('2026-02-28'),
      project_type: ProjectType.TIME_MATERIAL,
      estimated_effort: 1000,
      estimated_budget: 85000,
      estimated_resources: 3,
      scope_completed: 45,
      overall_status: RAGStatus.GREEN,
      assigned_manager: manager2._id,
      resources: [resource1._id, resource3._id, resource6._id],
      tracking_by: ProjectTrackingBy.ENDDATE,
      scope_status: RAGStatus.GREEN,
      quality_status: RAGStatus.GREEN,
      budget_status: RAGStatus.GREEN,
      customer: customer4._id,
      project_status: ProjectStatus.ACTIVE,
      hourly_rate_source: HourlyRateSource.RESOURCE,
      last_modified_by: manager2._id,
      milestones: [],
    });
    console.log('   ✓ API Integration Platform (Green, Resource rates)');

    console.log(`✅ Created ${await Project.countDocuments()} Projects\n`);

    // ============================================================
    // CREATE WEEKLY EFFORT RECORDS
    // ============================================================
    console.log('📊 Creating Weekly Effort Records...');
    console.log('   Generating data for last 12 weeks...\n');

    const weeklyEfforts = [];

    // Generate effort data for the last 12 weeks (including current week)
    for (let weekOffset = 11; weekOffset >= 0; weekOffset--) {
      const { start, end } = getWeekDates(weekOffset);
      const isCurrentWeek = weekOffset === 0;
      
      console.log(`   Week ${12 - weekOffset}/12: ${formatDate(start)} to ${formatDate(end)}${isCurrentWeek ? ' (CURRENT WEEK)' : ''}`);

      // Project 1: E-commerce Platform (3 resources)
      weeklyEfforts.push({
        project: project1._id,
        resource: resource1._id,
        hours: 32 + Math.floor(Math.random() * 8),
        week_start_date: start,
        week_end_date: end,
        last_modified_by: manager1._id,
      });

      weeklyEfforts.push({
        project: project1._id,
        resource: resource2._id,
        hours: 35 + Math.floor(Math.random() * 5),
        week_start_date: start,
        week_end_date: end,
        last_modified_by: manager1._id,
      });

      weeklyEfforts.push({
        project: project1._id,
        resource: resource3._id,
        hours: 30 + Math.floor(Math.random() * 10),
        week_start_date: start,
        week_end_date: end,
        last_modified_by: manager1._id,
      });

      // Project 2: Mobile Banking App (3 resources)
      weeklyEfforts.push({
        project: project2._id,
        resource: resource2._id,
        hours: 5 + Math.floor(Math.random() * 10),
        week_start_date: start,
        week_end_date: end,
        last_modified_by: manager2._id,
      });

      weeklyEfforts.push({
        project: project2._id,
        resource: resource4._id,
        hours: 28 + Math.floor(Math.random() * 12),
        week_start_date: start,
        week_end_date: end,
        last_modified_by: manager2._id,
      });

      weeklyEfforts.push({
        project: project2._id,
        resource: resource5._id,
        hours: 20 + Math.floor(Math.random() * 15),
        week_start_date: start,
        week_end_date: end,
        last_modified_by: manager2._id,
      });

      // Project 3: Enterprise CRM (4 resources)
      weeklyEfforts.push({
        project: project3._id,
        resource: resource1._id,
        hours: 5 + Math.floor(Math.random() * 10),
        week_start_date: start,
        week_end_date: end,
        last_modified_by: manager1._id,
      });

      weeklyEfforts.push({
        project: project3._id,
        resource: resource3._id,
        hours: 10 + Math.floor(Math.random() * 8),
        week_start_date: start,
        week_end_date: end,
        last_modified_by: manager1._id,
      });

      weeklyEfforts.push({
        project: project3._id,
        resource: resource5._id,
        hours: 15 + Math.floor(Math.random() * 10),
        week_start_date: start,
        week_end_date: end,
        last_modified_by: manager1._id,
      });

      weeklyEfforts.push({
        project: project3._id,
        resource: resource6._id,
        hours: 25 + Math.floor(Math.random() * 15),
        week_start_date: start,
        week_end_date: end,
        last_modified_by: manager1._id,
      });

      // Project 5: Cloud Migration (only last 4 weeks as it just started)
      if (weekOffset <= 3) {
        weeklyEfforts.push({
          project: project5._id,
          resource: resource4._id,
          hours: 20 + Math.floor(Math.random() * 10),
          week_start_date: start,
          week_end_date: end,
          last_modified_by: manager3._id,
        });

        weeklyEfforts.push({
          project: project5._id,
          resource: resource5._id,
          hours: 15 + Math.floor(Math.random() * 10),
          week_start_date: start,
          week_end_date: end,
          last_modified_by: manager3._id,
        });

        weeklyEfforts.push({
          project: project5._id,
          resource: resource6._id,
          hours: 18 + Math.floor(Math.random() * 12),
          week_start_date: start,
          week_end_date: end,
          last_modified_by: manager3._id,
        });
      }

      // Project 6: API Integration (last 8 weeks)
      if (weekOffset <= 7) {
        weeklyEfforts.push({
          project: project6._id,
          resource: resource1._id,
          hours: 8 + Math.floor(Math.random() * 10),
          week_start_date: start,
          week_end_date: end,
          last_modified_by: manager2._id,
        });

        weeklyEfforts.push({
          project: project6._id,
          resource: resource3._id,
          hours: 25 + Math.floor(Math.random() * 15),
          week_start_date: start,
          week_end_date: end,
          last_modified_by: manager2._id,
        });

        weeklyEfforts.push({
          project: project6._id,
          resource: resource6._id,
          hours: 22 + Math.floor(Math.random() * 10),
          week_start_date: start,
          week_end_date: end,
          last_modified_by: manager2._id,
        });
      }
    }

    await ProjectWeeklyEffort.insertMany(weeklyEfforts);
    console.log(`\n✅ Created ${weeklyEfforts.length} Weekly Effort Records\n`);

    // ============================================================
    // CREATE WEEKLY METRICS
    // ============================================================
    console.log('📈 Creating Weekly Metrics...');

    const weeklyMetrics = [];

    // Generate metrics for the last 12 weeks
    for (let weekOffset = 11; weekOffset >= 0; weekOffset--) {
      const { start, end } = getWeekDates(weekOffset);

      // Calculate rollup hours for each project for this week
      const project1Hours = weeklyEfforts
        .filter(e => 
          e.project.toString() === project1._id.toString() &&
          e.week_start_date.getTime() === start.getTime()
        )
        .reduce((sum, e) => sum + e.hours, 0);

      const project2Hours = weeklyEfforts
        .filter(e => 
          e.project.toString() === project2._id.toString() &&
          e.week_start_date.getTime() === start.getTime()
        )
        .reduce((sum, e) => sum + e.hours, 0);

      const project3Hours = weeklyEfforts
        .filter(e => 
          e.project.toString() === project3._id.toString() &&
          e.week_start_date.getTime() === start.getTime()
        )
        .reduce((sum, e) => sum + e.hours, 0);

      const project5Hours = weeklyEfforts
        .filter(e => 
          e.project.toString() === project5._id.toString() &&
          e.week_start_date.getTime() === start.getTime()
        )
        .reduce((sum, e) => sum + e.hours, 0);

      const project6Hours = weeklyEfforts
        .filter(e => 
          e.project.toString() === project6._id.toString() &&
          e.week_start_date.getTime() === start.getTime()
        )
        .reduce((sum, e) => sum + e.hours, 0);

      // Add metrics for projects with activity this week
      if (project1Hours > 0) {
        weeklyMetrics.push({
          project: project1._id,
          week_start_date: start,
          week_end_date: end,
          rollup_hours: project1Hours,
          scope_completed: Math.min(35, 15 + (11 - weekOffset) * 2),
          comments: 'Good progress on backend and frontend development',
          last_modified_by: manager1._id,
        });
      }

      if (project2Hours > 0) {
        weeklyMetrics.push({
          project: project2._id,
          week_start_date: start,
          week_end_date: end,
          rollup_hours: project2Hours,
          scope_completed: Math.min(25, 5 + (11 - weekOffset) * 1.8),
          comments: 'Mobile UI challenges, some delays in API integration',
          last_modified_by: manager2._id,
        });
      }

      if (project3Hours > 0) {
        weeklyMetrics.push({
          project: project3._id,
          week_start_date: start,
          week_end_date: end,
          rollup_hours: project3Hours,
          scope_completed: Math.min(40, 10 + (11 - weekOffset) * 2.5),
          comments: 'Facing technical challenges, budget concerns',
          last_modified_by: manager1._id,
        });
      }

      if (project5Hours > 0) {
        weeklyMetrics.push({
          project: project5._id,
          week_start_date: start,
          week_end_date: end,
          rollup_hours: project5Hours,
          scope_completed: Math.min(10, (4 - weekOffset) * 2.5),
          comments: 'Initial planning and assessment phase',
          last_modified_by: manager3._id,
        });
      }

      if (project6Hours > 0) {
        weeklyMetrics.push({
          project: project6._id,
          week_start_date: start,
          week_end_date: end,
          rollup_hours: project6Hours,
          scope_completed: Math.min(45, 10 + (8 - weekOffset) * 4.5),
          comments: 'API integrations on track, good quality',
          last_modified_by: manager2._id,
        });
      }
    }

    await ProjectWeeklyMetrics.insertMany(weeklyMetrics);
    console.log(`✅ Created ${weeklyMetrics.length} Weekly Metrics Records\n`);

    // ============================================================
    // SUMMARY
    // ============================================================
    console.log('='.repeat(60));
    console.log('✨ SEEDING COMPLETE ✨');
    console.log('='.repeat(60));
    console.log();
    console.log('📊 Database Summary:');
    console.log(`   • Users: ${await User.countDocuments()}`);
    console.log(`   • Customers: ${await Customer.countDocuments()}`);
    console.log(`   • Resources: ${await Resource.countDocuments()}`);
    console.log(`   • Projects: ${await Project.countDocuments()}`);
    console.log(`   • Weekly Efforts: ${await ProjectWeeklyEffort.countDocuments()}`);
    console.log(`   • Weekly Metrics: ${await ProjectWeeklyMetrics.countDocuments()}`);
    console.log();
    console.log('🔐 Test Login Credentials:');
    console.log('   Admin:    admin@example.com     / Admin@123');
    console.log('   CEO:      ceo@example.com       / Ceo@1234');
    console.log('   Manager:  john@example.com      / Manager@123');
    console.log('   Manager:  sarah@example.com     / Manager@123');
    console.log('   Manager:  michael@example.com   / Manager@123');
    console.log();
    console.log('📅 Current Week Info:');
    const { start: currentStart, end: currentEnd } = getWeekDates(0);
    console.log(`   Start: ${formatDate(currentStart)} (Monday)`);
    console.log(`   End:   ${formatDate(currentEnd)} (Sunday)`);
    console.log(`   Today: November 27, 2025 (Thursday)`);
    console.log();
    console.log('💡 Project Hourly Rate Types:');
    console.log('   • E-commerce Platform: RESOURCE rates ($75-$90/hr)');
    console.log('   • Mobile Banking: PROJECT rate ($120/hr)');
    console.log('   • Enterprise CRM: ORGANIZATION rate');
    console.log('   • Cloud Migration: PROJECT rate ($120/hr)');
    console.log('   • API Integration: RESOURCE rates ($70-$90/hr)');
    console.log();

    await mongoose.connection.close();
    console.log('✅ Database connection closed');
    console.log('='.repeat(60));
    process.exit(0);

  } catch (error) {
    console.error('\n❌ ERROR during seeding:', error);
    if (mongoose.connection.readyState === 1) {
      await mongoose.connection.close();
    }
    process.exit(1);
  }
}

// Run the seed function
seedDatabase();
