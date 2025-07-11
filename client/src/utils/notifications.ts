import toast from 'react-hot-toast';

export const showSuccess = (title: string, message?: string) => {
  toast.success(message ? `${title}: ${message}` : title, {
    duration: 3000,
    style: {
      background: 'linear-gradient(135deg, #10b981, #059669)',
      color: '#ffffff',
      borderRadius: '12px',
      padding: '16px',
    },
    iconTheme: {
      primary: '#ffffff',
      secondary: '#10b981',
    },
  });
};

export const showError = (title: string, message?: string) => {
  toast.error(message ? `${title}: ${message}` : title, {
    style: {
      background: 'linear-gradient(135deg, #ef4444, #dc2626)',
      color: '#ffffff',
      borderRadius: '12px',
      padding: '16px',
    },
    iconTheme: {
      primary: '#ffffff',
      secondary: '#ef4444',
    },
  });
};

// Deprecated functions - use ConfirmationDialog and MatchConfirmationDialog components instead
// These are kept only for legacy compatibility during migration
export const showConfirm = (title: string, message: string) => {
  console.warn('showConfirm is deprecated. Use ConfirmationDialog component instead.');
  return new Promise<{ isConfirmed: boolean }>((resolve) => {
    const confirmed = window.confirm(`${title}\n\n${message}`);
    resolve({ isConfirmed: confirmed });
  });
};

export const showMatchFound = (matchDetails: any) => {
  console.warn('showMatchFound is deprecated. Use MatchConfirmationDialog component instead.');
  return new Promise<{ isConfirmed: boolean }>((resolve) => {
    const confirmed = window.confirm(
      `Match Found! 🎉\n\nPerfect match found nearby!\n\nGive: ₱${matchDetails.giveAmount}\nGet: ₱${matchDetails.needAmount}\n\nTap OK to confirm match or Cancel to skip.`
    );
    resolve({ isConfirmed: confirmed });
  });
};

// Toast notifications
export const toastSuccess = (message: string) => {
  toast.success(message, {
    style: {
      background: 'linear-gradient(135deg, #10b981, #059669)',
      color: '#ffffff',
      borderRadius: '12px',
      padding: '16px',
    },
    iconTheme: {
      primary: '#ffffff',
      secondary: '#10b981',
    },
  });
};

export const toastError = (message: string) => {
  toast.error(message, {
    style: {
      background: 'linear-gradient(135deg, #ef4444, #dc2626)',
      color: '#ffffff',
      borderRadius: '12px',
      padding: '16px',
    },
    iconTheme: {
      primary: '#ffffff',
      secondary: '#ef4444',
    },
  });
};

export const toastInfo = (message: string) => {
  toast(message, {
    icon: 'ℹ️',
    style: {
      background: 'linear-gradient(135deg, #3b82f6, #2563eb)',
      color: '#ffffff',
      borderRadius: '12px',
      padding: '16px',
    },
  });
};

export const toastLoading = (message: string) => {
  return toast.loading(message, {
    style: {
      background: 'linear-gradient(135deg, #6b7280, #4b5563)',
      color: '#ffffff',
      borderRadius: '12px',
      padding: '16px',
    },
  });
};