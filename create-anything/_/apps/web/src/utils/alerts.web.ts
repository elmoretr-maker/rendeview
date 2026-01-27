import { toast } from 'sonner';

export type AlertType = 'success' | 'error' | 'warning' | 'info' | 'match' | 'like';

interface AlertOptions {
  duration?: number;
  description?: string;
}

export function showAlert(type: AlertType, message: string, options: AlertOptions = {}) {
  const { duration = 4000, description } = options;

  switch (type) {
    case 'match':
      toast.success(message, {
        duration: 5000,
        description: description || 'You both liked each other!',
        icon: '💖',
      });
      break;
    case 'like':
      toast.success(message, {
        duration: 3000,
        description,
        icon: '❤️',
      });
      break;
    case 'success':
      toast.success(message, { duration, description });
      break;
    case 'error':
      toast.error(message, { duration, description });
      break;
    case 'warning':
      toast.warning(message, { duration, description });
      break;
    case 'info':
    default:
      toast.info(message, { duration, description });
      break;
  }
}

export function showMatchAlert(matchName: string) {
  showAlert('match', `It's a Match with ${matchName}!`, {
    description: 'Start a video call to get to know each other better.',
    duration: 6000,
  });
}

export function showLikeAlert(likedName: string) {
  showAlert('like', `You liked ${likedName}`, {
    description: 'Fingers crossed for a match!',
  });
}

export function showPassAlert() {
  toast('Passed', {
    duration: 1500,
    icon: '👋',
  });
}
