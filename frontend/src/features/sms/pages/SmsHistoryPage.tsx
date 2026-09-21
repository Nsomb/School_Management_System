
import { SmsHistory } from '../components/SmsHistory';

export const SmsHistoryPage = () => {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-4 md:p-8">
      <div className="max-w-6xl mx-auto">
        <div className="bg-white rounded-xl shadow-lg overflow-hidden">
          <div className="p-6 md:p-8">
            <h1 className="text-3xl font-bold text-gray-800 mb-2">SMS History</h1>
            <p className="text-gray-600 mb-6">
              View past SMS communications and their status
            </p>
            
            <div className="overflow-x-auto">
              <SmsHistory />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
export default SmsHistory