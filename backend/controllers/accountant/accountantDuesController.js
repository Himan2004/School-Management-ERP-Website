import Student from '../../models/users/student.model.js';
import User from '../../models/users/user.model.js';
import Parent from '../../models/users/parent.model.js';
import FeeInstallment from '../../models/finance/FeeInstallment.model.js';
import LateFeeSetting from '../../models/finance/LateFeeSetting.model.js';
import mongoose from 'mongoose';
import SibApiV3Sdk from 'sib-api-v3-sdk';
import { normalizeClassDisplay } from '../../utils/autoAssignFeeStructure.js';

// ─────────────────────────────────────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────────────────────────────────────
const ok  = (res, data, message = 'Success', status = 200) =>
    res.status(status).json({ success: true, message, data });

const err = (res, message = 'Internal server error', status = 500) =>
    res.status(status).json({ success: false, message });

const resolveYear = (academicYear) => {
    if (academicYear) return academicYear;

    const now = new Date();
    const y = now.getFullYear();

    return now.getMonth() >= 3
        ? `${y}-${String(y + 1).slice(-2)}`
        : `${y - 1}-${String(y).slice(-2)}`;
};

// ─── Brevo ───────────────────────────────────────────────────────────────────
const getBrevoClient = () => {
    const defaultClient = SibApiV3Sdk.ApiClient.instance;
    defaultClient.authentications['api-key'].apiKey = process.env.BREVO_API_KEY;
    return new SibApiV3Sdk.TransactionalEmailsApi();
};
const SENDER = {
    name:  process.env.BREVO_SENDER_NAME  || 'School Management',
    email: process.env.BREVO_SENDER_EMAIL || 'school.graphura@gmail.com',
};
const sendBrevoEmail = async (toEmail, toName, subject, htmlContent) => {
    const client        = getBrevoClient();
    const mail          = new SibApiV3Sdk.SendSmtpEmail();
    mail.sender         = SENDER;
    mail.to             = [{ email: toEmail, name: toName }];
    mail.subject        = subject;
    mail.htmlContent    = htmlContent;
    return client.sendTransacEmail(mail);
};
const buildReminderHtml = (studentName, admissionNo, className, section, dueAmount, schoolName) => `
    <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;padding:32px;color:#334155;background:#fff">
        <div style="background:linear-gradient(135deg,#223F74,#2A4A82);border-radius:16px;padding:28px;margin-bottom:28px">
            <h2 style="color:#fff;margin:0;font-size:22px">${schoolName}</h2>
            <p style="color:rgba(255,255,255,0.75);margin:8px 0 0;font-size:14px">Fee Payment Reminder</p>
        </div>
        <p style="font-size:15px;line-height:1.6">Dear Parent / Guardian of <strong>${studentName}</strong>,</p>
        <p style="font-size:15px;line-height:1.6">
            A fee payment of <strong style="color:#ef4444">₹${dueAmount.toLocaleString('en-IN')}</strong>
            is currently outstanding for your ward.
        </p>
        <div style="background:#F8F9FA;border:1px solid #E2E8F0;border-radius:12px;padding:20px;margin:24px 0">
            <table style="width:100%;border-collapse:collapse;font-size:14px">
                <tr><td style="padding:7px 0;color:#6B7280;width:40%">Student</td>
                    <td style="padding:7px 0;font-weight:600">${studentName}</td></tr>
                <tr><td style="padding:7px 0;color:#6B7280">Admission No.</td>
                    <td style="padding:7px 0;font-weight:600">${admissionNo}</td></tr>
                <tr><td style="padding:7px 0;color:#6B7280">Class</td>
                    <td style="padding:7px 0;font-weight:600">${className}${section ? ' – ' + section : ''}</td></tr>
                <tr style="border-top:1px solid #E2E8F0">
                    <td style="padding:10px 0 0;color:#6B7280;font-weight:700">Amount Due</td>
                    <td style="padding:10px 0 0;font-weight:800;color:#ef4444;font-size:16px">
                        ₹${dueAmount.toLocaleString('en-IN')}</td></tr>
            </table>
        </div>
        <p style="font-size:14px;line-height:1.6;color:#6B7280">
            Please visit the school office or pay online to clear dues and avoid late fee charges.
        </p>
        <div style="margin-top:32px;padding-top:24px;border-top:1px solid #E2E8F0;font-size:13px;color:#94A3B8;text-align:center">
            Automated reminder from <strong>${schoolName}</strong>. Do not reply to this email.
        </div>
    </div>`;

