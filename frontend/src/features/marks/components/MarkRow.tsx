import { useState, useEffect } from 'react';
import type { Student } from '../types/markTypes';

interface MarkRowProps {
  student: Student;
  initialScore?: number;
  onScoreChange: (studentId: number, score: number) => void;
}

export const MarkRow = ({ student, initialScore = 0, onScoreChange }: MarkRowProps) => {
  const [score, setScore] = useState<number>(initialScore);
  const [isValid, setIsValid] = useState(true);

  useEffect(() => {
    setScore(initialScore);
  }, [initialScore]);

  const handleScoreChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = parseFloat(e.target.value);
    setScore(isNaN(value) ? 0 : value);
    setIsValid(!isNaN(value) && value >= 0 && value <= 20);
    onScoreChange(student.id, isNaN(value) ? 0 : value);
  };

  return (
    <div className="flex items-center justify-between py-3 px-4 border-b border-gray-200">
      <div className="flex-1">
        <span className="text-gray-800">{student.full_name}</span>
      </div>
      <div className="w-24">
        <input
          type="number"
          min="0"
          max="20"
          step="0.5"
          className={`w-full p-2 border rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
            !isValid ? 'border-red-500 bg-red-50' : 'border-gray-300'
          }`}
          value={score}
          onChange={handleScoreChange}
        />
      </div>
    </div>
  );
};