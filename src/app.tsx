import { useState } from "react";
import { useAgent } from "agents/react";
import { useAgentChat } from "@cloudflare/ai-chat/react";
import type { UIMessage } from "@ai-sdk/react";

import { Header } from "./components/recruiter/Header";
import { Phase1 } from "./components/recruiter/Phase1";
import { Phase2 } from "./components/recruiter/Phase2";
import { LoadingState } from "./components/recruiter/LoadingState";

export interface RecruiterState {
  jobDescription?: string;
  questions: string[];
  currentQuestionIndex: number;
  responses: Record<number, string>;
}

export default function App() {
  const [phase, setPhase] = useState<1 | 2>(1);
  const [jd, setJd] = useState("");
  const [recruiterState, setRecruiterState] = useState<RecruiterState | null>(null);

  const agent = useAgent({
    agent: "chat",
    onStateUpdate: (state) => {
      const s = state as RecruiterState;
      setRecruiterState(s);
      if (s.questions?.length > 0 && phase === 1) {
        setPhase(2);
      }
    }
  });

  const { sendMessage, status } = useAgentChat<unknown, UIMessage<{ createdAt: string }>>({
    agent
  });

  const isGenerating = status === "submitted" || status === "streaming";

  const handleGenerateQuestions = async () => {
    if (!jd.trim()) return;
    
    // Clear local questions to show spinner
    setRecruiterState(prev => prev ? { ...prev, questions: [] } : null);
    setPhase(2); 
    
    try {
      await sendMessage({
        role: "user",
        parts: [
          {
            type: "text",
            text: `Analyze this Job Description and generate 5 technical questions, then use the 'save_interview_setup' tool to save them.\n\nJD:\n${jd}`
          }
        ]
      });
    } catch (err) {
      console.error("Error sending message:", err);
    }
  };

  const handleReset = async () => {
    setRecruiterState(null);
    setPhase(1);
    setJd("");
    await sendMessage({
      role: "user",
      parts: [{ type: "text", text: "Forget everything. I want to start a completely new recruiter session from scratch." }]
    });
  };

  return (
    <div className="min-h-screen w-full bg-white text-neutral-900 flex flex-col items-center p-8 font-sans transition-colors duration-500">
      <div className="max-w-2xl w-full space-y-12 mt-12">
        <Header 
          questionsLength={recruiterState?.questions?.length || 0} 
          onReset={handleReset} 
        />

        {phase === 1 ? (
          <Phase1 
            jd={jd} 
            setJd={setJd} 
            onSubmit={handleGenerateQuestions} 
            isLoading={isGenerating} 
          />
        ) : (
          <div className="space-y-8">
            {!recruiterState?.questions || recruiterState.questions.length === 0 ? (
              <LoadingState />
            ) : (
              <Phase2 
                questions={recruiterState.questions} 
                onBack={() => setPhase(1)} 
                onStartInterview={() => console.log("Starting interview...")} 
              />
            )}
          </div>
        )}
      </div>
    </div>
  );
}
