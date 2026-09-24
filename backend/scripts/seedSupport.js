import mongoose from 'mongoose';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, '../.env') });
import GraphuraFAQ from '../models/graphura/GraphuraFAQ.js';
import GraphuraVideo from '../models/graphura/GraphuraVideo.js';
import GraphuraResource from '../models/graphura/GraphuraResource.js';

const seedData = async () => {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('Connected to MongoDB');

        // FAQs
        const faqs = [
            {
                question: "How do I add a new school to the platform?",
                answer: "Go to the Organization Requests tab, review the pending applications, and click 'Approve' to onboard a new school.",
                category: "school-management"
            },
            {
                question: "Can I manage multiple school branches?",
                answer: "Yes, once an organization is approved, they can manage multiple campuses or branches through the Organization Details dashboard.",
                category: "school-management"
            },
            {
                question: "How do I reset an admin password?",
                answer: "Navigate to Users Management, find the admin user, and click 'Edit' to trigger a password reset or manual update.",
                category: "user-management"
            },
            {
                question: "Is data backup automatic?",
                answer: "Yes, automated backups occur daily. You can also manually trigger a backup in the System Settings panel.",
                category: "technical"
            }
        ];

        // Videos
        const videos = [
            {
                title: "Platform Overview for Graphura Admins",
                duration: "5:30",
                thumbnail: "https://res.cloudinary.com/dot9v776u/image/upload/v1/samples/landscapes/nature-mountains.jpg",
                url: "https://youtu.be/e4VhxPoj7qQ?si=aRe9T41MohSXAe2S",
                category: "Getting Started"
            },
            {
                title: "Managing Organization Requests",
                duration: "3:45",
                thumbnail: "https://res.cloudinary.com/dot9v776u/image/upload/v1/samples/animals/reindeer.jpg",
                url: "https://youtu.be/e4VhxPoj7qQ?si=aRe9T41MohSXAe2S",
                category: "Organization"
            }
        ];

        // Resources
        const resources = [
            {
                title: "Graphura Admin User Manual",
                type: "PDF",
                size: "2.5 MB",
                fileUrl: "https://example.com/manual.pdf",
                isActive: true
            },
            {
                title: "Security Best Practices Guide",
                type: "PDF",
                size: "1.2 MB",
                fileUrl: "https://example.com/security.pdf",
                isActive: true
            }
        ];

        await GraphuraFAQ.deleteMany({ category: { $in: ['school-management', 'user-management', 'technical'] } });
        await GraphuraVideo.deleteMany({});
        await GraphuraResource.deleteMany({});

        await GraphuraFAQ.insertMany(faqs);
        await GraphuraVideo.insertMany(videos);
        await GraphuraResource.insertMany(resources);

        console.log('Support data seeded successfully');
        process.exit();
    } catch (error) {
        console.error('Seeding error:', error);
        process.exit(1);
    }
};

seedData();
