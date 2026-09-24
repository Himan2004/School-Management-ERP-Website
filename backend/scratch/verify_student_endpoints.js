import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, '../.env') });

import connectDB from '../config/database.js';

// Pre-register schemas in Mongoose to avoid MissingSchemaError during standalone script execution
import Organization from '../models/organization/Organization.js';
import OrganizationSubjects from '../models/organization/organizationSubjects.js';
import Subject from '../models/modules/Subject.js';
import School from '../models/school/School.js';
import Class from '../models/organization/organizationClass.js';
import AcademicConfig from '../models/organization/AcademicConfig.js';
import Section from '../models/school/Section.model.js';
import ExamStructure from '../models/academic/examStructure.model.js';
import ExamSchedule from '../models/academic/examSchedule.model.js';
import Marksheet from '../models/academic/marksheet.model.js';
import StudyMaterial from '../models/academic/studyMaterial.model.js';
import StudentLeave from '../models/academic/StudentLeave.model.js';
import Homework from '../models/academic/homework.model.js';
import OnlineTest from '../models/academic/OnlineTest.model.js';
import User from '../models/users/user.model.js';
import Student from '../models/users/student.model.js';

// Import controllers to test
import { getStudentProfile } from '../controllers/student/studentSettingsController.js';
import { getStudentExams } from '../controllers/student/studentExamController.js';
import { getLeaveHistory, getLeaveStats } from '../controllers/student/studentLeaveController.js';
import { getStudentDashboard } from '../controllers/student/studentDashboardController.js';

async function test() {
    try {
        await connectDB();
        console.log('--- Connected to DB ---');

        const user = await User.findOne({ loginId: 'STU-SXPTS2706' });
        if (!user) {
            console.error('Test user STU-SXPTS2706 not found!');
            process.exit(1);
        }

        const mockReq = {
            user: {
                _id: user._id,
                school: user.school,
                loginId: user.loginId
            },
            params: {},
            query: {}
        };

        const createMockRes = (name) => {
            return {
                statusCode: 200,
                status: function(code) {
                    this.statusCode = code;
                    return this;
                },
                json: function(resData) {
                    console.log(`\n[${name}] Response Code: ${this.statusCode}`);
                    if (resData.success) {
                        console.log(`Success! Keys returned:`, Object.keys(resData.data || {}));
                        if (name === 'PROFILE') {
                            console.log(`  - classTeacher:`, resData.data?.classTeacher);
                        }
                        if (name === 'EXAMS') {
                            console.log(`  - Upcoming count:`, resData.data?.upcoming?.length);
                            console.log(`  - Completed count:`, resData.data?.completed?.length);
                            if (resData.data?.upcoming?.length > 0) {
                                console.log(`  - Upcoming Exam Details (Sample):`, {
                                    subject: resData.data.upcoming[0].subject,
                                    date: resData.data.upcoming[0].date,
                                    hall: resData.data.upcoming[0].hall,
                                    room: resData.data.upcoming[0].room,
                                    seat: resData.data.upcoming[0].seat,
                                });
                            }
                            if (resData.data?.completed?.length > 0) {
                                console.log(`  - Completed Exam Details (Sample):`, {
                                    subject: resData.data.completed[0].subject,
                                    date: resData.data.completed[0].date,
                                    hall: resData.data.completed[0].hall,
                                    room: resData.data.completed[0].room,
                                    status: resData.data.completed[0].status,
                                });
                            }
                        }
                        if (name === 'LEAVE_HISTORY') {
                            console.log(`  - Leaves count:`, resData.data?.leaves?.length);
                            if (resData.data?.leaves?.length > 0) {
                                console.log(`  - Leaf Details (Sample):`, {
                                    type: resData.data.leaves[0].leaveType,
                                    status: resData.data.leaves[0].status,
                                    fromDate: resData.data.leaves[0].fromDate,
                                    toDate: resData.data.leaves[0].toDate,
                                });
                            }
                        }
                        if (name === 'LEAVE_STATS') {
                            console.log(`  - Stats data:`, resData.data);
                        }
                    } else {
                        console.log(`Failed:`, resData.message);
                    }
                    return this;
                }
            };
        };

        console.log('\n=======================================');
        console.log('1. TESTING getStudentProfile');
        console.log('=======================================');
        await getStudentProfile(mockReq, createMockRes('PROFILE'));

        console.log('\n=======================================');
        console.log('2. TESTING getStudentExams');
        console.log('=======================================');
        await getStudentExams(mockReq, createMockRes('EXAMS'));

        console.log('\n=======================================');
        console.log('3. TESTING getLeaveHistory');
        console.log('=======================================');
        await getLeaveHistory(mockReq, createMockRes('LEAVE_HISTORY'));

        console.log('\n=======================================');
        console.log('4. TESTING getLeaveStats');
        console.log('=======================================');
        await getLeaveStats(mockReq, createMockRes('LEAVE_STATS'));

        console.log('\n=======================================');
        console.log('5. TESTING getStudentDashboard');
        console.log('=======================================');
        await getStudentDashboard(mockReq, createMockRes('DASHBOARD'));

        process.exit(0);
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
}

test();
