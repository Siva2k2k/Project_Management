import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { User } from '../models/User';
import { Customer } from '../models/Customer';
import { Resource } from '../models/Resource';
import { Project } from '../models/Project';
import { ProjectWeeklyEffort } from '../models/ProjectWeeklyEffort';
import { ProjectWeeklyMetrics } from '../models/ProjectWeeklyMetrics';
import {
  UserRole,
  ResourceStatus,
  ProjectType,
  RAGStatus,
  Currency,
  ProjectTrackingBy,
  ProjectStatus,
  HourlyRateSource,
} from '../types';

dotenv.config();

const MONGODB_URI = process.env.MONGODB_URI || "mongodb+srv://sivakumar_db_user:SivaCluster29@timesheet-management-cl.hnjw4hb.mongodb.net/project-management-clean?retryWrites=true&w=majority&appName=timesheet-management-cluster";

/**
 * Get week start (Monday) and end (Sunday) dates for a given date
 */
function getWeekDates(date: Date): { start: Date; end: Date } {
  const d = new Date(date);
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1); // adjust when day is sunday
  
  const start = new Date(d.setDate(diff));
  start.setUTCHours(0, 0, 0, 0);

  const end = new Date(start);
  end.setDate(end.getDate() + 6); // Sunday
  end.setUTCHours(23, 59, 59, 999);

  return { start, end };
}

/**
 * Generate realistic weekly hours with per-day leaves and work lag.
 * Five-day work week; no full-week leaves. Half-day leaves modeled as 4 hours/day.
 */
function generateWeeklyHours(weekNumber: number, resourceIndex: number): number {
  // Base daily hours for a 5-day week
  const baseDailyHours = [8, 8, 8, 8, 8];

  // Deterministic per-day leave schedule: { week: { resIdx: { fullDays: number[], halfDays: number[] } } }
  const leaveSchedule: Record<number, Record<number, { fullDays: number[]; halfDays: number[] }>> = {
    // Week indices 0..11
    0: {
      0: { fullDays: [], halfDays: [2] }, // Siva half-day midweek
      1: { fullDays: [], halfDays: [] },
      2: { fullDays: [], halfDays: [] },
    },
    1: {
      0: { fullDays: [], halfDays: [] },
      1: { fullDays: [], halfDays: [4] }, // Sriram half-day Friday
      2: { fullDays: [], halfDays: [1] }, // Aravind half-day Tuesday
    },
    2: {
      0: { fullDays: [3], halfDays: [] }, // Siva one full-day leave (no full-week leave)
      1: { fullDays: [], halfDays: [] },
      2: { fullDays: [], halfDays: [] },
    },
    3: {
      0: { fullDays: [], halfDays: [] },
      1: { fullDays: [2], halfDays: [] }, // Sriram one full-day leave
      2: { fullDays: [], halfDays: [] },
    },
    4: {
      0: { fullDays: [], halfDays: [] },
      1: { fullDays: [], halfDays: [] },
      2: { fullDays: [], halfDays: [] },
    },
    5: {
      0: { fullDays: [], halfDays: [] },
      1: { fullDays: [1], halfDays: [] }, // Sriram one full-day leave
      2: { fullDays: [], halfDays: [] },
    },
    6: {
      0: { fullDays: [], halfDays: [0] }, // Siva half-day Monday
      1: { fullDays: [], halfDays: [] },
      2: { fullDays: [], halfDays: [] },
    },
    7: {
      0: { fullDays: [], halfDays: [] },
      1: { fullDays: [], halfDays: [] },
      2: { fullDays: [], halfDays: [] },
    },
    8: {
      0: { fullDays: [], halfDays: [] },
      1: { fullDays: [], halfDays: [] },
      2: { fullDays: [4], halfDays: [] }, // Aravind one full-day leave
    },
    9: {
      0: { fullDays: [], halfDays: [] },
      1: { fullDays: [], halfDays: [] },
      2: { fullDays: [], halfDays: [] },
    },
    10: {
      0: { fullDays: [], halfDays: [] },
      1: { fullDays: [], halfDays: [] },
      2: { fullDays: [], halfDays: [] },
    },
    11: {
      0: { fullDays: [], halfDays: [] },
      1: { fullDays: [], halfDays: [] },
      2: { fullDays: [], halfDays: [] },
    },
  };

  const daily = [...baseDailyHours];
  const leave = leaveSchedule[weekNumber]?.[resourceIndex];
  if (leave) {
    for (const d of leave.fullDays) daily[d] = 0; // full-day leave
    for (const d of leave.halfDays) daily[d] = 4; // half-day leave
  }

  // Apply work lag pattern per week/resource: reduce some hours due to bugs, rework, etc.
  const lagReduction: Record<number, number[]> = {
    0: [8, 5, 10],  // onboarding
    1: [2, 12, 4],  // ramp-up + half-day already applied
    2: [6, 2, 5],   // some rework; Siva also has one full-day leave
    3: [5, 8, 0],   // rhythm; Sriram one full-day leave
    4: [0, 0, 2],   // good productivity
    5: [2, 10, 0],  // Sriram full-day leave
    6: [10, 4, 4],  // bug fixes week
    7: [5, 5, 2],   // requirements change
    8: [0, 0, 12],  // Aravind full-day leave + more lag
    9: [2, 0, 2],   // catch-up
    10: [-2, 0, 0], // sprint push (overtime for res 0)
    11: [6, 8, 5],  // review week
  };
  // Distribute lag reduction across the week deterministically
  const reduce = lagReduction[weekNumber]?.[resourceIndex] ?? 0;
  if (reduce !== 0) {
    let remaining = Math.abs(reduce);
    let dayIdx = 0;
    while (remaining > 0) {
      const chunk = Math.min(2, remaining); // adjust 2 hours per step for realism
      daily[dayIdx] = Math.max(0, daily[dayIdx] + (reduce > 0 ? -chunk : chunk));
      remaining -= chunk;
      dayIdx = (dayIdx + 1) % daily.length;
    }
  }

  // Cap overtime: max 10 hours/day
  for (let i = 0; i < daily.length; i++) daily[i] = Math.min(daily[i], 10);

  return daily.reduce((sum, h) => sum + h, 0);
}