// ─────────────────────────────────────────────────────────────────────────────
// GET /accountant/dues/list
// Mirrors exactly how getStudentsWithFees works in fee.controller.js
// ─────────────────────────────────────────────────────────────────────────────
export const getDuesList = async (req, res) => {
    try {
    const school = req.user.school;
   const {
    search,
    classSearch,
    status,
    academicYear,
    page = 1,
    limit = 100,
} = req.query;

        const year = resolveYear(academicYear);

        // ── 1. Student filter (active only by default) ──────────────────────
        const studentFilter = { school, status: 'active' };
        if (status === 'Inactive') studentFilter.status = 'inactive';
        if (status === 'All')      delete studentFilter.status;  

        // ── 2. Fetch students + populate class/section names ────────────────
        let students = await Student.find(studentFilter)
            .populate('class',   'name')
            .populate('section', 'name')
            .lean();
        if (classSearch) {
            students = students.filter(s => {
                const label = normalizeClassDisplay(s.class?.name, s.section?.name);
                return label.toLowerCase().includes(classSearch.toLowerCase());
            });
        }

        if (!students.length) {
            return ok(res, {
                students: [], periods: [],
                summary: { totalDues: 0, totalStudents: 0, activeStudents: 0, inactiveStudents: 0 },
            });
        }

        // ── 3. Fetch User docs (for name/email) ─────────────────────────────
        const userIds  = students.map(s => s.user).filter(Boolean);
        const userDocs = await User.find({
            _id: { $in: userIds },
            ...(search ? { name: { $regex: search, $options: 'i' } } : {}),
        }).select('name email status').lean();

        const userMap        = {};
        const matchedUserIds = new Set();
        userDocs.forEach(u => {
            userMap[String(u._id)] = u;
            matchedUserIds.add(String(u._id));
        });
students = students.filter((s) => userMap[String(s.user)]);
        // Also match search on admissionNo
        if (search) {
            students = students.filter(s =>
                matchedUserIds.has(String(s.user)) ||
                (s.admissionNo  || '').toLowerCase().includes(search.toLowerCase()) ||
                (s.enrollmentNo || '').toLowerCase().includes(search.toLowerCase())
            );
        }

        // ── 4. Fetch Parents (keyed by student._id, same as fee controller) ─
        const studentIds = students.map(s => s._id);
        const parents    = await Parent.find({ students: { $in: studentIds } })
            .select('students fatherName motherName primaryContact profileExtras')
            .lean();

        const parentMap = {};
        parents.forEach(p => {
            p.students.forEach(sid => { parentMap[String(sid)] = p; });
        });

        // ── 5. Fetch FeeInstallments ─────────────────────────────────────────
        const installments = await FeeInstallment.find({
            school,
            academicYear: year,
            studentId: { $in: userIds },
        }).lean();

        const installmentMap = {};
        installments.forEach(fi => { installmentMap[String(fi.studentId)] = fi; });

        // ── 6. Late fee setting ──────────────────────────────────────────────
        const lateFeeSetting = await LateFeeSetting.findOne({ school, isActive: true }).lean();

        // ── 7. Build rows ────────────────────────────────────────────────────
        const allRows = students.map(s => {
            const userDoc   = userMap[String(s.user)]    || {};
            const parentDoc = parentMap[String(s._id)]   || {};
            const fi        = installmentMap[String(s.user)] || null;

            const totalFee       = fi?.netAmount      || 0;
            const paid           = fi?.totalPaid      || 0;
            const dues           = fi?.totalDue       || 0;

            // Resolve parent email
            const parentEmail =
                parentDoc?.profileExtras?.fatherEmail ||
                parentDoc?.profileExtras?.motherEmail || '';

            return {
                id:               String(s._id),
                userId:           String(s.user),
                name:             userDoc.name             || 'N/A',
                admissionNo:      s.admissionNo            || s.enrollmentNo || '—',
                rollNo:           s.rollNo                 || '',
                class:            s.class?.name            || '—',
                classId:          s.class?._id,
                section:          s.section?.name          || '—',
                sectionId:        s.section?._id,
                academicYear:     s.academicYear,
                fatherName:       parentDoc.fatherName     || '—',
                motherName:       parentDoc.motherName     || '—',
                phone:            parentDoc.primaryContact || s.phone || '—',
                email:            userDoc.email            || parentEmail || '—',
                parentEmail:      parentEmail              || userDoc.email || '—',
                address:          s.address                || '—',
                photo:            s.photo,
                // Frontend expects capitalised 'Active' / 'Inactive'
                status:           s.status === 'active' ? 'Active' : 'Inactive',
                totalFee,
                paid,
                dues,
                feeInstallmentId: fi?._id || null,
            };
        });

        // ── 8. Only defaulters (dues > 0) ────────────────────────────────────
        const dueRows = allRows.filter(r => r.dues > 0);

        // ── 9. Paginate ──────────────────────────────────────────────────────
        const pageNum   = Math.max(1, parseInt(page));
        const pageSize  = Math.max(1, Math.min(200, parseInt(limit)));
        const paginated = dueRows.slice((pageNum - 1) * pageSize, pageNum * pageSize);

        // ── 10. Summary ──────────────────────────────────────────────────────
        const totalDues        = dueRows.reduce((s, r) => s + r.dues, 0);
        const activeStudents   = dueRows.filter(r => r.status === 'Active').length;
        const inactiveStudents = dueRows.filter(r => r.status === 'Inactive').length;

        // ── 11. Periods dropdown (distinct classes among defaulters) ─────────
      const classMap = {};

students.forEach(s => {
    if (s.class?._id) {
        const key = String(s.class._id);

        if (!classMap[key]) {
            classMap[key] = {
                _id: s.class._id,
                gradeLevel: s.class.name,
            };
        }
    }
});

        return ok(res, {
            students: paginated,
            periods:  Object.values(classMap),
            summary: {
                totalDues,
                totalStudents:  dueRows.length,
                activeStudents,
                inactiveStudents,
            },
            pagination: {
                total:      dueRows.length,
                page:       pageNum,
                pageSize,
                totalPages: Math.ceil(dueRows.length / pageSize),
            },
        }, 'Dues list fetched');

    } catch (e) {
        console.error('[getDuesList]', e);
        return err(res, e.message);
    }
};

