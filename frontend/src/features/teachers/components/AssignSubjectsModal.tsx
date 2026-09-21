import { useState, useEffect, useMemo } from 'react';
import type { Subject, Class, TeacherAssignment } from '../types/teacherTypes';
import { assignSubjects } from '../api/teacherApi';
import { getSubjectsByClassId } from '../api/subjectApi';
import { getClassesWithSubjectCounts } from '../api/classApi';

interface AssignSubjectsModalProps {
  teacherId: number;
  // CHANGED: was `currentSubjects: Subject[]` — a flattened list that had
  // no class information, which is what caused subjects to be disabled
  // globally instead of per class. We now need the raw assignment
  // records (each one tied to a specific class_id) so "already assigned"
  // can be checked against the class currently selected in this modal.
  currentAssignments: TeacherAssignment[];
  onClose: () => void;
  onSuccess: () => void;
}

export const AssignSubjectsModal = ({
  teacherId,
  currentAssignments,
  onClose,
  onSuccess,
}: AssignSubjectsModalProps) => {
  const [allSubjects, setAllSubjects] = useState<Subject[]>([]);
  const [allClasses, setAllClasses] = useState<Class[]>([]);
  const [selectedClassId, setSelectedClassId] = useState<number | null>(null);
  const [selectedSubjects, setSelectedSubjects] = useState<number[]>([]);
  const [loading, setLoading] = useState(false);
  const [classesLoading, setClassesLoading] = useState(false);
  const [subjectsLoading, setSubjectsLoading] = useState(false);

  // FIX: only subjects assigned to THIS teacher for THIS specific class
  // count as "already assigned". Recomputes whenever the selected class
  // or the assignment list changes, instead of being a single global
  // snapshot taken once on mount.
  const assignedIds = useMemo(() => {
    if (!selectedClassId) return new Set<number>();
    return new Set(
      currentAssignments
        .filter((a) => a.class_id === selectedClassId)
        .map((a) => a.subject_id)
    );
  }, [currentAssignments, selectedClassId]);

  // Fetch available classes
  useEffect(() => {
    const fetchInitialData = async () => {
      try {
        setClassesLoading(true);
        const classes = await getClassesWithSubjectCounts();
        setAllClasses(classes);
        if (classes.length > 0) {
          setSelectedClassId(classes[0].id);
        }
      } catch (error) {
        console.error('Failed to fetch classes:', error);
      } finally {
        setClassesLoading(false);
      }
    };
    fetchInitialData();
  }, []); // run only once on mount

  // Fetch subjects when class changes
  useEffect(() => {
    const fetchSubjects = async () => {
      if (!selectedClassId) {
        setAllSubjects([]);
        return;
      }
      try {
        setSubjectsLoading(true);
        const subjects = await getSubjectsByClassId(selectedClassId);
        setAllSubjects(subjects);
      } catch (error) {
        console.error('Failed to fetch subjects:', error);
        setAllSubjects([]);
      } finally {
        setSubjectsLoading(false);
      }
    };
    if (selectedClassId) {
      fetchSubjects();
    }
  }, [selectedClassId]);

  // FIX: pre-check already-assigned subjects for whichever class is
  // currently selected — re-runs every time `assignedIds` changes
  // (i.e. every time the class selection changes), instead of being
  // set once from a global, class-agnostic snapshot.
  useEffect(() => {
    setSelectedSubjects([...assignedIds]);
  }, [assignedIds]);

  // Toggle subject selection – prevent toggling already assigned ones
  const toggleSubject = (subjectId: number) => {
    if (assignedIds.has(subjectId)) return; // already assigned for this class – do nothing
    setSelectedSubjects(prev =>
      prev.includes(subjectId)
        ? prev.filter(id => id !== subjectId)
        : [...prev, subjectId]
    );
  };

  const handleSubmit = async () => {
    if (!selectedClassId) {
      alert('Please select a class first');
      return;
    }

    // Only send subjects that are NOT already assigned FOR THIS CLASS
    const newSubjectIds = selectedSubjects.filter(id => !assignedIds.has(id));

    if (newSubjectIds.length === 0) {
      alert('All selected subjects are already assigned for this class. Please choose new subjects.');
      return;
    }

    try {
      setLoading(true);
      await assignSubjects(teacherId, newSubjectIds, selectedClassId);
      onSuccess();
      onClose();
    } catch (error) {
      console.error('Failed to assign subjects:', error);
      alert('Failed to assign subjects. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg p-6 w-full max-w-md">
        <h2 className="text-xl font-bold mb-4">Assign Additional Subjects</h2>

        {/* Class Selection */}
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Select Class*
          </label>
          <select
            value={selectedClassId || ''}
            onChange={(e) => setSelectedClassId(e.target.value ? Number(e.target.value) : null)}
            className="w-full p-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
            disabled={classesLoading}
          >
            <option value="">Select a class...</option>
            {allClasses.map(cls => (
              <option key={cls.id} value={cls.id}>
                {cls.name} ({cls.subject_count} subjects)
              </option>
            ))}
          </select>
          {classesLoading && <p className="text-sm text-gray-500 mt-1">Loading classes...</p>}
        </div>

        {/* Subjects Selection */}
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Select Subjects to Add*
          </label>
          <div className="max-h-60 overflow-y-auto border border-gray-300 rounded-md p-2">
            {!selectedClassId ? (
              <p className="text-gray-500 text-sm">Please select a class first</p>
            ) : subjectsLoading ? (
              <p className="text-gray-500 text-sm">Loading subjects...</p>
            ) : allSubjects.length === 0 ? (
              <p className="text-gray-500 text-sm">No subjects available for this class</p>
            ) : (
              allSubjects.map(subject => {
                const isAlreadyAssigned = assignedIds.has(subject.id);
                const isChecked = selectedSubjects.includes(subject.id);
                return (
                  <div key={subject.id} className="flex items-center mb-2">
                    <input
                      type="checkbox"
                      id={`subject-${subject.id}`}
                      checked={isChecked}
                      onChange={() => toggleSubject(subject.id)}
                      disabled={isAlreadyAssigned}
                      className="mr-2"
                    />
                    <label
                      htmlFor={`subject-${subject.id}`}
                      className={`text-sm ${isAlreadyAssigned ? 'text-gray-400' : 'text-gray-800'}`}
                    >
                      {subject.name}
                      {isAlreadyAssigned && ' (already assigned for this class)'}
                    </label>
                  </div>
                );
              })
            )}
          </div>
        </div>

        <div className="flex justify-end space-x-2">
          <button
            onClick={onClose}
            className="px-4 py-2 border border-gray-300 rounded-md hover:bg-gray-50"
            disabled={loading}
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={loading || !selectedClassId || selectedSubjects.length === 0}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-blue-400 disabled:cursor-not-allowed"
          >
            {loading ? 'Assigning...' : 'Assign Subjects'}
          </button>
        </div>
      </div>
    </div>
  );
};