/**
 * Calculate scope completed based on week number
 * Scope decreases due to bugs and requirement changes
 */
function calculateScopeCompleted(weekNumber: number): number {
  // Scope can move backward and even negative due to bugs/re-estimation.
  // Define a realistic cumulative progression over 12 weeks.
  const scopeSeries = [
    -5,  // Week 1: initial discovery reduces effective completed scope
    10,  // Week 2: onboarding progress
    22,  // Week 3
    35,  // Week 4
    30,  // Week 5: bug discovery reduces scope (reverse movement)
    25,  // Week 6: further rework lowers effective completion
    20,  // Week 7
    18,  // Week 8: requirement increase; completion ratio drops
    15,  // Week 9
    25,  // Week 10: recovery
    40,  // Week 11: strong sprint
    55,  // Week 12: review & consolidation
  ];
  return scopeSeries[Math.max(0, Math.min(weekNumber, scopeSeries.length - 1))];
}

/**
 * Generate comments for weekly metrics based on week number
 */
function generateWeeklyComments(weekNumber: number): string {
  const comments = [
    'Project kickoff successful. Team onboarding in progress. Initial setup and architecture design completed.',
    'Requirements analysis completed. Started development on core AI modules. Some integration challenges with existing systems.',
    'Development progressing. Siva on leave this week. Other team members covering critical tasks.',
    'Completed user authentication module. API integration started. Sriram taking half-week leave for personal matters.',
    'Good progress on AI model integration. All core features development on track. Team working well together.',
    'Sriram on full leave this week. Discovered several bugs in the AI prediction module requiring immediate attention.',
    'Bug fixing week. Multiple issues found during internal testing. Siva on half-week leave. Progress slower than expected.',
    'Rework on AI algorithm due to accuracy issues. Customer requested changes to data processing logic. Some scope creep evident.',
    'Aravind on leave this week. New requirements from customer added: real-time analytics dashboard and additional reporting features.',
    'Team adapting to expanded scope. Breaking down new requirements into tasks. Revised estimates for remaining work.',
    'Strong sprint week. Made significant progress on new features. All team members focused and productive.',
    'Project review with stakeholders completed. Demo well received. 70% scope completed. Preparing for next phase.',
  ];
  
  return comments[weekNumber];
}