// ─────────────────────────────────────────────────────────────────────────────
// POST /accountant/dues/remind/:studentId
// ─────────────────────────────────────────────────────────────────────────────
export const sendDuesReminder = async (req, res) => {
    try {
        const school      = req.user.school;
        const { studentId } = req.params;
        const { subject: customSubject, message: customMessage } = req.body;

        // Fetch student the same way fee controller does
        const student = await Student.findOne({ _id: studentId, school })
            .populate('class',   'name')
            .populate('section', 'name')
            .lean();
        if (!student) return err(res, 'Student not found', 404);

        const [userDoc, parentDoc, fi] = await Promise.all([
            User.findById(student.user).select('name email').lean(),
            Parent.findOne({ students: student._id })
                .select('fatherName primaryContact profileExtras').lean(),
            FeeInstallment.findOne({
                studentId:    student.user,
                academicYear: resolveYear(req.query.academicYear),
                school,
            }).lean(),
        ]);

        const dueAmount = fi?.totalDue || 0;
        if (dueAmount <= 0) return err(res, 'No outstanding dues for this student', 400);

        const toEmail =
            parentDoc?.profileExtras?.fatherEmail ||
            parentDoc?.profileExtras?.motherEmail ||
            userDoc?.email;
        if (!toEmail) return err(res, 'No email address found for this student', 400);

        const studentName = userDoc?.name         || 'Student';
        const admissionNo = student.admissionNo   || student.enrollmentNo || '—';
        const className   = student.class?.name   || '—';
        const section     = student.section?.name || '';
        const schoolName  = process.env.BREVO_SENDER_NAME || 'School Management';

        const subject = customSubject || `Fee Payment Reminder – ${studentName} (${admissionNo})`;
        const html    = customMessage
            ? `<div style="font-family:Arial,sans-serif;padding:24px;color:#334155;white-space:pre-line">${customMessage}</div>`
            : buildReminderHtml(studentName, admissionNo, className, section, dueAmount, schoolName);

        await sendBrevoEmail(toEmail, studentName, subject, html);
        return ok(res, { studentId, emailSentTo: toEmail }, 'Reminder sent successfully');

    } catch (e) {
        console.error('[sendDuesReminder]', e);
        const message = e?.response?.text ? JSON.parse(e.response.text)?.message : e.message;
        return err(res, message || 'Failed to send reminder');
    }
};

