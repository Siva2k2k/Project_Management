import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { User } from './models/User';
import { Customer } from './models/Customer';
import { Resource } from './models/Resource';
import { Project } from './models/Project';
import { ProjectWeeklyEffort } from './models/ProjectWeeklyEffort';
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

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/pm-dashboard';

// Helper function to get week start and end dates
function getWeekDates(weeksAgo: number): { start: Date; end: Date } {
  const now = new Date();
  const start = new Date(now);
  start.setDate(start.getDate() - start.getDay() - weeksAgo * 7); // Start of week (Sunday)
  start.setHours(0, 0, 0, 0);

  const end = new Date(start);
  end.setDate(end.getDate() + 6); // End of week (Saturday)
  end.setHours(23, 59, 59, 999);

  return { start, end };
}

async function seedDatabase() {
  try {
    console.log('Connecting to MongoDB...');
    await mongoose.connect(MONGODB_URI);
    console.log('Connected to MongoDB');

    // Clear existing data
    console.log('Clearing existing data...');
    await User.deleteMany({});
    await Customer.deleteMany({});
    await Resource.deleteMany({});
    await Project.deleteMany({});
    await ProjectWeeklyEffort.deleteMany({});
    console.log('Existing data cleared');

    // Create Users
    console.log('Creating users...');
    const adminUser = await User.create({
      name: 'Admin User',
      email: 'admin@example.com',
      password: 'Admin@123',
      role: UserRole.ADMIN,
      is_active: true,
    });

    await User.create({
      name: 'CEO User',
      email: 'ceo@example.com',
      password: 'Ceo@1234',
      role: UserRole.CEO,
      is_active: true,
    });

    const manager1 = await User.create({
      name: 'John Manager',
      email: 'john@example.com',
      password: 'Manager@123',
      role: UserRole.MANAGER,
      is_active: true,
    });

    const manager2 = await User.create({
      name: 'Sarah Manager',
      email: 'sarah@example.com',
      password: 'Manager@123',
      role: UserRole.MANAGER,
      is_active: true,
    });

    console.log('Users created successfully');

    // Create Customers
    console.log('Creating customers...');
    const customer1 = await Customer.create({
      customer_name: 'Acme Corporation',
      email: 'contact@acme.com',
      contact_info: 'Phone: +1-555-0101, Address: 123 Business St, New York, NY',
      created_by: adminUser._id,
    });

    const customer2 = await Customer.create({
      customer_name: 'TechStart Inc',
      email: 'info@techstart.com',
      contact_info: 'Phone: +1-555-0202, Address: 456 Innovation Ave, San Francisco, CA',
      created_by: adminUser._id,
    });

    await Customer.create({
      customer_name: 'Global Solutions Ltd',
      email: 'hello@globalsolutions.com',
      contact_info: 'Phone: +44-20-1234-5678, Address: 789 Corporate Blvd, London, UK',
      created_by: adminUser._id,
    });

    console.log('Customers created successfully');

    // Create Resources
    console.log('Creating resources...');
    const resource1 = await Resource.create({
      resource_name: 'Alice Johnson',
      email: 'alice.johnson@company.com',
      status: ResourceStatus.ACTIVE,
      per_hour_rate: 85,
      currency: Currency.USD,
    });

    const resource2 = await Resource.create({
      resource_name: 'Bob Smith',
      email: 'bob.smith@company.com',
      status: ResourceStatus.ACTIVE,
      per_hour_rate: 75,
      currency: Currency.USD,
    });

    const resource3 = await Resource.create({
      resource_name: 'Charlie Brown',
      email: 'charlie.brown@company.com',
      status: ResourceStatus.ACTIVE,
      per_hour_rate: 90,
      currency: Currency.USD,
    });

    const resource4 = await Resource.create({
      resource_name: 'Diana Prince',
      email: 'diana.prince@company.com',
      status: ResourceStatus.ACTIVE,
      per_hour_rate: 95,
      currency: Currency.USD,
    });

    const resource5 = await Resource.create({
      resource_name: 'Ethan Hunt',
      email: 'ethan.hunt@company.com',
      status: ResourceStatus.ACTIVE,
      per_hour_rate: 80,
      currency: Currency.USD,
    });

    await Resource.create({
      resource_name: 'Fiona Green',
      email: 'fiona.green@company.com',
      status: ResourceStatus.INACTIVE,
      per_hour_rate: 70,
      currency: Currency.USD,
    });

    console.log('Resources created successfully');

    // Create Projects
    console.log('Creating projects...');

    // Project 1: E-commerce Platform (Active, On Track)
    const project1 = await Project.create({
      project_name: 'E-commerce Platform Development',
      start_date: new Date('2024-01-15'),
      end_date: new Date('2025-06-30'),
      project_type: ProjectType.FIXED_PRICE,
      estimated_effort: 2000,
      estimated_budget: 180000,
      estimated_resources: 5,
      scope_completed: 45,
      overall_status: RAGStatus.GREEN,
      assigned_manager: manager1._id,
      tracking_by: ProjectTrackingBy.MILESTONE,
      scope_status: RAGStatus.GREEN,
      quality_status: RAGStatus.GREEN,
      budget_status: RAGStatus.GREEN,
      customer: customer1._id,
      project_status: ProjectStatus.ACTIVE,
      hourly_rate_source: HourlyRateSource.RESOURCE,
      milestones: [
        {
          description: 'Requirements & Design Phase',
          estimated_date: new Date('2024-03-15'),
          estimated_effort: 300,
          scope_completed: 100,
          completed_date: new Date('2024-03-10'),
        },
        {
          description: 'Backend API Development',
          estimated_date: new Date('2024-07-15'),
          estimated_effort: 600,
          scope_completed: 80,
        },
        {
          description: 'Frontend Development',
          estimated_date: new Date('2024-11-30'),
          estimated_effort: 700,
          scope_completed: 40,
        },
        {
          description: 'Testing & QA',
          estimated_date: new Date('2025-05-15'),
          estimated_effort: 250,
          scope_completed: 0,
        },
        {
          description: 'Deployment & Go-Live',
          estimated_date: new Date('2025-06-30'),
          estimated_effort: 150,
          scope_completed: 0,
        },
      ],
    });

    // Project 2: Mobile App (Active, At Risk)
    const project2 = await Project.create({
      project_name: 'Mobile Banking App',
      start_date: new Date('2024-03-01'),
      end_date: new Date('2025-03-31'),
      project_type: ProjectType.TIME_MATERIAL,
      estimated_effort: 1500,
      estimated_budget: 135000,
      estimated_resources: 4,
      scope_completed: 35,
      overall_status: RAGStatus.AMBER,
      assigned_manager: manager2._id,
      tracking_by: ProjectTrackingBy.ENDDATE,
      scope_status: RAGStatus.AMBER,
      quality_status: RAGStatus.GREEN,
      budget_status: RAGStatus.AMBER,
      customer: customer2._id,
      project_status: ProjectStatus.ACTIVE,
      hourly_rate: 120,
      hourly_rate_source: HourlyRateSource.PROJECT,
      milestones: [],
    });

    // Project 3: CRM System (Active, Critical)
    const project3 = await Project.create({
      project_name: 'Enterprise CRM System',
      start_date: new Date('2024-02-01'),
      end_date: new Date('2024-12-31'),
      project_type: ProjectType.FIXED_PRICE,
      estimated_effort: 1800,
      estimated_budget: 200000,
      estimated_resources: 6,
      scope_completed: 55,
      overall_status: RAGStatus.RED,
      assigned_manager: manager1._id,
      tracking_by: ProjectTrackingBy.MILESTONE,
      scope_status: RAGStatus.RED,
      quality_status: RAGStatus.AMBER,
      budget_status: RAGStatus.RED,
      customer: customer1._id,
      project_status: ProjectStatus.DEFERRED,
      hourly_rate_source: HourlyRateSource.ORGANIZATION,
      milestones: [
        {
          description: 'Discovery & Planning',
          estimated_date: new Date('2024-03-15'),
          estimated_effort: 200,
          scope_completed: 100,
          completed_date: new Date('2024-03-12'),
        },
        {
          description: 'Core Module Development',
          estimated_date: new Date('2024-07-31'),
          estimated_effort: 800,
          scope_completed: 70,
        },
        {
          description: 'Integration & Testing',
          estimated_date: new Date('2024-11-15'),
          estimated_effort: 500,
          scope_completed: 30,
        },
        {
          description: 'User Training & Deployment',
          estimated_date: new Date('2024-12-31'),
          estimated_effort: 300,
          scope_completed: 0,
        },
      ],
    });

    // Project 4: Data Analytics Dashboard (Recently Completed)
    await Project.create({
      project_name: 'Data Analytics Dashboard',
      start_date: new Date('2023-09-01'),
      end_date: new Date('2024-03-31'),
      project_type: ProjectType.TIME_MATERIAL,
      estimated_effort: 800,
      estimated_budget: 72000,
      estimated_resources: 3,
      scope_completed: 100,
      overall_status: RAGStatus.GREEN,
      assigned_manager: manager2._id,
      tracking_by: ProjectTrackingBy.ENDDATE,
      scope_status: RAGStatus.GREEN,
      quality_status: RAGStatus.GREEN,
      budget_status: RAGStatus.GREEN,
      customer: customer2._id,
      project_status: ProjectStatus.COMPLETED,
      hourly_rate_source: HourlyRateSource.RESOURCE,
      milestones: [],
    });

    // Project 5: Cloud Migration (Starting Soon)
    const project5 = await Project.create({
      project_name: 'Cloud Infrastructure Migration',
      start_date: new Date('2024-12-01'),
      end_date: new Date('2025-08-31'),
      project_type: ProjectType.FIXED_PRICE,
      estimated_effort: 1200,
      estimated_budget: 150000,
      estimated_resources: 4,
      scope_completed: 5,
      overall_status: RAGStatus.GREEN,
      assigned_manager: manager1._id,
      tracking_by: ProjectTrackingBy.MILESTONE,
      scope_status: RAGStatus.GREEN,
      quality_status: RAGStatus.GREEN,
      budget_status: RAGStatus.GREEN,
      customer: customer2._id,
      project_status: ProjectStatus.ACTIVE,
      hourly_rate: 120,
      hourly_rate_source: HourlyRateSource.PROJECT,
      milestones: [
        {
          description: 'Assessment & Planning',
          estimated_date: new Date('2025-01-15'),
          estimated_effort: 150,
          scope_completed: 20,
        },
        {
          description: 'Infrastructure Setup',
          estimated_date: new Date('2025-03-31'),
          estimated_effort: 300,
          scope_completed: 0,
        },
        {
          description: 'Migration Execution',
          estimated_date: new Date('2025-06-30'),
          estimated_effort: 500,
          scope_completed: 0,
        },
        {
          description: 'Optimization & Handover',
          estimated_date: new Date('2025-08-31'),
          estimated_effort: 250,
          scope_completed: 0,
        },
      ],
    });

    console.log('Projects created successfully');

    // Create Weekly Effort Records
    console.log('Creating weekly effort records...');

    const weeklyEfforts = [];

    // Generate effort data for the last 12 weeks
    for (let weekOffset = 11; weekOffset >= 0; weekOffset--) {
      const { start, end } = getWeekDates(weekOffset);

      // Project 1 efforts
      weeklyEfforts.push({
        project: project1._id,
        resource: resource1._id,
        hours: 32 + Math.floor(Math.random() * 8),
        week_start_date: start,
        week_end_date: end,
        scope_update: 'Progress on backend APIs',
        budget_update: 'Within budget',
        quality_update: 'Code review passed',
      });

      weeklyEfforts.push({
        project: project1._id,
        resource: resource2._id,
        hours: 35 + Math.floor(Math.random() * 5),
        week_start_date: start,
        week_end_date: end,
        scope_update: 'Frontend components completed',
        budget_update: 'On track',
        quality_update: 'UI/UX review completed',
      });

      weeklyEfforts.push({
        project: project1._id,
        resource: resource3._id,
        hours: 30 + Math.floor(Math.random() * 10),
        week_start_date: start,
        week_end_date: end,
        scope_update: 'Database optimization',
        budget_update: 'On track',
        quality_update: 'Performance tests passed',
      });

      // Project 2 efforts
      weeklyEfforts.push({
        project: project2._id,
        resource: resource2._id,
        hours: 15 + Math.floor(Math.random() * 10),
        week_start_date: start,
        week_end_date: end,
        scope_update: 'Mobile UI development',
        budget_update: 'Slightly over budget',
        quality_update: 'Testing in progress',
      });

      weeklyEfforts.push({
        project: project2._id,
        resource: resource4._id,
        hours: 28 + Math.floor(Math.random() * 12),
        week_start_date: start,
        week_end_date: end,
        scope_update: 'Integration with banking APIs',
        budget_update: 'Budget concerns',
        quality_update: 'Security review pending',
      });

      // Project 3 efforts
      weeklyEfforts.push({
        project: project3._id,
        resource: resource1._id,
        hours: 8 + Math.floor(Math.random() * 7),
        week_start_date: start,
        week_end_date: end,
        scope_update: 'Working on CRM modules',
        budget_update: 'Over budget',
        quality_update: 'Issues found in testing',
      });

      weeklyEfforts.push({
        project: project3._id,
        resource: resource3._id,
        hours: 10 + Math.floor(Math.random() * 8),
        week_start_date: start,
        week_end_date: end,
        scope_update: 'Bug fixes and optimizations',
        budget_update: 'Exceeded planned hours',
        quality_update: 'Technical debt increasing',
      });

      weeklyEfforts.push({
        project: project3._id,
        resource: resource5._id,
        hours: 25 + Math.floor(Math.random() * 15),
        week_start_date: start,
        week_end_date: end,
        scope_update: 'Core functionality development',
        budget_update: 'Budget pressure',
        quality_update: 'Refactoring needed',
      });

      // Project 5 efforts (only recent weeks as it just started)
      if (weekOffset <= 2) {
        weeklyEfforts.push({
          project: project5._id,
          resource: resource4._id,
          hours: 20 + Math.floor(Math.random() * 10),
          week_start_date: start,
          week_end_date: end,
          scope_update: 'Initial assessment completed',
          budget_update: 'On track',
          quality_update: 'Documentation in progress',
        });

        weeklyEfforts.push({
          project: project5._id,
          resource: resource5._id,
          hours: 15 + Math.floor(Math.random() * 10),
          week_start_date: start,
          week_end_date: end,
          scope_update: 'Infrastructure planning',
          budget_update: 'Within budget',
          quality_update: 'Architecture review done',
        });
      }
    }

    await ProjectWeeklyEffort.insertMany(weeklyEfforts);
    console.log('Weekly effort records created successfully');

    console.log('\n=== Seeding Complete ===');
    console.log('\nCreated:');
    console.log(`- ${await User.countDocuments()} Users`);
    console.log(`- ${await Customer.countDocuments()} Customers`);
    console.log(`- ${await Resource.countDocuments()} Resources`);
    console.log(`- ${await Project.countDocuments()} Projects`);
    console.log(`- ${await ProjectWeeklyEffort.countDocuments()} Weekly Effort Records`);
    console.log('\nTest User Credentials:');
    console.log('Admin: admin@example.com / Admin@123');
    console.log('CEO: ceo@example.com / Ceo@1234');
    console.log('Manager 1: john@example.com / Manager@123');
    console.log('Manager 2: sarah@example.com / Manager@123');

    await mongoose.connection.close();
    console.log('\nDatabase connection closed');
  } catch (error) {
    console.error('Error seeding database:', error);
    process.exit(1);
  }
}

seedDatabase();
