'use client';

import { useEffect, useState } from 'react';

const MAX_FREE_VIEWS = 1;
const STORAGE_KEY = 'analytics_views';
const WAITLIST_EMAIL_KEY = 'waitlist_email';
const BYPASS_KEY = 'bypass_waitlist';
const SECRET_BYPASS_PARAM = 'preview'; // Secret URL param: ?preview=true

export function useWaitlistGate() {
  const [showWaitlist, setShowWaitlist] = useState(false);
  const [viewCount, setViewCount] = useState(0);

  useEffect(() => {
    // Check for secret bypass URL parameter
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get(SECRET_BYPASS_PARAM) === 'true') {
      localStorage.setItem(BYPASS_KEY, 'true');
      // User has secret bypass, allow unlimited views
      return;
    }

    // Check if user has bypass flag
    const bypassFlag = localStorage.getItem(BYPASS_KEY);
    if (bypassFlag === 'true') {
      // User has bypass, allow unlimited views
      return;
    }

    // Check if user has joined waitlist
    const waitlistEmail = localStorage.getItem(WAITLIST_EMAIL_KEY);
    if (waitlistEmail) {
      // User is on waitlist, allow unlimited views
      return;
    }

    // Get current view count
    const stored = localStorage.getItem(STORAGE_KEY);
    const count = stored ? parseInt(stored, 10) : 0;
    setViewCount(count);

    // Increment view count
    const newCount = count + 1;
    localStorage.setItem(STORAGE_KEY, newCount.toString());

    // Show waitlist modal if exceeded limit
    if (newCount > MAX_FREE_VIEWS) {
      setShowWaitlist(true);
    }
  }, []);

  const closeWaitlist = () => {
    setShowWaitlist(false);
  };

  const resetViews = () => {
    localStorage.removeItem(STORAGE_KEY);
    setViewCount(0);
  };

  return {
    showWaitlist,
    closeWaitlist,
    viewCount,
    resetViews,
    isOnWaitlist: !!localStorage.getItem(WAITLIST_EMAIL_KEY),
    maxViews: MAX_FREE_VIEWS,
  };
}
