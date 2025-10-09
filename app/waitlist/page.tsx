'use client';

import { useRouter } from 'next/navigation';
import { Sparkles } from 'lucide-react';
import { WaitlistForm } from '@/components/WaitlistForm';

export default function WaitlistPage() {
  const router = useRouter();

  const handleSuccess = () => {
    router.push('/');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-blue-50/30 to-indigo-50/30 flex flex-col justify-center py-8 px-4 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-lg">
        <div className="mx-auto flex items-center justify-center h-16 w-16 rounded-full bg-gradient-to-r from-blue-500 to-indigo-600 mb-6">
          <Sparkles className="h-8 w-8 text-white" />
        </div>
        <h2 className="text-center text-3xl font-bold text-gray-900 mb-2">
          Join the Waitlist
        </h2>
        <p className="text-center text-base text-gray-600 mb-8">
          Get early access to advanced Porsche market analytics
        </p>
      </div>

      <div className="sm:mx-auto sm:w-full sm:max-w-lg">
        <div className="bg-white py-10 px-10 shadow-2xl rounded-2xl" style={{ boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)' }}>
          <WaitlistForm
            referralSource="waitlist_page"
            onSuccess={handleSuccess}
          />
        </div>
      </div>
    </div>
  );
}
