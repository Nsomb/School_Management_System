// src/features/marks/components/MarkForm.tsx
import { useState, useEffect, useCallback } from 'react';
import type { Student, MarkFormData } from '../types/markTypes';
import { useMarks } from '../hooks/useMarks';
import { toast } from 'react-toastify';

interface MarkFormProps {
  subjectId: number;
  subjectName: string;
  classId: number;
  className: string;
  students: Student[];
  onBack: () => void;
}

interface StudentWithExempt {
  id: number;
  full_name: string;
  is_exempt: boolean;
  score: number | null;
}

const evaluationTypes = [
  '1st Evaluation',
  '2nd Evaluation',
  '3rd Evaluation',
  '4th Evaluation',
  '5th Evaluation',
  '6th Evaluation',
];

export const MarkForm = ({
  subjectId,
  subjectName,
  classId,
  className,
  students: initialStudents,
  onBack,
}: MarkFormProps) => {
  const { submitMarksBatch, getCompetency, getExistingMarks, loading } = useMarks();
  const [students, setStudents] = useState<StudentWithExempt[]>([]);
  const [selectedEvaluationType, setSelectedEvaluationType] = useState<string>(evaluationTypes[0]);
  const [competency, setCompetency] = useState<string>('');
  const [isLoadingMarks, setIsLoadingMarks] = useState(false);
  const [hasExistingMarks, setHasExistingMarks] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const loadData = useCallback(async () => {
    if (!subjectId || !classId || !selectedEvaluationType) return;
    setIsLoadingMarks(true);
    try {
      const existingCompetency = await getCompetency(subjectId, classId, selectedEvaluationType);
      setCompetency(existingCompetency || '');

      const existingData = await getExistingMarks(subjectId, classId, selectedEvaluationType);

      // Build a map of student_id -> { score, is_exempt }
      const marksMap: { [key: number]: { score: number | null; is_exempt: boolean } } = {};
      if (existingData && existingData.marks) {
        existingData.marks.forEach((mark: any) => {
          marksMap[mark.student_id] = {
            score: mark.score ?? null,
            is_exempt: mark.is_exempt === true,
          };
        });
        setHasExistingMarks(existingData.existing_count > 0);
      }

      // Merge with full student list so we show every student in the class
      setStudents(
        initialStudents.map((student) => {
          const existing = marksMap[student.id];
          return {
            id: student.id,
            full_name: student.full_name,
            is_exempt: existing?.is_exempt ?? false,
            // If exempt, force score to null (it will be saved as null)
            score: existing?.is_exempt ? null : existing?.score ?? null,
          };
        })
      );
    } catch (error) {
      console.error('Error loading data:', error);
      toast.error('Failed to load existing data');
    } finally {
      setIsLoadingMarks(false);
    }
  }, [subjectId, classId, selectedEvaluationType, getCompetency, getExistingMarks, initialStudents]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const toggleExempt = (studentId: number) => {
    setStudents((prev) =>
      prev.map((student) =>
        student.id === studentId
          ? { ...student, is_exempt: !student.is_exempt, score: null }
          : student
      )
    );
  };

  const handleScoreChange = (studentId: number, value: string) => {
    const score = value === '' ? null : parseFloat(value);
    if (score !== null && (score < 0 || score > 20)) {
      toast.error('Score must be between 0 and 20');
      return;
    }
    setStudents((prev) =>
      prev.map((student) =>
        student.id === studentId
          ? { ...student, score, is_exempt: false }
          : student
      )
    );
  };

  const getMissingCount = () =>
    students.filter((s) => !s.is_exempt && s.score === null).length;

  const handleSubmit = async () => {
    if (!competency.trim()) {
      toast.warning('Please enter the competency before saving.');
      return;
    }
    if (competency.length > 100) {
      toast.error('Competency must be 100 characters or less.');
      return;
    }
    const missingCount = getMissingCount();
    if (missingCount > 0) {
      toast.warning(`${missingCount} student(s) need scores. Fill all marks or mark as exempt.`);
      return;
    }

    // Send ALL students — including exempt ones (with score=null, is_exempt=true)
    const marksToSubmit = students.map((s) => ({
      student_id: s.id,
      score: s.is_exempt ? null : s.score,
      is_exempt: s.is_exempt,
    }));

    if (marksToSubmit.length === 0) {
      toast.warning('No students to save.');
      return;
    }

    setIsSubmitting(true);
    try {
      const formData: any = {
        subject_id: subjectId,
        class_id: classId,
        evaluation_type: selectedEvaluationType,
        competency: competency.trim(),
        marks: marksToSubmit,
      };
      const result = await submitMarksBatch(formData);
      if (result) {
        toast.success(`✓ ${marksToSubmit.length} entries saved!`, {
          position: 'top-center',
          autoClose: 2500,
        });
        setHasExistingMarks(true);
        await loadData();
      } else {
        toast.error('Failed to save marks.');
      }
    } catch (error: any) {
      toast.error(error.message || 'Failed to save marks');
    } finally {
      setIsSubmitting(false);
    }
  };

  const stats = {
    active: students.filter((s) => !s.is_exempt).length,
    completed: students.filter((s) => !s.is_exempt && s.score !== null).length,
    exempt: students.filter((s) => s.is_exempt).length,
    total: students.length,
  };
  const missingCount = getMissingCount();

  if (isLoadingMarks && students.length === 0) {
    return (
      <div className="bg-white rounded-xl shadow-md p-8 text-center text-gray-500 w-full max-w-7xl mx-auto">
        Loading marks...
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg sm:rounded-xl shadow-md overflow-hidden w-full max-w-7xl mx-auto">
      {/* Header */}
      <div className="bg-blue-700 px-3 sm:px-6 py-3 flex items-center justify-between gap-3">
        <button
          onClick={onBack}
          className="text-white hover:text-blue-200 text-sm font-medium flex items-center gap-1 flex-shrink-0"
        >
          <span className="text-lg leading-none">←</span>
          <span className="hidden sm:inline">Back</span>
        </button>
        <div className="text-center min-w-0 flex-1">
          <h2 className="text-sm sm:text-base font-semibold text-white truncate">{subjectName}</h2>
          <p className="text-xs text-blue-100 truncate">{className}</p>
        </div>
        <div className="w-10 sm:w-16 flex-shrink-0" />
      </div>

      {/* Evaluation + Competency */}
      <div className="grid grid-cols-1 lg:grid-cols-[240px_1fr] gap-3 p-3 sm:p-5 border-b bg-gray-50">
        <div>
          <label className="block text-[11px] font-semibold text-gray-600 uppercase tracking-wide mb-1.5">
            Evaluation Type
          </label>
          <select
            value={selectedEvaluationType}
            onChange={(e) => setSelectedEvaluationType(e.target.value)}
            className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white"
            disabled={isLoadingMarks}
          >
            {evaluationTypes.map((type) => (
              <option key={type} value={type}>{type}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-[11px] font-semibold text-gray-600 uppercase tracking-wide mb-1.5">
            Competency <span className="text-red-500">*</span>
            <span className="text-gray-400 font-normal ml-2 normal-case">(max 100 chars)</span>
          </label>
          <textarea
            value={competency}
            onChange={(e) => {
              if (e.target.value.length <= 100) setCompetency(e.target.value);
            }}
            placeholder="Describe the competency being assessed..."
            className="w-full p-2 text-sm border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none"
            rows={2}
            maxLength={100}
          />
          <div className="flex justify-end text-[10px] text-gray-400 -mt-1">
            {competency.length}/100
          </div>
        </div>
      </div>

      {/* Stats bar */}
      <div className="px-3 sm:px-6 py-2 bg-blue-50 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs sm:text-sm border-b">
        <span className="font-medium text-gray-700">{stats.completed}/{stats.active} entered</span>
        {stats.exempt > 0 && (
          <span className="text-gray-500">{stats.exempt} exempt</span>
        )}
        <span className="text-gray-500">Total: {stats.total}</span>
        {missingCount > 0 && (
          <span className="text-red-600 font-semibold ml-auto">{missingCount} missing</span>
        )}
      </div>

      {/* Column header (Desktop) — NO row-number column */}
      {!isLoadingMarks && students.length > 0 && (
        <div className="hidden md:grid sticky top-0 z-10 grid-cols-[1fr_120px_120px] gap-4 px-6 py-2 bg-gray-100 border-b text-[11px] font-semibold text-gray-600 uppercase tracking-wide">
          <span>Student Name</span>
          <span className="text-center">Score (/20)</span>
          <span className="text-center">Status</span>
        </div>
      )}

      {/* Rows — auto-sized columns on mobile so the name gets the leftover space */}
      {isLoadingMarks ? (
        <div className="p-8 text-center text-gray-500">Loading...</div>
      ) : students.length === 0 ? (
        <div className="p-8 text-center text-gray-500">No students in this class yet.</div>
      ) : (
        <div className="divide-y">
          {students.map((student) => {
            const hasScore = student.score !== null && student.score !== undefined;
            return (
              <div
                key={student.id}
                className={`grid grid-cols-[1fr_auto_auto] md:grid-cols-[1fr_120px_120px] gap-2 sm:gap-4 px-3 sm:px-6 py-2.5 items-center ${
                  student.is_exempt ? 'bg-gray-50' : 'hover:bg-gray-50'
                }`}
              >
                <span
                  className={`text-sm min-w-0 truncate ${
                    student.is_exempt ? 'text-gray-400 italic' : 'text-gray-800 font-medium'
                  }`}
                  title={student.full_name}
                >
                  {student.full_name}
                </span>

                <div className="flex justify-center">
                  {!student.is_exempt ? (
                    <input
                      type="number"
                      min="0"
                      max="20"
                      step="0.5"
                      value={student.score ?? ''}
                      onChange={(e) => handleScoreChange(student.id, e.target.value)}
                      className={`w-14 sm:w-20 px-1.5 sm:px-2 py-1.5 text-sm text-center border rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                        hasScore
                          ? 'border-green-400 bg-green-50 font-semibold text-green-800'
                          : 'border-gray-300'
                      }`}
                      placeholder="–"
                    />
                  ) : (
                    <span className="text-xs text-gray-400 italic whitespace-nowrap">Exempt</span>
                  )}
                </div>

                <div className="flex justify-center">
                  <button
                    onClick={() => toggleExempt(student.id)}
                    className={`px-2 sm:px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap ${
                      student.is_exempt
                        ? 'bg-green-100 hover:bg-green-200 text-green-700'
                        : 'bg-gray-100 hover:bg-gray-200 text-gray-600'
                    }`}
                  >
                    {student.is_exempt ? 'Offering' : 'Exempt'}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Submit */}
      <div className="p-3 sm:p-5 border-t bg-gray-50 sticky bottom-0">
        <button
          onClick={handleSubmit}
          disabled={isSubmitting || isLoadingMarks || loading}
          className={`w-full py-3 text-sm font-semibold rounded-md transition-colors ${
            isSubmitting || isLoadingMarks || loading
              ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
              : 'bg-blue-600 text-white hover:bg-blue-700'
          }`}
        >
          {isSubmitting
            ? 'Saving...'
            : loading
            ? 'Loading...'
            : `${hasExistingMarks ? 'Update' : 'Save'} Marks (${stats.total} students)`}
        </button>
        {missingCount > 0 && (
          <p className="text-xs text-red-500 text-center mt-2">
            {missingCount} student(s) still need scores
          </p>
        )}
        {!competency.trim() && !isLoadingMarks && (
          <p className="text-xs text-amber-500 text-center mt-1">Competency is required</p>
        )}
      </div>
    </div>
  );
};