// ─────────────────────────────────────────────────────────────────────────────
// POST /accountant/dues/remind-bulk
// ─────────────────────────────────────────────────────────────────────────────
export const sendBulkDuesReminder = async (req, res) => {
    try {
        const school     = req.user.school;
        const { studentIds = [], academicYear, subject: customSubject, message: customMessage } = req.body;
        const schoolName = process.env.BREVO_SENDER_NAME || 'School Management';
        const year       = resolveYear(academicYear);

        const studentFilter = { school, status: 'active' };
        if (studentIds.length) {
            studentFilter._id = {
                $in: studentIds
                    .filter(id => mongoose.Types.ObjectId.isValid(id))
                    .map(id => new mongoose.Types.ObjectId(id)),
            };
        }

        const students = await Student.find(studentFilter)
            .populate('class',   'name')
            .populate('section', 'name')
            .lean();
        if (!students.length) return err(res, 'No active students found', 404);

        const userIds = students.map(s => s.user).filter(Boolean);

        const [userDocs, parents, installments] = await Promise.all([
            User.find({ _id: { $in: userIds } }).select('name email').lean(),
            Parent.find({ students: { $in: students.map(s => s._id) } })
                .select('students profileExtras primaryContact fatherName').lean(),
            FeeInstallment.find({ studentId: { $in: userIds }, academicYear: year, school }).lean(),
        ]);

        const userMap = {};
        userDocs.forEach(u => { userMap[String(u._id)] = u; });

        const parentMap = {};
        parents.forEach(p => {
            p.students.forEach(sid => { parentMap[String(sid)] = p; });
        });

        const fiMap = {};
        installments.forEach(fi => { fiMap[String(fi.studentId)] = fi; });

        const results = { sent: [], failed: [], skipped: [] };

        const sendOne = async (s) => {
            const fi     = fiMap[String(s.user)] || null;
            const dueAmt = fi?.totalDue || 0;
            if (dueAmt <= 0) { results.skipped.push({ studentId: s._id, reason: 'No dues' }); return; }

            const userDoc   = userMap[String(s.user)]  || {};
            const parentDoc = parentMap[String(s._id)] || {};
            const toEmail   =
                parentDoc?.profileExtras?.fatherEmail ||
                parentDoc?.profileExtras?.motherEmail ||
                userDoc?.email;
            if (!toEmail) { results.skipped.push({ studentId: s._id, reason: 'No email' }); return; }

            try {
                const studentName = userDoc.name           || 'Student';
                const admissionNo = s.admissionNo          || s.enrollmentNo || '—';
                const className   = s.class?.name          || '—';
                const section     = s.section?.name        || '';
                const subject = customSubject || `Fee Payment Reminder – ${studentName} (${admissionNo})`;
                const html    = customMessage
                    ? `<div style="font-family:Arial,sans-serif;padding:24px;color:#334155;white-space:pre-line">${customMessage}</div>`
                    : buildReminderHtml(studentName, admissionNo, className, section, dueAmt, schoolName);
                await sendBrevoEmail(toEmail, studentName, subject, html);
                results.sent.push({ studentId: s._id, name: studentName, emailSentTo: toEmail });
            } catch (e) {
                results.failed.push({
                    studentId: s._id,
                    name: userMap[String(s.user)]?.name,
                    reason: e?.response?.text ? JSON.parse(e.response.text)?.message : e.message,
                });
            }
        };

        const BATCH = 10;
        for (let i = 0; i < students.length; i += BATCH) {
            await Promise.all(students.slice(i, i + BATCH).map(sendOne));
        }

        return ok(res, results,
            `Bulk reminder: ${results.sent.length} sent, ${results.failed.length} failed, ${results.skipped.length} skipped`
        );
    } catch (e) {
        console.error('[sendBulkDuesReminder]', e);
        return err(res, e.message);
    }
};

// ─────────────────────────────────────────────────────────────────────────────
// PATCH /accountant/dues/status/:studentId
// ─────────────────────────────────────────────────────────────────────────────
export const updateStudentStatus = async (req, res) => {
    try {
        const school      = req.user.school;
        const { studentId } = req.params;
        const { status }    = req.body;

        if (!['Active', 'Inactive'].includes(status))
            return err(res, "status must be 'Active' or 'Inactive'", 400);

        const student = await Student.findOne({ _id: studentId, school }).select('user').lean();
        if (!student) return err(res, 'Student not found', 404);

        await User.findByIdAndUpdate(student.user, { status: status.toLowerCase() });
        return ok(res, { studentId, status }, 'Student status updated');
    } catch (e) {
        console.error('[updateStudentStatus]', e);
        return err(res, e.message);
    }
};
