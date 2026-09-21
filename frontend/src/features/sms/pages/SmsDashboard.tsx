import { Outlet } from 'react-router-dom';
import { SmsForm } from '../components/SmsForm';

export const SmsDashboard = () => {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-4 md:p-8">
      <div className="max-w-6xl mx-auto">
        <div className="bg-white rounded-xl shadow-lg overflow-hidden">
          <div className="p-6 md:p-8">
            <h1 className="text-3xl font-bold text-gray-800 mb-2">SMS Communication</h1>
            <p className="text-gray-600 mb-6">
              Send messages to parents and teachers efficiently
            </p>
            
            <div className="bg-blue-50 rounded-lg p-6 mb-8">
              <SmsForm />
            </div>

            {/* Outlet for nested routes */}
            <div className="mt-8">
              <Outlet />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
export default SmsDashboard