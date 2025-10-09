'use client';

import { useEffect } from 'react';
import { Sparkles } from 'lucide-react';
import { WaitlistForm } from './WaitlistForm';

interface WaitlistModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentModel?: string;
}

export function WaitlistModal({ isOpen, onClose, currentModel }: WaitlistModalProps) {
  const handleSuccess = () => {
    onClose();
    window.location.reload();
  };

  useEffect(() => {
    // Prevent body scroll when modal is open
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      {/* Gradient Backdrop */}
      <div className="fixed inset-0 bg-gradient-to-b from-transparent via-white/85 to-white transition-opacity" />

      {/* Modal */}
      <div className="flex min-h-full items-center justify-center p-4">
        <div className="relative bg-white rounded-2xl shadow-2xl max-w-lg w-full p-10" style={{ boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)' }}>
          <div className="text-center mb-8">
            <div className="mx-auto flex items-center justify-center h-16 w-16 rounded-full bg-gradient-to-r from-blue-500 to-indigo-600 mb-6">
              <Sparkles className="h-8 w-8 text-white" />
            </div>
            <h3 className="text-3xl font-bold text-gray-900 mb-3">
              Get Early Access
            </h3>
            <p className="text-base text-gray-600">
              Join the waitlist to unlock full analytics and be notified when we launch
            </p>
          </div>

          <WaitlistForm
            currentModel={currentModel}
            referralSource="analytics_gate"
            onSuccess={handleSuccess}
          />
        </div>
      </div>
    </div>
  );
}
