// src/features/sms/components/SmsForm.tsx
import React, { useState, useEffect } from 'react';
import { RecipientSelector } from './RecipientSelector';
import { SmsStatusIndicator } from './SmsStatusIndicator';
import { SmsSummary } from './SmsSummary';
import { sendSms, fetchRecipientOptions } from '../api/smsApi';
import type { SmsRequest, RecipientOption, MessageChannel } from '../types/smsTypes';

export const SmsForm = () => {
  const [formData, setFormData] = useState<SmsRequest>({
    message: '',
    recipientType: 'parents',
    channel: 'auto',
  });
  const [response, setResponse] = useState<any>(null);
  const [selectedStudents, setSelectedStudents] = useState<RecipientOption[]>([]);
  const [selectedTeachers, setSelectedTeachers] = useState<RecipientOption[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [studentOptions, setStudentOptions] = useState<RecipientOption[]>([]);
  const [teacherOptions, setTeacherOptions] = useState<RecipientOption[]>([]);

  useEffect(() => {
    const fetchOptions = async () => {
      try {
        const data = await fetchRecipientOptions();
        setStudentOptions(data.students);
        setTeacherOptions(data.teachers);
      } catch (err) {
        setError('Failed to load recipient options');
        console.error(err);
      }
    };
    fetchOptions();
  }, []);

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target;
    setFormData({ ...formData, [name]: value });
  };

  const handleChannelChange = (channel: MessageChannel) => {
    setFormData((prev) => ({ ...prev, channel }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);
    setResponse(null);

    try {
      const dataToSend: SmsRequest = {
        ...formData,
        targetStudentIds: selectedStudents.map((s) => s.id),
        targetTeacherIds: selectedTeachers.map((t) => t.id),
      };

      const result = await sendSms(dataToSend);
      setResponse(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to send message');
    } finally {
      setIsLoading(false);
    }
  };

  const characterCount = formData.message.length;
  const maxCharacters = 160;

  return (
    <div className="space-y-6">
      {error && <SmsStatusIndicator status="error" message={error} />}

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* ─── Recipient Type ─────────────────────────────────── */}
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <label htmlFor="recipientType" className="block text-sm font-medium text-gray-700">
              Send To
            </label>
            <select
              id="recipientType"
              name="recipientType"
              value={formData.recipientType}
              onChange={handleChange}
              className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm rounded-md"
            >
              <option value="parents">Parents</option>
              <option value="teachers">Teachers</option>
              <option value="both">Both Parents and Teachers</option>
            </select>
          </div>

          {/* ─── Delivery Channel (NEW) ─────────────────────────── */}
          <div className="sm:col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Delivery Method
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <ChannelCard
                active={formData.channel === 'auto'}
                onClick={() => handleChannelChange('auto')}
                icon="⚡"
                title="Auto (Recommended)"
                subtitle="WhatsApp first, SMS fallback"
              />
              <ChannelCard
                active={formData.channel === 'whatsapp'}
                onClick={() => handleChannelChange('whatsapp')}
                icon="💬"
                title="WhatsApp Only"
                subtitle="Cheaper, no SMS fallback"
              />
              <ChannelCard
                active={formData.channel === 'sms'}
                onClick={() => handleChannelChange('sms')}
                icon="📱"
                title="SMS Only"
                subtitle="Universal, higher cost"
              />
            </div>
          </div>

          {/* ─── Recipient Selectors ────────────────────────────── */}
          {(formData.recipientType === 'parents' || formData.recipientType === 'both') && (
            <div className="sm:col-span-2">
              <RecipientSelector
                label="Select Students (to target their parents)"
                options={studentOptions}
                selected={selectedStudents}
                onSelect={setSelectedStudents}
              />
            </div>
          )}

          {(formData.recipientType === 'teachers' || formData.recipientType === 'both') && (
            <div className="sm:col-span-2">
              <RecipientSelector
                label="Select Teachers"
                options={teacherOptions}
                selected={selectedTeachers}
                onSelect={setSelectedTeachers}
              />
            </div>
          )}

          {/* ─── Message ────────────────────────────────────────── */}
          <div className="sm:col-span-2">
            <label htmlFor="message" className="block text-sm font-medium text-gray-700">
              Message
            </label>
            <div className="mt-1">
              <textarea
                id="message"
                name="message"
                rows={4}
                className="shadow-sm focus:ring-indigo-500 focus:border-indigo-500 block w-full sm:text-sm border border-gray-300 rounded-md"
                value={formData.message}
                onChange={handleChange}
                maxLength={maxCharacters}
                required
              />
            </div>
            <p className="mt-2 text-sm text-gray-500">
              {characterCount}/{maxCharacters} characters
            </p>
          </div>
        </div>

        {/* ─── Actions ────────────────────────────────────────── */}
        <div className="flex justify-end space-x-3">
          <button
            type="button"
            onClick={() => {
              setFormData({ message: '', recipientType: 'parents', channel: 'auto' });
              setSelectedStudents([]);
              setSelectedTeachers([]);
              setResponse(null);
              setError(null);
            }}
            className="inline-flex items-center px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
          >
            Reset
          </button>
          <button
            type="submit"
            disabled={isLoading || !formData.message}
            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isLoading ? (
              <>
                <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Sending...
              </>
            ) : (
              'Send Message'
            )}
          </button>
        </div>
      </form>

      {/* ─── Result Summary ─────────────────────────────────── */}
      {response && (
        <div className="space-y-4">
          <SmsStatusIndicator status="success" message={response.message} />
          <SmsSummary
            recipientType={formData.recipientType}
            studentCount={selectedStudents.length}
            teacherCount={selectedTeachers.length}
            logId={response.smsLogId}
            whatsappCount={response.whatsappCount || 0}
            smsCount={response.smsCount || 0}
            failedCount={response.failedCount || 0}
          />
        </div>
      )}
    </div>
  );
};

// ─── Channel card (small presentational component) ─────
interface ChannelCardProps {
  active: boolean;
  onClick: () => void;
  icon: string;
  title: string;
  subtitle: string;
}

const ChannelCard: React.FC<ChannelCardProps> = ({ active, onClick, icon, title, subtitle }) => (
  <button
    type="button"
    onClick={onClick}
    className={`text-left p-3 rounded-lg border-2 transition-all ${
      active
        ? 'border-indigo-500 bg-indigo-50 shadow-sm'
        : 'border-gray-200 hover:border-gray-300 bg-white'
    }`}
  >
    <div className="flex items-start gap-2">
      <span className="text-xl">{icon}</span>
      <div>
        <p className="font-medium text-sm text-gray-800">{title}</p>
        <p className="text-xs text-gray-500 mt-0.5">{subtitle}</p>
      </div>
    </div>
  </button>
);