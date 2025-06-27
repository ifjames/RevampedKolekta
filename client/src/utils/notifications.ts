import Swal from 'sweetalert2';
import toast from 'react-hot-toast';

// SweetAlert2 configuration
const swalConfig = {
  background: 'rgba(30, 64, 175, 0.95)',
  color: '#ffffff',
  confirmButtonColor: '#3b82f6',
  cancelButtonColor: '#ef4444',
  backdrop: 'rgba(0, 0, 0, 0.5)',
  customClass: {
    popup: 'glass-effect rounded-2xl',
    title: 'text-white font-bold',
    content: 'text-blue-100',
  }
};

export const showSuccess = (title: string, message?: string) => {
  return Swal.fire({
    ...swalConfig,
    title,
    text: message,
    icon: 'success',
    timer: 3000,
    timerProgressBar: true,
  });
};

export const showError = (title: string, message?: string) => {
  return Swal.fire({
    ...swalConfig,
    title,
    text: message,
    icon: 'error',
  });
};

export const showConfirm = (title: string, message: string) => {
  return Swal.fire({
    ...swalConfig,
    title,
    text: message,
    icon: 'question',
    showCancelButton: true,
    confirmButtonText: 'Yes',
    cancelButtonText: 'No',
  });
};

export const showMatchFound = (matchDetails: any) => {
  return Swal.fire({
    ...swalConfig,
    title: 'Match Found! 🎉',
    html: `
      <div class="text-center">
        <p class="text-blue-100 mb-4">Perfect match found nearby!</p>
        <div class="glass-effect rounded-lg p-4 mb-4">
          <div class="flex justify-between items-center">
            <span class="text-green-400">Give: ₱${matchDetails.giveAmount}</span>
            <i class="fas fa-exchange-alt text-cyan-400"></i>
            <span class="text-blue-400">Get: ₱${matchDetails.needAmount}</span>
          </div>
        </div>
        <p class="text-sm text-blue-200">Tap confirm to start chatting!</p>
      </div>
    `,
    icon: 'success',
    showCancelButton: true,
    confirmButtonText: 'Confirm Match',
    cancelButtonText: 'Maybe Later',
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
