// features/marks/components/SubjectClassSelector.tsx
import { useState, useEffect } from 'react';
import { useMarks } from '../hooks/useMarks';
import { toast } from 'react-toastify';

interface SubjectClassSelectorProps {
  entryType: 'single' | 'term';
  selectedTerm?: { id: string; name: string; evaluations: number[] } | null;
  onStudentsLoaded: (students: any[], subjectId: number, classId: number, subjectName: string, className: string) => void;
  onBack: () => void;
}

interface Subject {
  id: number;
  name: string;
  classes: { id: number; name: string; }[];
}

export const SubjectClassSelector = ({ entryType, selectedTerm, onStudentsLoaded, onBack }: SubjectClassSelectorProps) => {
  const { getTeacherSubjects, getStudentsByClass, loading } = useMarks();
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [selectedSubject, setSelectedSubject] = useState<Subject | null>(null);
  const [selectedClass, setSelectedClass] = useState<{ id: number; name: string } | null>(null);
  const [loadingSubjects, setLoadingSubjects] = useState(false);

  useEffect(() => {
    loadSubjects();
  }, []);

  const loadSubjects = async () => {
    setLoadingSubjects(true);
    try {
      // This only returns subjects/classes the teacher is assigned to
      const data = await getTeacherSubjects();
      setSubjects(data);
    } catch (error) {
      toast.error('Failed to load subjects');
    } finally {
      setLoadingSubjects(false);
    }
  };

  const handleContinue = async () => {
    if (!selectedSubject || !selectedClass) {
      toast.error('Please select both subject and class');
      return;
    }

    const students = await getStudentsByClass(selectedClass.id);
    onStudentsLoaded(students, selectedSubject.id, selectedClass.id, selectedSubject.name, selectedClass.name);
  };

  const getTitle = () => {
    if (entryType === 'single') return 'Single Evaluation';
    return selectedTerm ? `${selectedTerm.name} (Evals ${selectedTerm.evaluations[0]} & ${selectedTerm.evaluations[1]})` : 'Term Entry';
  };

  if (loadingSubjects) {
    return (
      <div className="bg-white rounded-lg shadow-md p-8">
        <div className="text-center py-8">Loading your assigned subjects...</div>
      </div>
    );
  }

  if (subjects.length === 0) {
    return (
      <div className="bg-white rounded-lg shadow-md p-8">
        <div className="text-center py-8">
          <p className="text-gray-500">No subjects assigned to you.</p>
          <p className="text-sm text-gray-400 mt-2">Please contact the administrator.</p>
          <button onClick={onBack} className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-md">Go Back</button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto">
      <div className="bg-white rounded-xl shadow-md overflow-hidden">
        <div className="bg-blue-600 px-6 py-4 flex items-center justify-between">
          <button onClick={onBack} className="text-white hover:text-blue-200">← Back</button>
          <h2 className="text-lg font-semibold text-white">{getTitle()}</h2>
          <div className="w-16"></div>
        </div>

        <div className="p-6">
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Select Subject</label>
              <select
                value={selectedSubject?.id || ''}
                onChange={(e) => {
                  const subject = subjects.find(s => s.id === parseInt(e.target.value));
                  setSelectedSubject(subject || null);
                  setSelectedClass(null);
                }}
                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Choose a subject...</option>
                {subjects.map(s => (
                  <option key={s.id} value={s.id}>{s.name}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Select Class</label>
              <select
                value={selectedClass?.id || ''}
                onChange={(e) => {
                  const cls = selectedSubject?.classes.find(c => c.id === parseInt(e.target.value));
                  setSelectedClass(cls || null);
                }}
                disabled={!selectedSubject}
                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100"
              >
                <option value="">Choose a class...</option>
                {selectedSubject?.classes.map(c => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </div>

            <button
              onClick={handleContinue}
              disabled={!selectedSubject || !selectedClass || loading}
              className="w-full mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors"
            >
              {loading ? 'Loading...' : 'Continue to Marks Entry'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};