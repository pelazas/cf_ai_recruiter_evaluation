import { useState } from "react";
import { AudioRecorder } from "./AudioRecorder";
import { ListNumbers, CaretRight } from "@phosphor-icons/react";

interface InterviewRoomProps {
  questions: string[];
  onComplete: (responses: { question: string; audio: Blob }[]) => void;
}

export function InterviewRoom({ questions, onComplete }: InterviewRoomProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [responses, setResponses] = useState<{ question: string; audio: Blob }[]>([]);

  const handleRecordingComplete = (blob: Blob) => {
    const newResponse = {
      question: questions[currentIndex],
      audio: blob
    };
    
    const updatedResponses = [...responses, newResponse];
    setResponses(updatedResponses);

    if (currentIndex < questions.length - 1) {
      setCurrentIndex(prev => prev + 1);
    } else {
      onComplete(updatedResponses);
    }
  };

  const currentQuestion = questions[currentIndex];
  const progressPercent = ((currentIndex + 1) / questions.length) * 100;

  return (
    <div className="w-full space-y-12 animate-in fade-in slide-in-from-bottom-4 duration-700">
      {/* Progress Header */}
      <div className="space-y-4">
        <div className="flex justify-between items-end">
          <div className="flex items-center gap-2 text-neutral-400 font-medium">
            <ListNumbers size={20} />
            Question {currentIndex + 1} of {questions.length}
          </div>
          <div className="text-right">
            <span className="text-sm font-bold text-black">{Math.round(progressPercent)}%</span>
            <span className="text-xs text-neutral-400 block lowercase tracking-wider">Completed</span>
          </div>
        </div>
        <div className="w-full h-1 bg-neutral-100 rounded-full overflow-hidden">
          <div 
            className="h-full bg-black transition-all duration-500 ease-out"
            style={{ width: `${progressPercent}%` }}
          />
        </div>
      </div>

      {/* Question Card */}
      <div className="space-y-6">
        <div className="bg-white p-8 border border-neutral-100 rounded-2xl shadow-sm space-y-4">
          <span className="text-xs font-bold text-neutral-300 uppercase tracking-widest flex items-center gap-2">
            Interview Question
            <CaretRight size={12} weight="bold" />
          </span>
          <h3 className="text-2xl font-light text-neutral-800 leading-snug">
            {currentQuestion}
          </h3>
        </div>

        {/* Recorder component */}
        <AudioRecorder onRecordingComplete={handleRecordingComplete} />
      </div>

      {/* Tips */}
      <div className="bg-neutral-50 p-6 rounded-xl border border-neutral-100 flex gap-4">
        <div className="w-10 h-10 bg-white rounded-lg flex items-center justify-center border border-neutral-100 shadow-sm text-neutral-400">
          ?
        </div>
        <p className="text-sm text-neutral-500 leading-relaxed">
          <span className="font-semibold text-neutral-700">Quick Tip:</span> Take a breath before starting. You have up to 60 seconds to provide a concise, technical answer. You can review and re-record before submitting.
        </p>
      </div>
    </div>
  );
}
