import api from './api';
import { jsPDF } from 'jspdf';
import 'jspdf-autotable';

export const fetchDropdownOptions = async () => {
  const response = await api.get('/admin/exams/dropdown-options');
  return response.data;
};

export const fetchAllSubjects = async () => {
  const response = await api.get('/admin/academic/subjects');
  return response.data;
};

export const createExam = async (payload) => {
  const response = await api.post('/admin/exams/create', payload);
  return response.data;
};

export const fetchExams = async (params = {}) => {
  const response = await api.get('/admin/exams/all', { params });
  return response.data;
};

export const updateExam = async (id, payload) => {
  const response = await api.put(`/admin/exams/update/${id}`, payload);
  return response.data;
};

export const deleteExam = async (id) => {
  const response = await api.delete(`/admin/exams/delete/${id}`);
  return response.data;
};

export const exportExamTimetableAsPdf = (rows = []) => {
  if (!rows.length) {
    return;
  }

  const doc = new jsPDF();

  // Add Title
  doc.setFontSize(18);
  doc.text('Exam Schedule', 14, 22);
  doc.setFontSize(11);
  doc.setTextColor(100);
  doc.text(`Generated on: ${new Date().toLocaleDateString()}`, 14, 30);

  // Prepare table headers and rows
  const tableColumn = [
    'Exam Name',
    'Class',
    'Subject',
    'Date',
    'Start Time',
    'End Time',
    'Created By'
  ];

  const tableRows = rows.map((row) => [
    row.examName || '',
    row.className || '',
    row.subject || '',
    row.examDate ? new Date(row.examDate).toLocaleDateString() : '',
    row.startTime || '',
    row.endTime || '',
    row.createdBy?.name || row.createdBy || 'Admin'
  ]);

  // Generate table
  doc.autoTable({
    startY: 35,
    head: [tableColumn],
    body: tableRows,
    theme: 'striped',
    headStyles: { fillColor: [37, 99, 235] },
    margin: { top: 35 },
  });

  // Save the PDF
  doc.save('Exam-Schedule.pdf');
};

// ─── Exam Structure APIs ──────────────────────────────────────────────────────

export const createExamStructure = async (payload) => {
  const response = await api.post('/admin/exams/structure', payload);
  return response.data;
};

export const fetchExamStructures = async () => {
  const response = await api.get('/admin/exams/structures');
  return response.data;
};

export const updateExamStructure = async (id, payload) => {
  const response = await api.put(`/admin/exams/structure/${id}`, payload);
  return response.data;
};

export const deleteExamStructure = async (id) => {
  const response = await api.delete(`/admin/exams/structure/${id}`);
  return response.data;
};
