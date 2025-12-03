import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { Project } from '../models';

dotenv.config();

const projectIds = [
  '6928218ad422e4b65f3c0d15',
  '692fd36491d09cafaf6527ce',
  '69281c6694c242204dbf93aa',
  '6928226155f8fc9911488242'
];

async function verifyProjects() {
  try {
    await mongoose.connect(process.env.MONGODB_URI as string);
    console.log('Connected to MongoDB');

    for (const id of projectIds) {
      try {
        const project = await Project.findById(id);
        if (project) {
          console.log(`✓ ID: ${id} - EXISTS: ${project.project_name}`);
        } else {
          console.log(`✗ ID: ${id} - NOT FOUND`);
        }
      } catch (error) {
        console.log(`✗ ID: ${id} - ERROR: ${error}`);
      }
    }

    await mongoose.disconnect();
    console.log('\nDisconnected from MongoDB');
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

verifyProjects();
