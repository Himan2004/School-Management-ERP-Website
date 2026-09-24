import mongoose from 'mongoose';
import SubjectMarksEntry from '../../models/academic/SubjectMarksEntry.model.js';
import Student from '../../models/users/student.model.js';
import Class from '../../models/organization/organizationClass.js';
import Section from '../../models/school/Section.model.js';
import Marksheet from '../../models/academic/marksheet.model.js';

const getSchoolId = (user) => user?.school?._id || user?.school;

export const getMarksEntries = async (req, res) => {
    try {
        const schoolId = getSchoolId(req.user);
        const teacherId = req.user._id;

        const entries = await SubjectMarksEntry.find({ school: schoolId, createdBy: teacherId })
            .lean();

        const total = entries.length;
        const pending = entries.filter(e => e.status === 'pending').length;
        const submitted = entries.filter(e => e.status === 'submitted').length;
        const verified = entries.filter(e => e.status === 'verified').length;
        const published = entries.filter(e => e.status === 'published').length;
        
        let totalStudentsCount = 0;
        let passCount = 0;
        let totalScoreSum = 0;
        let validScoresCount = 0;

        entries.forEach(e => {
            totalStudentsCount += (e.studentsCount || 0);
            passCount += (e.passCount || 0);
            if (e.averageScore > 0) {
                totalScoreSum += e.averageScore;
                validScoresCount++;
            }
        });

        const averageScore = validScoresCount > 0 ? Math.round(totalScoreSum / validScoresCount) : 0;
        const passPercentage = totalStudentsCount > 0 ? Math.round((passCount / totalStudentsCount) * 100) : 0;

        const formattedEntries = entries.map(e => ({
            id: e._id,
            class: e.class,
            section: e.section,
            subject: e.subject,
            examType: e.examType,
            examDate: e.examDate,
            totalMarks: e.totalMarks,
            passingMarks: e.passingMarks,
            status: e.status,
            students: e.studentsCount || 0,
            averageScore: e.averageScore || 0,
            passCount: e.passCount || 0,
            marksData: e.marksData || {},
            createdAt: e.createdAt
        }));

        res.status(200).json({
            success: true,
            data: formattedEntries,
            stats: {
                total,
                pending,
                submitted,
                verified,
                published,
                totalStudents: totalStudentsCount,
                averageScore,
                passPercentage
            }
        });
    } catch (error) {
        console.error('Error fetching marks entries:', error);
        res.status(500).json({ success: false, message: error.message });
    }
};

export const createMarksEntry = async (req, res) => {
    try {
        const schoolId = getSchoolId(req.user);
        const { class: cls, section, subject, examType, examDate, totalMarks, passingMarks, status } = req.body;

        const newEntry = await SubjectMarksEntry.create({
            school: schoolId,
            createdBy: req.user._id,
            class: cls,
            section,
            subject,
            examType,
            examDate,
            totalMarks,
            passingMarks,
            status: status || 'draft'
        });

        res.status(201).json({ success: true, data: { id: newEntry._id, ...newEntry.toObject() } });
    } catch (error) {
        console.error('Error creating marks entry:', error);
        res.status(500).json({ success: false, message: error.message });
    }
};

export const updateMarksEntry = async (req, res) => {
    try {
        const { id } = req.params;
        const { class: cls, section, subject, examType, examDate, totalMarks, passingMarks, status } = req.body;

        const entry = await SubjectMarksEntry.findByIdAndUpdate(
            id,
            { class: cls, section, subject, examType, examDate, totalMarks, passingMarks, status },
            { new: true }
        );

        res.status(200).json({ success: true, data: entry });
    } catch (error) {
        console.error('Error updating marks entry:', error);
        res.status(500).json({ success: false, message: error.message });
    }
};

export const deleteMarksEntry = async (req, res) => {
    try {
        await SubjectMarksEntry.findByIdAndDelete(req.params.id);
        res.status(200).json({ success: true, message: 'Marks entry deleted' });
    } catch (error) {
        console.error('Error deleting marks entry:', error);
        res.status(500).json({ success: false, message: error.message });
    }
};

export const getStudentsForMarks = async (req, res) => {
    try {
        const schoolId = getSchoolId(req.user);
        const { class: className, section: sectionName } = req.query;

        if (!className || !sectionName) {
            return res.status(400).json({ success: false, message: 'Class and section are required' });
        }

        const classDoc = await Class.findOne({ 
            organization: req.user.organization,
            $or: [{ name: className }, { name: `Class ${className}` }] 
        });

        const sectionDoc = await Section.findOne({
            school: schoolId,
            class: classDoc?._id,
            $or: [{ name: sectionName }, { name: `Section ${sectionName}` }]
        });

        if (!classDoc || !sectionDoc) {
            return res.status(200).json({ success: true, data: [] });
        }

        const students = await Student.find({
            school: schoolId,
            class: classDoc._id,
            section: sectionDoc._id,
            status: 'active'
        }).populate('user', 'name');

        const formattedStudents = students.map(s => ({
            id: s.user._id,
            name: s.user.name,
            rollNo: s.rollNo || 'N/A',
            class: className,
            section: sectionName
        }));

        res.status(200).json({ success: true, data: formattedStudents });
    } catch (error) {
        console.error('Error fetching students:', error);
        res.status(500).json({ success: false, message: error.message });
    }
};

export const saveMarks = async (req, res) => {
    try {
        const { id } = req.params;
        const marksDataArray = req.body; // Array of objects
        
        const entry = await SubjectMarksEntry.findById(id);
        if (!entry) return res.status(404).json({ success: false, message: 'Entry not found' });

        const newMarksData = {};
        let passCount = 0;
        let totalScore = 0;
        let validMarksCount = 0;

        marksDataArray.forEach(data => {
            if (data.marks && data.marks !== '') {
                validMarksCount++;
                totalScore += Number(data.marks);
                if (Number(data.marks) >= entry.passingMarks) {
                    passCount++;
                }
            }
            newMarksData[data.studentId] = data;
        });

        entry.marksData = newMarksData;
        entry.studentsCount = validMarksCount;
        entry.averageScore = validMarksCount > 0 ? Math.round(totalScore / validMarksCount) : 0;
        entry.passCount = passCount;
        entry.status = 'submitted';

        await entry.save();

        res.status(200).json({ success: true, message: 'Marks saved successfully', data: entry });
    } catch (error) {
        console.error('Error saving marks:', error);
        res.status(500).json({ success: false, message: error.message });
    }
};

export const publishMarks = async (req, res) => {
    try {
        const { id } = req.params;
        const entry = await SubjectMarksEntry.findById(id);
        if (!entry) return res.status(404).json({ success: false, message: 'Entry not found' });

        entry.status = 'published';
        await entry.save();

        res.status(200).json({ success: true, message: 'Marks published successfully', data: entry });
    } catch (error) {
        console.error('Error publishing marks:', error);
        res.status(500).json({ success: false, message: error.message });
    }
};

export const verifyMarks = async (req, res) => {
    try {
        const { id } = req.params;
        const entry = await SubjectMarksEntry.findByIdAndUpdate(id, { status: 'verified' }, { new: true });
        res.status(200).json({ success: true, message: 'Marks verified successfully', data: entry });
    } catch (error) {
        console.error('Error verifying marks:', error);
        res.status(500).json({ success: false, message: error.message });
    }
};
