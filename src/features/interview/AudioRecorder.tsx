import { useState, useRef, useEffect } from "react";
import { Microphone, Stop, Play, Check, Trash } from "@phosphor-icons/react";

interface AudioRecorderProps {
  onRecordingComplete: (blob: Blob) => void;
  maxDuration?: number; // in seconds
}

export function AudioRecorder({ onRecordingComplete, maxDuration = 60 }: AudioRecorderProps) {
  const [status, setStatus] = useState<"idle" | "recording" | "reviewing">("idle");
  const [timeLeft, setTimeLeft] = useState(maxDuration);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: "audio/webm" });
        const url = URL.createObjectURL(audioBlob);
        setAudioUrl(url);
        setStatus("reviewing");
        stream.getTracks().forEach(track => track.stop());
      };

      mediaRecorder.start();
      setStatus("recording");
      setTimeLeft(maxDuration);
    } catch (err) {
      console.error("Error accessing microphone:", err);
      alert("Please allow microphone access to participate in the interview.");
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && status === "recording") {
      mediaRecorderRef.current.stop();
      if (timerRef.current) clearInterval(timerRef.current);
    }
  };

  const handleReset = () => {
    setAudioUrl(null);
    setStatus("idle");
    setTimeLeft(maxDuration);
  };

  const handleSubmit = () => {
    if (audioChunksRef.current.length > 0) {
      const audioBlob = new Blob(audioChunksRef.current, { type: "audio/webm" });
      onRecordingComplete(audioBlob);
      handleReset();
    }
  };

  useEffect(() => {
    if (status === "recording") {
      timerRef.current = setInterval(() => {
        setTimeLeft((prev) => {
          if (prev <= 1) {
            stopRecording();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [status]);

  const progress = ((maxDuration - timeLeft) / maxDuration) * 100;

  return (
    <div className="w-full bg-neutral-50 rounded-2xl p-8 border border-neutral-100 flex flex-col items-center gap-6">
      {status === "idle" && (
        <button
          onClick={startRecording}
          className="flex flex-col items-center gap-4 group cursor-pointer"
        >
          <div className="w-20 h-20 bg-black rounded-full flex items-center justify-center text-white group-hover:bg-neutral-800 transition-colors shadow-xl shadow-black/10">
            <Microphone size={32} weight="fill" />
          </div>
          <span className="text-neutral-500 font-medium">Click when ready to answer</span>
        </button>
      )}

      {status === "recording" && (
        <div className="w-full space-y-6 flex flex-col items-center">
          <div className="flex items-center gap-4 text-2xl font-mono font-medium tabular-nums text-red-500">
            <div className="w-3 h-3 bg-red-500 rounded-full animate-pulse" />
            00:{timeLeft < 10 ? `0${timeLeft}` : timeLeft}
          </div>
          
          <div className="w-full h-2 bg-neutral-200 rounded-full overflow-hidden">
            <div 
              className="h-full bg-black transition-all duration-1000 ease-linear"
              style={{ width: `${progress}%` }}
            />
          </div>

          <button
            onClick={stopRecording}
            className="w-16 h-16 bg-white border-4 border-red-500 rounded-full flex items-center justify-center text-red-500 hover:bg-neutral-50 transition-colors shadow-lg cursor-pointer"
          >
            <Stop size={24} weight="fill" />
          </button>
          
          <p className="text-sm text-neutral-400">Maximum 60 seconds per answer</p>
        </div>
      )}

      {status === "reviewing" && audioUrl && (
        <div className="w-full space-y-6 flex flex-col items-center">
          <div className="flex items-center gap-2 text-green-600 font-medium">
            <Check size={20} weight="bold" />
            Recording Complete
          </div>
          
          <audio src={audioUrl} controls className="w-full h-12" />

          <div className="flex gap-4 w-full">
            <button
              onClick={handleReset}
              className="flex-1 py-4 border border-neutral-200 rounded-xl font-medium text-neutral-500 hover:bg-neutral-100 transition-colors flex items-center justify-center gap-2 cursor-pointer"
            >
              <Trash size={18} />
              Re-record
            </button>
            <button
              onClick={handleSubmit}
              className="flex-1 py-4 bg-black text-white rounded-xl font-medium hover:bg-neutral-800 transition-colors flex items-center justify-center gap-2 cursor-pointer"
            >
              <Check size={18} />
              Submit Answer
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
