import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { Project } from '../models';

dotenv.config();

async function listAllProjects() {
  try {
    await mongoose.connect(process.env.MONGODB_URI as string);
    console.log('Connected to MongoDB\n');

    const projects = await Project.find().select('_id project_name');
    
    console.log(`Total projects in database: ${projects.length}\n`);
    
    projects.forEach(project => {
      console.log(`ID: ${project._id} - Name: ${project.project_name}`);
    });

    await mongoose.disconnect();
    console.log('\nDisconnected from MongoDB');
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

listAllProjects();
