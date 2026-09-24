import { BookOpen, CalendarDays, Clock3 } from 'lucide-react';
import {
  Button,
  DashGrid,
  Modal,
  Option,
  SelectField,
  DataField,
} from '../../shared/Common_Components.jsx';

const ExamFormModal = ({
  modalId = 'exam-form-modal',
  mode,
  form,
  setForm,
  onClose,
  onSubmit,
  classOptions = [],
  subjectOptions = [],
  submitting,
  dropdownLoading,
}) => {
  const hasRealClasses = Array.isArray(classOptions) && classOptions.length > 0;

  return (
    <Modal id={modalId} title={mode === 'edit' ? 'Edit Exam' : 'Add Exam'} size="lg" onClose={onClose}>
      <div className="p-2">
        <DashGrid cols={12} gap={4}>
          <DataField
            label="Exam Name"
            id="exam_name"
            icon={BookOpen}
            value={form.examName}
            onChange={(e) => setForm((prev) => ({ ...prev, examName: e.target.value }))}
            placeholder="Midterm / Final"
            size={6}
          />

          <div className="col-span-12 sm:col-span-6">
            <SelectField
              label="Class"
              id="exam_class"
              value={form.className}
              onChange={(e) => setForm((prev) => ({ ...prev, className: e.target.value, subject: '' }))}
              placeholder="Select class"
              searchable={false}
              size={12}
            >
              {dropdownLoading ? (
                <Option value="" label="Loading classes..." disabled />
              ) : !hasRealClasses ? (
                <Option value="" label="No classes found. Please create classes from Academics." disabled />
              ) : [
                <Option key="placeholder" value="" label="Select class" />,
                ...classOptions.map((item) => (
                  <Option key={item} value={item} label={item} />
                ))
              ]}
            </SelectField>
          </div>

          <div className="col-span-12 sm:col-span-6">
            <SelectField
              label="Subject"
              id="exam_subject"
              value={form.subject}
              onChange={(e) => setForm((prev) => ({ ...prev, subject: e.target.value }))}
              placeholder="Select subject"
              searchable={false}
              disabled={dropdownLoading || !form.className}
              size={12}
            >
              {dropdownLoading ? (
                <Option value="" label="Loading subjects..." disabled />
              ) : [
                <Option key="placeholder" value="" label="Select subject" />,
                ...subjectOptions.map((item) => (
                  <Option key={item} value={item} label={item} />
                ))
              ]}
            </SelectField>
          </div>

          <DataField
            label="Exam Date"
            id="exam_date"
            type="date"
            icon={CalendarDays}
            value={form.examDate}
            onChange={(e) => setForm((prev) => ({ ...prev, examDate: e.target.value }))}
            size={6}
          />
          <DataField
            label="Start Time"
            id="exam_start"
            type="time"
            icon={Clock3}
            value={form.startTime}
            onChange={(e) => setForm((prev) => ({ ...prev, startTime: e.target.value }))}
            size={3}
          />
          <DataField
            label="End Time"
            id="exam_end"
            type="time"
            icon={Clock3}
            value={form.endTime}
            onChange={(e) => setForm((prev) => ({ ...prev, endTime: e.target.value }))}
            size={3}
          />
        </DashGrid>

        <div className="mt-6">
          <DashGrid cols={12} gap={3}>
            <Button text="Cancel" variant="secondary" onClick={onClose} size={6} />
            <Button
              text={mode === 'edit' ? 'Update Exam' : 'Add Exam'}
              variant="primary"
              onClick={onSubmit}
              loading={submitting}
              size={6}
            />
          </DashGrid>
        </div>
      </div>
    </Modal>
  );
};

export default ExamFormModal;
