// src/features/question/page.tsx
'use client'; 

import { QuestionUploadForm, QuestionList } from '@/features/question';
import { getClasses, getSubjects, getEvaluations } from '@/lib/api';
import { useState, useEffect } from 'react';

function QuestionsPage() {
  const [classes, setClasses] = useState<Array<{id: string, name: string}>>([]);
  const [subjects, setSubjects] = useState<Array<{id: string, name: string}>>([]);
  const [evaluations, setEvaluations] = useState<Array<{id: string, name: string}>>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshTrigger, setRefreshTrigger] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setIsLoading(true);
        const [classesData, subjectsData, evaluationsData] = await Promise.all([
          getClasses(),
          getSubjects(),
          getEvaluations()
        ]);
        setClasses(classesData);
        setSubjects(subjectsData);
        setEvaluations(evaluationsData);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load resources');
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, []);

  if (isLoading) return <div>Loading resources...</div>;
  if (error) return <div>Error: {error}</div>;

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold mb-6">Question Management</h1>
      
      <div className="grid grid-cols-1 gap-8">
        <div>
          <h2 className="text-xl font-semibold mb-4">Upload New Question</h2>
          <QuestionUploadForm 
            classes={classes}
            subjects={subjects}
            evaluations={evaluations}
            onSuccess={() => setRefreshTrigger(prev => !prev)}
          />
        </div>
        
        <div>
          <h2 className="text-xl font-semibold mb-4">My Submitted Questions</h2>
          <QuestionList 
            refreshTrigger={refreshTrigger}
            onDeleteSuccess={() => setRefreshTrigger(prev => !prev)}
          />
        </div>
      </div>
    </div>
  );
}

export default QuestionsPage;