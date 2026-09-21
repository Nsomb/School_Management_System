// features/marks/components/MarksSelector.tsx
import { useState } from 'react';
import { MarkForm } from './MarkForm';
import { TermMarkForm } from './TermMarkForm';
import { SubjectClassSelector } from './SubjectClassSelector';

type EntryType = 'single' | 'term' | null;

interface TermConfig {
  id: string;
  name: string;
  evaluations: number[];
}

const termConfigs: TermConfig[] = [
  { id: 'Term 1', name: 'Term 1', evaluations: [1, 2] },
  { id: 'Term 2', name: 'Term 2', evaluations: [3, 4] },
  { id: 'Term 3', name: 'Term 3', evaluations: [5, 6] },
];

export const MarksSelector = () => {
  const [entryType, setEntryType] = useState<EntryType>(null);
  const [selectedTerm, setSelectedTerm] = useState<TermConfig | null>(null);
  const [selectedSubjectId, setSelectedSubjectId] = useState<number | null>(null);
  const [selectedSubjectName, setSelectedSubjectName] = useState<string>('');
  const [selectedClassId, setSelectedClassId] = useState<number | null>(null);
  const [selectedClassName, setSelectedClassName] = useState<string>('');
  const [students, setStudents] = useState<any[]>([]);

  const handleSingleSelect = () => {
    setEntryType('single');
    setSelectedTerm(null);
  };

  const handleTermSelect = (term: TermConfig) => {
    setEntryType('term');
    setSelectedTerm(term);
  };

  const handleBack = () => {
    setEntryType(null);
    setSelectedTerm(null);
    setSelectedSubjectId(null);
    setSelectedClassId(null);
    setStudents([]);
  };

  const handleStudentsLoaded = (studentsData: any[], subjectId: number, classId: number, subjectName: string, className: string) => {
    setStudents(studentsData);
    setSelectedSubjectId(subjectId);
    setSelectedSubjectName(subjectName);
    setSelectedClassId(classId);
    setSelectedClassName(className);
  };

  if (entryType === 'single' && selectedSubjectId && selectedClassId) {
    return (
      <MarkForm
        subjectId={selectedSubjectId}
        subjectName={selectedSubjectName}
        classId={selectedClassId}
        className={selectedClassName}
        students={students}
        onBack={handleBack}
      />
    );
  }

  if (entryType === 'term' && selectedTerm && selectedSubjectId && selectedClassId) {
    return (
      <TermMarkForm
        termConfig={selectedTerm}
        subjectId={selectedSubjectId}
        subjectName={selectedSubjectName}
        classId={selectedClassId}
        className={selectedClassName}
        students={students}
        onBack={handleBack}
      />
    );
  }

  if (entryType === 'single' || entryType === 'term') {
    return (
      <SubjectClassSelector
        entryType={entryType}
        selectedTerm={selectedTerm}
        onStudentsLoaded={handleStudentsLoaded}
        onBack={handleBack}
      />
    );
  }

  // Selector View
  return (
    <div className="max-w-4xl mx-auto">
      <div className="bg-white rounded-xl shadow-md overflow-hidden">
        <div className="bg-blue-600 px-6 py-4">
          <h2 className="text-xl font-semibold text-white">Marks Entry</h2>
          <p className="text-blue-100 text-sm">Select how you want to enter student marks</p>
        </div>

        <div className="p-6">
          <div className="mb-8">
            <h3 className="text-lg font-medium text-gray-800 mb-4">Single Evaluation</h3>
            <button
              onClick={handleSingleSelect}
              className="w-full md:w-auto bg-white border-2 border-gray-200 rounded-xl p-4 text-left hover:border-blue-400 hover:shadow-lg transition-all"
            >
              <div className="flex items-center gap-4">
                <div className="text-2xl">📝</div>
                <div>
                  <h4 className="font-semibold text-gray-800">Enter Single Evaluation</h4>
                  <p className="text-gray-500 text-sm"></p>
                </div>
              </div>
            </button>
          </div>

          <div>
            <h3 className="text-lg font-medium text-gray-800 mb-4">Term Entry (Both Evaluations)</h3>
            <div className="grid md:grid-cols-3 gap-4">
              {termConfigs.map(term => (
                <button
                  key={term.id}
                  onClick={() => handleTermSelect(term)}
                  className="bg-white border-2 border-gray-200 rounded-xl p-4 text-left hover:border-blue-400 hover:shadow-lg transition-all"
                >
                  <div className="text-2xl mb-2">
                    {term.id === 'Term 1' && '📋'}
                    {term.id === 'Term 2' && '📊'}
                    {term.id === 'Term 3' && '📈'}
                  </div>
                  <h4 className="font-semibold text-gray-800">{term.name}</h4>
                  <p className="text-gray-500 text-sm">
                    Evaluations {term.evaluations[0]} & {term.evaluations[1]}
                  </p>
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};