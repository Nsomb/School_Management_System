// src/features/marks/components/TermMarkForm.tsx
import { useState, useEffect, useCallback } from 'react';
import type { Student } from '../types/markTypes';
import { useMarks } from '../hooks/useMarks';
import { toast } from 'react-toastify';

interface TermConfig {
  id: string;
  name: string;
  evaluations: number[];
}

interface TermMarkFormProps {
  termConfig: TermConfig;
  subjectId: number;
  subjectName: string;
  classId: number;
  className: string;
  students: Student[];
  onBack: () => void;
}

interface StudentMark {
  student_id: number;
  student_name: string;
  evaluation1_score: number | null;
  evaluation2_score: number | null;
  is_exempt: boolean;
}

const TERM_EVALUATION_TYPES: Record<string, [string, string]> = {
  'Term 1': ['1st Evaluation', '2nd Evaluation'],
  'Term 2': ['3rd Evaluation', '4th Evaluation'],
  'Term 3': ['5th Evaluation', '6th Evaluation'],
};

export const TermMarkForm = ({
  termConfig,
  subjectId,
  subjectName,
  classId,
  className,
  students: initialStudents,
  onBack,
}: TermMarkFormProps) => {
  const { getTermMarks, submitTermMarks, getCompetency, loading } = useMarks();
  const [students, setStudents] = useState<StudentMark[]>([]);
  const [competency1, setCompetency1] = useState<string>('');
  const [competency2, setCompetency2] = useState<string>('');
  const [loadingData, setLoadingData] = useState(false);
  const [hasExistingMarks, setHasExistingMarks] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const loadData = useCallback(async () => {
    setLoadingData(true);
    try {
      const [evalType1, evalType2] = TERM_EVALUATION_TYPES[termConfig.id] || [];

      const comp1 = evalType1 ? await getCompetency(subjectId, classId, evalType1) : null;
      const comp2 = evalType2 ? await getCompetency(subjectId, classId, evalType2) : null;
      setCompetency1(comp1 || '');
      setCompetency2(comp2 || '');

      const response = await getTermMarks(subjectId, classId, termConfig.id);

      // Map: student_id -> { eval1, eval2, is_exempt }
      const marksMap: {
        [key: number]: { eval1: number | null; eval2: number | null; is_exempt: boolean };
      } = {};
      let hasMarks = false;

      if (response && response.marks) {
        response.marks.forEach((mark: any) => {
          const e1 = mark.evaluation1_score;
          const e2 = mark.evaluation2_score;
          const ex1 = mark.evaluation1_is_exempt === true;
          const ex2 = mark.evaluation2_is_exempt === true;

          marksMap[mark.student_id] = {
            eval1: e1,
            eval2: e2,
            // A student is exempt for the term if BOTH evaluations are exempt
            is_exempt: ex1 && ex2,
          };

          if (e1 !== null && e1 !== undefined) hasMarks = true;
          if (e2 !== null && e2 !== undefined) hasMarks = true;
        });
      }

      setHasExistingMarks(hasMarks);
      setStudents(
        initialStudents.map((student) => {
          const existing = marksMap[student.id];
          return {
            student_id: student.id,
            student_name: student.full_name,
            evaluation1_score: existing?.is_exempt ? null : existing?.eval1 ?? null,
            evaluation2_score: existing?.is_exempt ? null : existing?.eval2 ?? null,
            is_exempt: existing?.is_exempt ?? false,
          };
        })
      );
    } catch (error) {
      console.error('Error loading data:', error);
      toast.error('Failed to load data');
    } finally {
      setLoadingData(false);
    }
  }, [subjectId, classId, termConfig, initialStudents, getTermMarks, getCompetency]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const toggleExempt = (studentId: number) => {
    setStudents((prev) =>
      prev.map((student) =>
        student.student_id === studentId
          ? {
              ...student,
              is_exempt: !student.is_exempt,
              evaluation1_score: null,
              evaluation2_score: null,
            }
          : student
      )
    );
  };

  const handleScoreChange = (
    studentId: number,
    evaluation: 'evaluation1_score' | 'evaluation2_score',
    value: string
  ) => {
    const numValue = value === '' ? null : parseFloat(value);
    if (numValue !== null && (numValue < 0 || numValue > 20)) {
      toast.error('Score must be between 0 and 20');
      return;
    }
    setStudents((prev) =>
      prev.map((student) =>
        student.student_id === studentId
          ? { ...student, [evaluation]: numValue, is_exempt: false }
          : student
      )
    );
  };

  const getMissingScores = () => {
    const missing: string[] = [];
    students.forEach((student) => {
      if (!student.is_exempt) {
        if (student.evaluation1_score === null) missing.push(`${student.student_name} (Eval ${termConfig.evaluations[0]})`);
        if (student.evaluation2_score === null) missing.push(`${student.student_name} (Eval ${termConfig.evaluations[1]})`);
      }
    });
    return missing;
  };

  const handleSubmit = async () => {
    if (!competency1.trim() || !competency2.trim()) {
      toast.warning('Please enter competencies for both evaluations');
      return;
    }
    if (competency1.length > 100 || competency2.length > 100) {
      toast.error('Competencies must be 100 characters or less');
      return;
    }
    const missingScores = getMissingScores();
    if (missingScores.length > 0) {
      toast.warning(`${missingScores.length} score(s) missing.`);
      return;
    }

    // Send ALL students — including exempt ones
    const marksToSubmit = students.map((student) => ({
      student_id: student.student_id,
      evaluation1_score: student.is_exempt ? null : student.evaluation1_score,
      evaluation2_score: student.is_exempt ? null : student.evaluation2_score,
      is_exempt: student.is_exempt,
    }));

    setIsSubmitting(true);
    try {
      const result = await submitTermMarks({
        subject_id: subjectId,
        class_id: classId,
        term_type: termConfig.id,
        competency1: competency1.trim(),
        competency2: competency2.trim(),
        marks: marksToSubmit,
      });
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
    eval1Completed: students.filter(
      (s) => !s.is_exempt && s.evaluation1_score !== null && s.evaluation1_score !== undefined
    ).length,
    eval2Completed: students.filter(
      (s) => !s.is_exempt && s.evaluation2_score !== null && s.evaluation2_score !== undefined
    ).length,
    exempt: students.filter((s) => s.is_exempt).length,
    total: students.length,
  };
  const missingScores = getMissingScores();

  if (loadingData && students.length === 0) {
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
          <h2 className="text-sm sm:text-base font-semibold text-white truncate">
            {termConfig.name}: {subjectName}
          </h2>
          <p className="text-xs text-blue-100 truncate">{className}</p>
        </div>
        <div className="w-10 sm:w-16 flex-shrink-0" />
      </div>

      {/* Competencies */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-3 sm:p-5 border-b bg-gray-50">
        <div>
          <label className="block text-[11px] font-semibold text-gray-600 uppercase tracking-wide mb-1.5">
            Eval {termConfig.evaluations[0]} Competency <span className="text-red-500">*</span>
          </label>
          <textarea
            value={competency1}
            onChange={(e) => {
              if (e.target.value.length <= 100) setCompetency1(e.target.value);
            }}
            placeholder="Describe competency..."
            className="w-full p-2 text-sm border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 resize-none"
            rows={2}
            maxLength={100}
          />
          <div className="flex justify-end text-[10px] text-gray-400 -mt-1">
            {competency1.length}/100
          </div>
        </div>
        <div>
          <label className="block text-[11px] font-semibold text-gray-600 uppercase tracking-wide mb-1.5">
            Eval {termConfig.evaluations[1]} Competency <span className="text-red-500">*</span>
          </label>
          <textarea
            value={competency2}
            onChange={(e) => {
              if (e.target.value.length <= 100) setCompetency2(e.target.value);
            }}
            placeholder="Describe competency..."
            className="w-full p-2 text-sm border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 resize-none"
            rows={2}
            maxLength={100}
          />
          <div className="flex justify-end text-[10px] text-gray-400 -mt-1">
            {competency2.length}/100
          </div>
        </div>
      </div>

      {/* Stats bar */}
      <div className="px-3 sm:px-6 py-2 bg-blue-50 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs sm:text-sm border-b">
        <span className="font-medium text-gray-700">Active: {stats.active}/{stats.total}</span>
        <span className="text-gray-500">Eval {termConfig.evaluations[0]}: {stats.eval1Completed}</span>
        <span className="text-gray-500">Eval {termConfig.evaluations[1]}: {stats.eval2Completed}</span>
        {stats.exempt > 0 && <span className="text-gray-500">{stats.exempt} exempt</span>}
        {missingScores.length > 0 && (
          <span className="text-red-600 font-semibold ml-auto">{missingScores.length} missing</span>
        )}
      </div>

      {/* Column header — no row numbers */}
      {!loadingData && students.length > 0 && (
        <div className="hidden md:grid sticky top-0 z-10 grid-cols-[1fr_120px_120px_120px] gap-4 px-6 py-2 bg-gray-100 border-b text-[11px] font-semibold text-gray-600 uppercase tracking-wide">
          <span>Student Name</span>
          <span className="text-center text-blue-700">Eval {termConfig.evaluations[0]}</span>
          <span className="text-center text-green-700">Eval {termConfig.evaluations[1]}</span>
          <span className="text-center">Status</span>
        </div>
      )}

      {/* Rows — auto-sized columns on mobile so the name gets the leftover space */}
      {loadingData ? (
        <div className="p-8 text-center text-gray-500">Loading...</div>
      ) : students.length === 0 ? (
        <div className="p-8 text-center text-gray-500">No students in this class yet.</div>
      ) : (
        <div className="divide-y">
          {students.map((student) => {
            const hasEval1 = student.evaluation1_score !== null && student.evaluation1_score !== undefined;
            const hasEval2 = student.evaluation2_score !== null && student.evaluation2_score !== undefined;
            return (
              <div
                key={student.student_id}
                className={`grid grid-cols-[1fr_auto_auto_auto] md:grid-cols-[1fr_120px_120px_120px] gap-1.5 sm:gap-4 px-3 sm:px-6 py-2.5 items-center ${
                  student.is_exempt ? 'bg-gray-50' : 'hover:bg-gray-50'
                }`}
              >
                <span
                  className={`text-sm min-w-0 truncate ${
                    student.is_exempt ? 'text-gray-400 italic' : 'text-gray-800 font-medium'
                  }`}
                  title={student.student_name}
                >
                  {student.student_name}
                </span>

                <div className="flex justify-center">
                  {!student.is_exempt ? (
                    <input
                      type="number"
                      min="0"
                      max="20"
                      step="0.5"
                      value={student.evaluation1_score ?? ''}
                      onChange={(e) =>
                        handleScoreChange(student.student_id, 'evaluation1_score', e.target.value)
                      }
                      className={`w-12 sm:w-20 px-1 sm:px-2 py-1.5 text-sm text-center border rounded-md focus:ring-2 focus:ring-blue-500 ${
                        hasEval1
                          ? 'border-green-400 bg-green-50 font-semibold text-green-800'
                          : 'border-gray-300'
                      }`}
                      placeholder="–"
                    />
                  ) : (
                    <span className="text-xs text-gray-400 italic">—</span>
                  )}
                </div>

                <div className="flex justify-center">
                  {!student.is_exempt ? (
                    <input
                      type="number"
                      min="0"
                      max="20"
                      step="0.5"
                      value={student.evaluation2_score ?? ''}
                      onChange={(e) =>
                        handleScoreChange(student.student_id, 'evaluation2_score', e.target.value)
                      }
                      className={`w-12 sm:w-20 px-1 sm:px-2 py-1.5 text-sm text-center border rounded-md focus:ring-2 focus:ring-blue-500 ${
                        hasEval2
                          ? 'border-green-400 bg-green-50 font-semibold text-green-800'
                          : 'border-gray-300'
                      }`}
                      placeholder="–"
                    />
                  ) : (
                    <span className="text-xs text-gray-400 italic">—</span>
                  )}
                </div>

                <div className="flex justify-center">
                  <button
                    onClick={() => toggleExempt(student.student_id)}
                    className={`px-1.5 sm:px-3 py-1.5 text-[11px] sm:text-xs font-medium rounded-md transition-colors whitespace-nowrap ${
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
          disabled={isSubmitting || loadingData || loading}
          className={`w-full py-3 text-sm font-semibold rounded-md transition-colors ${
            isSubmitting || loadingData || loading
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
        {missingScores.length > 0 && (
          <p className="text-xs text-red-500 text-center mt-2">
            {missingScores.length} score(s) missing
          </p>
        )}
        {(!competency1.trim() || !competency2.trim()) && !loadingData && (
          <p className="text-xs text-amber-500 text-center mt-1">Both competencies are required</p>
        )}
      </div>
    </div>
  );
};
