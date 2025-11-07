import React, { useState, useRef, useEffect } from 'react';
import { X, Video, RotateCcw, Send, Circle, Square } from 'lucide-react';
import useUser from '@/utils/useUser';
import { toast } from 'sonner';

const COLORS = {
  primary: '#5B3BAF',
  secondary: '#00BFA6',
  danger: '#E74C3C',
  text: '#2C3E50',
  cardBg: '#F3F4F6',
};

// Tier-based duration limits (in seconds)
const TIER_DURATIONS = {
  free: 10,
  casual: 15,
  dating: 30,
  business: 60,
};

/**
 * VideoMessageRecorder
 * 
 * Web-based video message recorder with:
 * - Camera/microphone access
 * - Tier-based duration limits
 * - Real-time countdown timer
 * - Preview and re-record functionality
 * - Upload to object storage
 * - Usage tracking via API
 */
export function VideoMessageRecorder({ conversationId, onClose, onSent }) {
  const { user } = useUser();
  const [recording, setRecording] = useState(false);
  const [recordedBlob, setRecordedBlob] = useState(null);
  const [recordedUrl, setRecordedUrl] = useState(null);
  const [timeRemaining, setTimeRemaining] = useState(0);
  const [uploading, setUploading] = useState(false);
  const [cameraReady, setCameraReady] = useState(false);
  const [quotaData, setQuotaData] = useState(null);
  
  // Use refs to avoid closure issues in timer callbacks
  const videoRef = useRef(null);
  const previewRef = useRef(null);
  const streamRef = useRef(null);
  const mediaRecorderRef = useRef(null);
  const chunksRef = useRef([]);
  const timerRef = useRef(null);
  
  const tier = user?.membership_tier || 'free';
  const maxDuration = TIER_DURATIONS[tier] || 10;

  // Fetch video message quota on mount
  useEffect(() => {
    fetchQuota();
  }, [conversationId]);

  const fetchQuota = async () => {
    try {
      const res = await fetch(`/api/messages/video/quota?conversationId=${conversationId}`);
      if (res.ok) {
        const data = await res.json();
        setQuotaData(data);
        
        if (!data.canSendVideoMessage) {
          toast.error(data.blockingReason || 'Cannot send video message');
          onClose();
        }
      }
    } catch (err) {
      console.error('Failed to fetch video quota:', err);
    }
  };

  // Initialize camera
  useEffect(() => {
    const initCamera = async () => {
      try {
        const mediaStream = await navigator.mediaDevices.getUserMedia({
          video: { width: 1280, height: 720, facingMode: 'user' },
          audio: true,
        });
        
        streamRef.current = mediaStream;
        if (videoRef.current) {
          videoRef.current.srcObject = mediaStream;
        }
        setCameraReady(true);
      } catch (err) {
        console.error('Camera access denied:', err);
        toast.error('Camera access denied. Please enable camera and microphone permissions.');
        onClose();
      }
    };

    initCamera();

    return () => {
      // Cleanup stream on unmount
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
      }
      // Cleanup timer
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, []);

  // Start recording
  const startRecording = () => {
    if (!streamRef.current || !cameraReady) {
      toast.error('Camera not ready');
      return;
    }

    chunksRef.current = [];
    const recorder = new MediaRecorder(streamRef.current, {
      mimeType: 'video/webm;codecs=vp9',
    });

    recorder.ondataavailable = (e) => {
      if (e.data.size > 0) {
        chunksRef.current.push(e.data);
      }
    };

    recorder.onstop = () => {
      const blob = new Blob(chunksRef.current, { type: 'video/webm' });
      setRecordedBlob(blob);
      setRecordedUrl(URL.createObjectURL(blob));
      
      // Stop live camera stream
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
      }
    };

    recorder.start(100); // Collect data every 100ms
    mediaRecorderRef.current = recorder;
    setRecording(true);
    setTimeRemaining(maxDuration);

    // Start countdown timer (using ref to avoid closure issues)
    timerRef.current = setInterval(() => {
      setTimeRemaining(prev => {
        if (prev <= 1) {
          // Timer expired - stop recording
          if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
            mediaRecorderRef.current.stop();
          }
          if (timerRef.current) {
            clearInterval(timerRef.current);
          }
          setRecording(false);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  };

  // Stop recording
  const stopRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
    }
    if (timerRef.current) {
      clearInterval(timerRef.current);
    }
    setRecording(false);
  };

  // Re-record (restart from scratch)
  const reRecord = async () => {
    setRecordedBlob(null);
    setRecordedUrl(null);
    setTimeRemaining(0);
    
    // Restart camera
    try {
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: { width: 1280, height: 720, facingMode: 'user' },
        audio: true,
      });
      
      streamRef.current = mediaStream;
      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
      }
      setCameraReady(true);
    } catch (err) {
      console.error('Camera access denied:', err);
      toast.error('Camera access denied');
      onClose();
    }
  };

  // Upload and send video message
  const sendVideoMessage = async () => {
    if (!recordedBlob) {
      toast.error('No video recorded');
      return;
    }

    setUploading(true);

    try {
      // Upload to object storage
      const formData = new FormData();
      formData.append('file', recordedBlob, `video-message-${Date.now()}.webm`);
      formData.append('type', 'video_message');

      const uploadRes = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      });

      if (!uploadRes.ok) {
        throw new Error('Upload failed');
      }

      const { url } = await uploadRes.json();

      // Send video message to conversation
      const sendRes = await fetch(`/api/conversations/${conversationId}/messages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          body: '[Video Message]',
          videoUrl: url,
          isVideoMessage: true,
        }),
      });

      if (!sendRes.ok) {
        const errorData = await sendRes.json();
        throw new Error(errorData.error || 'Failed to send video message');
      }

      toast.success('Video message sent!');
      onSent?.();
      onClose();
    } catch (err) {
      console.error('Failed to send video message:', err);
      toast.error(err.message || 'Failed to send video message');
    } finally {
      setUploading(false);
    }
  };

  const progressPercent = timeRemaining > 0 ? ((maxDuration - timeRemaining) / maxDuration) * 100 : 0;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-90 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-2xl max-w-lg w-full shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200">
          <div>
            <h3 className="text-lg font-bold" style={{ color: COLORS.text }}>
              Record Video Message
            </h3>
            <p className="text-sm opacity-70" style={{ color: COLORS.text }}>
              {quotaData ? `${quotaData.videosRemaining} of ${quotaData.videosAllowedToday} remaining today` : 'Loading...'}
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-full transition-all"
            disabled={recording || uploading}
          >
            <X size={24} color={COLORS.text} />
          </button>
        </div>

        {/* Video Display */}
        <div className="relative aspect-video bg-black">
          {!recordedBlob ? (
            // Live camera view
            <video
              ref={videoRef}
              autoPlay
              muted
              playsInline
              className="w-full h-full object-cover"
            />
          ) : (
            // Recorded video preview
            <video
              ref={previewRef}
              src={recordedUrl}
              controls
              className="w-full h-full object-cover"
            />
          )}

          {/* Recording indicator */}
          {recording && (
            <div className="absolute top-4 left-4 flex items-center gap-2 bg-red-500 px-3 py-2 rounded-full">
              <Circle size={12} fill="white" color="white" className="animate-pulse" />
              <span className="text-white text-sm font-bold">REC</span>
            </div>
          )}

          {/* Timer */}
          {recording && (
            <div className="absolute top-4 right-4 bg-black bg-opacity-75 px-3 py-2 rounded-full">
              <span className="text-white text-sm font-mono font-bold">
                {timeRemaining}s
              </span>
            </div>
          )}

          {/* Duration limit badge */}
          {!recording && !recordedBlob && (
            <div className="absolute bottom-4 left-4 bg-black bg-opacity-75 px-3 py-1 rounded-full">
              <span className="text-white text-xs">
                Max: {maxDuration}s ({tier.charAt(0).toUpperCase() + tier.slice(1)} tier)
              </span>
            </div>
          )}
        </div>

        {/* Progress bar (during recording) */}
        {recording && (
          <div className="w-full bg-gray-200 h-1">
            <div
              className="bg-red-500 h-full transition-all duration-1000"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
        )}

        {/* Controls */}
        <div className="p-6">
          {!recordedBlob ? (
            // Recording controls
            <div className="flex flex-col gap-4">
              <div className="flex justify-center gap-4">
                {!recording ? (
                  <button
                    onClick={startRecording}
                    disabled={!cameraReady}
                    className="flex items-center gap-2 px-6 py-3 rounded-xl font-bold text-white shadow-md hover:shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                    style={{ backgroundColor: COLORS.danger }}
                  >
                    <Circle size={20} fill="white" />
                    Start Recording
                  </button>
                ) : (
                  <button
                    onClick={stopRecording}
                    className="flex items-center gap-2 px-6 py-3 rounded-xl font-bold text-white shadow-md hover:shadow-lg transition-all"
                    style={{ backgroundColor: COLORS.text }}
                  >
                    <Square size={20} />
                    Stop Recording
                  </button>
                )}
              </div>
              
              <div className="text-center">
                <p className="text-sm opacity-70" style={{ color: COLORS.text }}>
                  {recording ? 'Recording in progress...' : 'Press Start to begin recording'}
                </p>
              </div>
            </div>
          ) : (
            // Preview controls
            <div className="flex flex-col gap-3">
              <div className="flex gap-3">
                <button
                  onClick={reRecord}
                  disabled={uploading}
                  className="flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-xl font-bold shadow-md hover:shadow-lg transition-all"
                  style={{ backgroundColor: COLORS.cardBg, color: COLORS.text }}
                >
                  <RotateCcw size={20} />
                  Re-record
                </button>
                <button
                  onClick={sendVideoMessage}
                  disabled={uploading}
                  className="flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-xl font-bold text-white shadow-md hover:shadow-lg transition-all disabled:opacity-50"
                  style={{ backgroundColor: COLORS.primary }}
                >
                  {uploading ? (
                    <>
                      <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                      Sending...
                    </>
                  ) : (
                    <>
                      <Send size={20} />
                      Send
                    </>
                  )}
                </button>
              </div>
              
              <div className="text-center">
                <p className="text-xs opacity-70" style={{ color: COLORS.text }}>
                  Video recorded successfully! Review and send or re-record.
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