async function seedAISampleProject() {
  try {
    console.log('='.repeat(70));
    console.log('AI SAMPLE PROJECT SEEDING WITH REALISTIC SIMULATED DATA');
    console.log('Date: December 3, 2025');
    console.log('='.repeat(70));
    console.log();

    // Connect to MongoDB
    console.log('📡 Connecting to MongoDB...');
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Connected to MongoDB\n');

    // Find or create admin user
    console.log('👤 Finding admin user...');
    let adminUser = await User.findOne({ role: UserRole.ADMIN });
    if (!adminUser) {
      adminUser = await User.create({
        name: 'Admin User',
        email: 'admin@example.com',
        password: 'Admin@123',
        role: UserRole.ADMIN,
        is_active: true,
        email_verified: true,
      });
      console.log('   ✓ Created admin user');
    } else {
      console.log('   ✓ Found existing admin user');
    }

    // Find or create manager
    console.log('\n👤 Finding/creating manager...');
    let manager = await User.findOne({ role: UserRole.MANAGER });
    if (!manager) {
      manager = await User.create({
        name: 'Project Manager',
        email: 'manager@hibizsolutions.com',
        password: 'Manager@123',
        role: UserRole.MANAGER,
        is_active: true,
        email_verified: true,
      });
      console.log('   ✓ Created manager');
    } else {
      console.log(`   ✓ Found existing manager: ${manager.name}`);
    }

    // Find or create customer
    console.log('\n🏢 Finding/creating customer...');
    let customer = await Customer.findOne({ customer_name: 'AI Innovation Labs' });
    if (!customer) {
      customer = await Customer.create({
        customer_name: 'AI Innovation Labs',
        email: 'contact@aiinnovationlabs.com',
        contact_info: '456 Innovation Drive, San Francisco, CA 94105 | +1-555-0199',
        created_by: adminUser._id,
        last_modified_by: adminUser._id,
      });
      console.log('   ✓ Created customer: AI Innovation Labs');
    } else {
      console.log('   ✓ Found existing customer: AI Innovation Labs');
    }

    // Create or find resources
    console.log('\n👨‍💻 Creating/finding resources...');
    
    const resourcesData = [
      { name: 'Siva Kumar RV', email: 'sivakumar@hibizsolutions.com', rate: 30 },
      { name: 'Sriram Kumar G', email: 'sriramkumar@hibizsolutions.com', rate: 30 },
      { name: 'Aravind S', email: 'aravind@hibizsolutions.com', rate: 30 },
    ];

    const resources = [];
    for (const data of resourcesData) {
      let resource = await Resource.findOne({ email: data.email });
      if (!resource) {
        resource = await Resource.create({
          resource_name: data.name,
          email: data.email,
          status: ResourceStatus.ACTIVE,
          per_hour_rate: data.rate,
          currency: Currency.USD,
          last_modified_by: adminUser._id,
        });
        console.log(`   ✓ Created resource: ${data.name} (${data.email})`);
      } else {
        console.log(`   ✓ Found existing resource: ${data.name} (${data.email})`);
      }
      resources.push(resource);
    }

    // Calculate project parameters
    console.log('\n📊 Project Parameters:');
    const startDate = new Date('2025-08-01');
    const endDate = new Date('2026-01-31');
    const totalWeeks = 26;
    const estimatedEffort = totalWeeks * 40 * 3; // 3120 hours
    const hourlyRate = 30;
    const estimatedBudget = estimatedEffort * hourlyRate; // $93,600
    
    console.log(`   Timeline: August 1, 2025 - January 31, 2026 (${totalWeeks} weeks)`);
    console.log(`   Estimated Effort: ${estimatedEffort} hours (${totalWeeks} weeks × 40 hrs × 3 resources)`);
    console.log(`   Hourly Rate: $${hourlyRate}`);
    console.log(`   Estimated Budget: $${estimatedBudget.toLocaleString()}`);

    // Check if project already exists
    console.log('\n📁 Creating AI Sample Project...');
    let project = await Project.findOne({ project_name: 'AI Sample Project' });
    
    if (project) {
      console.log('   ⚠️  Project already exists. Deleting existing data...');
      await ProjectWeeklyEffort.deleteMany({ project: project._id });
      await ProjectWeeklyMetrics.deleteMany({ project: project._id });
      await Project.deleteOne({ _id: project._id });
      console.log('   ✓ Existing project and data deleted');
    }

    // Create the project
    project = await Project.create({
      project_name: 'AI Sample Project',
      start_date: startDate,
      end_date: endDate,
      project_type: ProjectType.TIME_MATERIAL,
      estimated_effort: estimatedEffort,
      estimated_budget: estimatedBudget,
      estimated_resources: 3,
      scope_completed: 70, // After 12 weeks
      overall_status: RAGStatus.AMBER, // Due to scope changes
      assigned_manager: manager._id,
      resources: resources.map(r => r._id),
      tracking_by: ProjectTrackingBy.ENDDATE,
      scope_status: RAGStatus.AMBER, // Scope increased
      quality_status: RAGStatus.GREEN, // Quality maintained
      budget_status: RAGStatus.GREEN, // Within budget
      customer: customer._id,
      project_status: ProjectStatus.ACTIVE,
      hourly_rate: hourlyRate,
      hourly_rate_source: HourlyRateSource.PROJECT,
      estimation: `AI-powered analytics platform with machine learning capabilities.
      
Components:
- User authentication and authorization module
- AI model integration (3 different ML models)
- Real-time data processing engine
- Analytics dashboard with 15 visualization screens
- RESTful API layer (25+ endpoints)
- Admin panel (8 screens)
- Reporting module with PDF/Excel export

Resources: 3 full-stack developers
Hourly Rate: $30/hour
Technology Stack: React, Node.js, Python (ML models), PostgreSQL, Redis
Expected Deliverables: 23 screens, 25+ API endpoints, 3 ML model integrations`,
      
      scope_estimation: `Initial Scope (100%):
- Core features: User management, basic analytics, 2 ML models
- 18 screens initially planned
- 20 API endpoints

Scope Changes During Development:
- Week 4-5: Bugs discovered in ML prediction module (+10% rework)
- Week 8: Customer requested real-time dashboard and advanced reporting (+30% scope)
- Final scope: ~130% of original estimate

Adjusted deliverables:
- 23 screens (increased from 18)
- 25+ API endpoints (increased from 20)
- 3 ML models (increased from 2)
- Additional real-time features`,
      
      last_modified_by: manager._id,
    });

    console.log('   ✓ Project created successfully');
    console.log(`   Project ID: ${project._id}`);


    // Generate data for all weeks from August 4, 2025 to November 30, 2025 (inclusive)
    console.log('\n📅 Generating weekly effort data up to previous week (ending 2025-11-30)...');
    console.log('   Simulating: Work lag, per-day leaves (5-day week), bugs, scope changes');
    console.log();

    const firstMonday = new Date('2025-08-04');
    const lastSunday = new Date('2025-11-30');
    const weeklyEffortsCreated = [];
    const weeklyMetricsCreated = [];

    let weekStartDate = new Date(firstMonday);
    let weekNum = 0;
    let lastGeneratedEnd = null;
    while (weekStartDate <= lastSunday) {
      const { start, end } = getWeekDates(weekStartDate);
      if (end > lastSunday) break;

      console.log(`   Week ${weekNum + 1}: ${start.toISOString().split('T')[0]} to ${end.toISOString().split('T')[0]}`);

      let totalWeekHours = 0;
      for (let resIdx = 0; resIdx < resources.length; resIdx++) {
        const hours = generateWeeklyHours(weekNum % 12, resIdx);
        totalWeekHours += hours;
        const effort = await ProjectWeeklyEffort.create({
          project: project._id,
          resource: resources[resIdx]._id,
          hours: hours,
          week_start_date: start,
          week_end_date: end,
          last_modified_by: manager._id,
        });
        weeklyEffortsCreated.push(effort);
        console.log(`      - ${resourcesData[resIdx].name}: ${hours} hours`);
      }

      const scopeCompleted = calculateScopeCompleted(weekNum % 12);
      const comments = generateWeeklyComments(weekNum % 12);
      const metrics = await ProjectWeeklyMetrics.create({
        project: project._id,
        week_start_date: start,
        week_end_date: end,
        rollup_hours: totalWeekHours,
        scope_completed: scopeCompleted,
        comments: comments,
        last_modified_by: manager._id,
      });
      weeklyMetricsCreated.push(metrics);
      console.log(`      Total: ${totalWeekHours} hours | Scope: ${scopeCompleted}%`);
      console.log(`      Note: ${comments.substring(0, 80)}...`);
      console.log();

      lastGeneratedEnd = end;
      weekStartDate.setDate(weekStartDate.getDate() + 7);
      weekNum++;
    }

    // Ensure the week Nov 24 to Nov 30, 2025 is included if not already
    const nov24 = new Date('2025-11-24T00:00:00.000Z');
    const nov30 = new Date('2025-11-30T23:59:59.999Z');
    if (!lastGeneratedEnd || lastGeneratedEnd < nov30) {
      const start = nov24;
      const end = nov30;
      console.log(`   Week (Final): ${start.toISOString().split('T')[0]} to ${end.toISOString().split('T')[0]}`);
      let totalWeekHours = 0;
      for (let resIdx = 0; resIdx < resources.length; resIdx++) {
        const hours = generateWeeklyHours(weekNum % 12, resIdx);
        totalWeekHours += hours;
        const effort = await ProjectWeeklyEffort.create({
          project: project._id,
          resource: resources[resIdx]._id,
          hours: hours,
          week_start_date: start,
          week_end_date: end,
          last_modified_by: manager._id,
        });
        weeklyEffortsCreated.push(effort);
        console.log(`      - ${resourcesData[resIdx].name}: ${hours} hours`);
      }
      const scopeCompleted = calculateScopeCompleted(weekNum % 12);
      const comments = generateWeeklyComments(weekNum % 12);
      const metrics = await ProjectWeeklyMetrics.create({
        project: project._id,
        week_start_date: start,
        week_end_date: end,
        rollup_hours: totalWeekHours,
        scope_completed: scopeCompleted,
        comments: comments,
        last_modified_by: manager._id,
      });
      weeklyMetricsCreated.push(metrics);
      console.log(`      Total: ${totalWeekHours} hours | Scope: ${scopeCompleted}%`);
      console.log(`      Note: ${comments.substring(0, 80)}...`);
      console.log();
    }

    // Calculate total actual hours
    const totalActualHours = weeklyEffortsCreated.reduce((sum, e) => sum + e.hours, 0);
    const totalPlannedHours = 12 * 40 * 3; // 1440 hours for 12 weeks
    const utilizationRate = ((totalActualHours / totalPlannedHours) * 100).toFixed(1);

    console.log('='.repeat(70));
    console.log('✅ SEEDING COMPLETED SUCCESSFULLY');
    console.log('='.repeat(70));
    console.log();
    console.log('📈 Summary:');
    console.log(`   Project: ${project.project_name}`);
    console.log(`   Project ID: ${project._id}`);
    console.log(`   Resources: ${resources.length}`);
    console.log(`   Duration: ${totalWeeks} weeks (${12} weeks of data generated)`);
    console.log(`   Weekly Effort Entries: ${weeklyEffortsCreated.length}`);
    console.log(`   Weekly Metrics Entries: ${weeklyMetricsCreated.length}`);
    console.log();
    console.log('⏱️  Hours Analysis:');
    console.log(`   Planned Hours (12 weeks): ${totalPlannedHours} hours`);
    console.log(`   Actual Hours Logged: ${totalActualHours} hours`);
    console.log(`   Utilization Rate: ${utilizationRate}%`);
    console.log(`   Variance: ${totalActualHours - totalPlannedHours} hours (${((totalActualHours - totalPlannedHours) / totalPlannedHours * 100).toFixed(1)}%)`);
    console.log();
    console.log('🎯 Realistic Factors Simulated:');
    console.log('   ✓ Per-day leaves (full-day and half-day)');
    console.log('   ✓ Work lag (< 40 hours) - Multiple weeks');
    console.log('   ✓ Bug fixes and rework - Weeks 4-7');
    console.log('   ✓ Scope increase (+30%) - Week 8');
    console.log('   ✓ Requirement changes - Weeks 7-8');
    console.log('   ✓ Team ramp-up period - Weeks 0-3');
    console.log('   ✓ Sprint push - Week 10');
    console.log();
    console.log('🔗 Access the project:');
    console.log('   1. Start the application');
    console.log('   2. Navigate to Projects page');
    console.log('   3. Look for "AI Sample Project"');
    console.log('   4. View weekly efforts and metrics in the dashboard');
    console.log();

  } catch (error) {
    console.error('❌ Error seeding database:', error);
    throw error;
  } finally {
    await mongoose.disconnect();
    console.log('📡 Disconnected from MongoDB');
  }
}

// Run the seed script
seedAISampleProject()
  .then(() => {
    console.log('✅ Script completed successfully');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Script failed:', error);
    process.exit(1);
  });
