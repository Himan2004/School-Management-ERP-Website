import React, { useState, useEffect } from "react";
import { X, ChevronRight, AlertCircle, CheckCircle2 } from "lucide-react";
import toast from "react-hot-toast";
import { AnimatePresence, motion } from "framer-motion";
import { createPortal } from "react-dom";
import { 
  getPrincipalClassSubjects, 
  createPrincipalExamStructure 
} from "../../../services/api/principalExamApi";

const StepIndicator = ({ stepNumber, active, label }) => (
  <div className={`flex items-center gap-2 ${active ? "opacity-100" : "opacity-50"}`}>
    <div
      className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold ${active ? "bg-[#223F74] text-white shadow-md shadow-[#223F74]/20" : "bg-slate-200 text-slate-500"
        }`}
    >
      {stepNumber}
    </div>
    <span className={`text-sm font-bold ${active ? "text-[#223F74]" : "text-slate-500"}`}>
      {label}
    </span>
  </div>
);

const CreateExamStructureModal = ({ isOpen, onClose, availableClasses, onSuccess }) => {
  const [step, setStep] = useState(1);
  const [publishLoading, setPublishLoading] = useState(false);
  const [loadingSubjects, setLoadingSubjects] = useState(false);

  const sessionOptions = (() => {
    const now = new Date();
    const y = now.getFullYear();
    const startYear = now.getMonth() < 3 ? y - 1 : y;
    return [startYear, startYear + 1, startYear + 2].map(
      (yr) => `${yr}-${String(yr + 1).slice(-2)}`
    );
  })();

  const defaultSession = (() => {
    const now = new Date();
    const y = now.getFullYear();
    const startYear = now.getMonth() < 3 ? y - 1 : y;
    return `${startYear}-${String(startYear + 1).slice(-2)}`;
  })();

  const [examFormData, setExamFormData] = useState({
    name: "",
    session: defaultSession,
    examType: "Unit Test",
  });
  const [selectedClassId, setSelectedClassId] = useState("");
  const [subjectList, setSubjectList] = useState([]);
  const [subjectMappings, setSubjectMappings] = useState({});

  useEffect(() => {
    if (isOpen) {
      setStep(1);
      setExamFormData({
        name: "",
        session: defaultSession,
        examType: "Unit Test",
      });
      setSelectedClassId("");
      setSubjectList([]);
      setSubjectMappings({});
    }
  }, [isOpen]);

  // Fetch actual subjects from the backend when a class is selected
  useEffect(() => {
    if (selectedClassId) {
      const fetchSubjects = async () => {
        setLoadingSubjects(true);
        try {
          const res = await getPrincipalClassSubjects(selectedClassId);
          if (res.success && res.data) {
            setSubjectList(res.data);
            const initialMappings = {};
            res.data.forEach((sub) => {
              initialMappings[sub._id] = {
                subjectId: sub._id,
                maxMarks: "100",
                passMarks: "33",
                examDate: "",
              };
            });
            setSubjectMappings(initialMappings);
          } else {
            setSubjectList([]);
          }
        } catch (error) {
          toast.error("Failed to load subjects for this class.");
        } finally {
          setLoadingSubjects(false);
        }
      };
      fetchSubjects();
    } else {
      setSubjectList([]);
      setSubjectMappings({});
    }
  }, [selectedClassId]);

  const handleMappingChange = (subjectId, field, value) => {
    setSubjectMappings((prev) => ({
      ...prev,
      [subjectId]: {
        ...prev[subjectId],
        [field]: value,
      },
    }));
  };

  const handleNextStep = () => {
    if (step === 1) {
      if (!examFormData.name || !examFormData.session || !selectedClassId) {
        toast.error("Please fill in Exam Title, Session, and Target Class.");
        return;
      }
      setStep(2);
    } else if (step === 2) {
      setStep(3);
    }
  };

  const handlePublish = async () => {
    setPublishLoading(true);
    try {
      const subjectMarkings = Object.values(subjectMappings).map((mapping) => ({
        subject: mapping.subjectId,
        totalMaxMarks: parseInt(mapping.maxMarks) || 100,
        passMarks: parseInt(mapping.passMarks) || 33,
        // NO examDate here — that belongs in exam schedule
      }));

      const payload = {
        examName: examFormData.name,
        academicSession: examFormData.session,
        examType: examFormData.examType,
        applicableClasses: [selectedClassId],
        subjectMarkings,
      };

      await createPrincipalExamStructure(payload);
      toast.success("Exam Structure published successfully!");
      if (onSuccess) onSuccess();
      onClose();
    } catch (error) {
      const msg = error?.response?.data?.message || error?.message || "Failed to create exam structure";
      toast.error(msg);
    } finally {
      setPublishLoading(false);
    }
  };

  return createPortal(
    <AnimatePresence>
      {isOpen && (
        <motion.div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
        >
          <motion.div
            className="bg-white w-full max-w-4xl rounded-3xl shadow-2xl flex flex-col overflow-hidden my-8 max-h-[90vh]"
            initial={{ opacity: 0, scale: 0.95, y: 16 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 16 }}
            transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
          >
            {/* Header */}
            <div className="flex items-center justify-between p-6 border-b border-slate-100 bg-slate-50/50">
              <div>
                <h2 className="text-xl font-black text-[#223F74]">Create New Exam Structure</h2>
                <p className="text-sm text-slate-500 font-medium">Configure structure details and subject mappings</p>
              </div>
              <button onClick={onClose} className="p-2 bg-white hover:bg-slate-100 rounded-full transition-colors border border-slate-200">
                <X className="w-5 h-5 text-slate-500" />
              </button>
            </div>

            {/* Stepper Header */}
            <div className="flex items-center gap-3 bg-white p-6 border-b border-slate-100 overflow-x-auto">
              <StepIndicator stepNumber={1} active={step >= 1} label="General Info" />
              <div className="hidden sm:flex flex-1 items-center justify-center">
                <ChevronRight className="text-slate-300 w-5 h-5" />
              </div>
              <StepIndicator stepNumber={2} active={step >= 2} label="Subject Mapping" />
              <div className="hidden sm:flex flex-1 items-center justify-center">
                <ChevronRight className="text-slate-300 w-5 h-5" />
              </div>
              <StepIndicator stepNumber={3} active={step >= 3} label="Marking & Finalize" />
            </div>

            {/* Body */}
            <div className="p-6 sm:p-8 overflow-y-auto custom-scrollbar flex-1 bg-slate-50/30">
              <AnimatePresence mode="wait">
                {step === 1 && (
                  <motion.div
                    key="step1"
                    className="space-y-6"
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -8 }}
                    transition={{ duration: 0.18 }}
                  >
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                      <div>
                        <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Exam Title</label>
                        <input
                          type="text"
                          placeholder="e.g. Sessional Test 1"
                          value={examFormData.name}
                          onChange={(e) => setExamFormData({ ...examFormData, name: e.target.value })}
                          className="w-full px-4 py-3.5 text-sm font-medium text-slate-700 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-[#F59B87]/20 focus:border-[#F59B87] outline-none transition-all"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Academic Session</label>
                        <select
                          value={examFormData.session}
                          onChange={(e) => setExamFormData({ ...examFormData, session: e.target.value })}
                          className="w-full px-4 py-3.5 text-sm font-medium text-slate-700 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-[#F59B87]/20 focus:border-[#F59B87] outline-none transition-all cursor-pointer"
                        >
                          {sessionOptions.map((s) => (
                            <option key={s} value={s}>
                              {s}{s === defaultSession ? " (Current)" : ""}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Target Class</label>
                        <select
                          value={selectedClassId}
                          onChange={(e) => setSelectedClassId(e.target.value)}
                          className="w-full px-4 py-3.5 text-sm font-medium text-slate-700 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-[#F59B87]/20 focus:border-[#F59B87] outline-none transition-all"
                        >
                          <option value="">Select Class</option>
                          {availableClasses.map((cls) => (
                            <option key={cls._id || cls.id} value={cls._id || cls.id}>
                              {cls.name}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Exam Type</label>
                        <select
                          value={examFormData.examType}
                          onChange={(e) => setExamFormData({ ...examFormData, examType: e.target.value })}
                          className="w-full px-4 py-3.5 text-sm font-medium text-slate-700 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-[#F59B87]/20 focus:border-[#F59B87] outline-none transition-all"
                        >
                          <option value="Unit Test">Unit Test</option>
                          <option value="Class Test">Class Test</option>
                          <option value="Mid Term">Mid-Year (Half Yearly)</option>
                          <option value="Term Exam">Term Exam</option>
                          <option value="Final Term">Terminal (Annual)</option>
                          <option value="Pre Board">Pre-Board</option>
                          <option value="Board">Board Exam</option>
                        </select>
                      </div>
                    </div>
                    <div className="bg-blue-50/50 p-5 rounded-2xl border border-blue-100 flex gap-3 items-start mt-6">
                      <AlertCircle className="text-blue-600 shrink-0" size={20} />
                      <p className="text-sm text-blue-700 leading-relaxed font-semibold">
                        Setting the Target Class will automatically fetch all registered subjects for mapping in the next step.
                      </p>
                    </div>
                  </motion.div>
                )}

                {step === 2 && (
                  <motion.div
                    key="step2"
                    className="space-y-4"
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -16 }}
                    transition={{ duration: 0.18 }}
                  >
                    <h4 className="text-sm font-bold text-[#223F74] uppercase tracking-wider mb-4">Map Marks & Dates for Subjects</h4>
                    
                    {loadingSubjects ? (
                      <div className="p-8 flex justify-center items-center text-slate-500 bg-white rounded-2xl border border-dashed border-slate-300">
                        Loading subjects...
                      </div>
                    ) : subjectList.length === 0 ? (
                      <div className="p-8 text-center text-slate-500 bg-white rounded-2xl border border-dashed border-slate-300 text-sm font-semibold">
                        {selectedClassId ? "No subjects found for this class." : "Please select a class in Step 1 first."}
                      </div>
                    ) : (
                      <div className="space-y-3">
                        {/* In the subjectList.map() block, in step 2: */}
                        {subjectList.map((sub, i) => {
                          const mapping = subjectMappings[sub._id] || {};
                          return (
                            <div key={sub._id || i} className="flex flex-col md:flex-row md:items-center gap-4 p-4 border border-slate-200 rounded-2xl bg-white shadow-sm">
                              <div className="w-full sm:w-1/3 font-bold text-[#223F74] text-sm">
                                {sub.subjectName || sub.name}
                              </div>
                              <div className="flex-1 grid grid-cols-2 gap-3">
                                <input
                                  type="number"
                                  placeholder="Max Marks"
                                  value={mapping.maxMarks || ""}
                                  onChange={(e) => handleMappingChange(sub._id, "maxMarks", e.target.value)}
                                  className="border border-slate-200 rounded-xl p-2.5 text-sm font-semibold focus:outline-none focus:border-[#F59B87] focus:ring-1 focus:ring-[#F59B87] bg-slate-50 text-center"
                                />
                                <input
                                  type="number"
                                  placeholder="Pass Marks"
                                  value={mapping.passMarks || ""}
                                  onChange={(e) => handleMappingChange(sub._id, "passMarks", e.target.value)}
                                  className="border border-slate-200 rounded-xl p-2.5 text-sm font-semibold focus:outline-none focus:border-[#F59B87] focus:ring-1 focus:ring-[#F59B87] bg-slate-50 text-center"
                                />
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </motion.div>
                )}

                {step === 3 && (
                  <motion.div
                    key="step3"
                    className="text-center space-y-4 py-10"
                    initial={{ opacity: 0, scale: 0.96 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.96 }}
                    transition={{ duration: 0.2 }}
                  >
                    <div className="w-20 h-20 bg-[#223F74]/5 text-[#223F74] border border-[#223F74]/10 rounded-full flex items-center justify-center mx-auto mb-4 shadow-sm animate-bounce">
                      <CheckCircle2 size={40} />
                    </div>
                    <h2 className="text-2xl font-black text-[#223F74]">Ready to Publish?</h2>
                    <p className="text-slate-500 text-sm max-w-sm mx-auto">
                      Review all the exam timings and subject mapping. Once published, you can use this structure to schedule exams.
                    </p>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Footer Actions */}
            <div className="p-6 border-t border-slate-100 bg-white flex justify-end gap-3">
              {step > 1 && (
                <button
                  onClick={() => setStep(step - 1)}
                  disabled={publishLoading}
                  className="px-6 py-3 rounded-xl font-bold text-[#223F74] bg-[#223F74]/5 hover:bg-[#223F74]/10 transition-colors"
                >
                  Previous
                </button>
              )}

              {step < 3 ? (
                <button
                  onClick={handleNextStep}
                  className="px-8 py-3 rounded-xl font-bold text-white bg-[#223F74] hover:bg-[#1b325c] transition-all shadow-md shadow-[#223F74]/20 active:scale-95"
                >
                  Next Step
                </button>
              ) : (
                <button
                  onClick={handlePublish}
                  disabled={publishLoading}
                  className="px-8 py-3 rounded-xl font-bold text-white bg-[#F59B87] hover:bg-[#e08976] transition-all shadow-lg shadow-[#F59B87]/30 active:scale-95 flex items-center gap-2"
                >
                  {publishLoading ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      Publishing...
                    </>
                  ) : (
                    "Publish Exam Structure"
                  )}
                </button>
              )}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body
  );
};

export default CreateExamStructureModal;