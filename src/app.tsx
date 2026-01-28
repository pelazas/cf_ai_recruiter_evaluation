import { useState } from "react";
import { useAgent } from "agents/react";
import { useAgentChat } from "@cloudflare/ai-chat/react";
import type { UIMessage } from "@ai-sdk/react";

import { Header } from "./features/recruiter/Header";
import { Phase1 } from "./features/recruiter/Phase1";
import { Phase2 } from "./features/recruiter/Phase2";
import { LoadingState } from "./features/recruiter/LoadingState";
import { InterviewRoom } from "./features/interview/InterviewRoom";

export interface RecruiterState {
  jobDescription?: string;
  questions: string[];
  currentQuestionIndex: number;
  responses: Record<number, string>;
}

export default function App() {
  const [phase, setPhase] = useState<1 | 2 | 3>(1);
  const [jd, setJd] = useState("");
  const [recruiterState, setRecruiterState] = useState<RecruiterState | null>(null);

  const agent = useAgent({
    agent: "chat",
    onStateUpdate: (state) => {
      console.log("AGENT STATE UPDATE:", state);
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
            text: `Analyze this Job Description and generate 5 technical questions, then use the 'setup_interview' tool to save them.\n\nJD:\n${jd}`
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

  const [isTranscribing, setIsTranscribing] = useState(false);

  const handleInterviewComplete = async (responses: { question: string; audio: Blob }[]) => {
    setIsTranscribing(true);
    console.log("Interview Complete! Starting transcription for all answers...");
    
    const finalResults: { Question: string; Answer: string }[] = [];

    for (const res of responses) {
      try {
        const formData = new FormData();
        formData.append("file", res.audio);

        const response = await fetch("/transcribe", {
          method: "POST",
          body: formData
        });

        if (!response.ok) throw new Error("Transcription failed");

        const data = await response.json() as { text: string };
        finalResults.push({
          Question: res.question,
          Answer: data.text
        });

      } catch (err) {
        console.error("Transcription failed for question:", res.question, err);
        finalResults.push({
          Question: res.question,
          Answer: "[Error transcribing audio]"
        });
      }
    }

    console.log("\n\n=== 🤖 AI RECRUITER: INTERVIEW SUMMARY ===");
    console.table(finalResults);
    console.log("========================================\n\n");

    setIsTranscribing(false);
    alert("Interview complete! A full report has been printed to the browser console (F12).");
    setPhase(1);
    setJd("");
  };

  return (
    <div className="min-h-screen w-full bg-white text-neutral-900 flex flex-col items-center p-8 font-sans transition-colors duration-500">
      <div className="max-w-2xl w-full space-y-12 mt-12">
        <Header 
          questionsLength={recruiterState?.questions?.length || 0} 
          onReset={handleReset} 
        />

        {isTranscribing ? (
          <div className="flex flex-col items-center justify-center space-y-6 py-20 animate-in fade-in duration-700">
            <div className="w-12 h-12 border-2 border-black border-t-transparent rounded-full animate-spin" />
            <div className="text-center space-y-2">
              <h2 className="text-2xl font-light">Processing Interview...</h2>
              <p className="text-neutral-500">Transcribing your technical responses with AI.</p>
            </div>
          </div>
        ) : (
          <>
            {phase === 1 && (
              <Phase1 
                jd={jd} 
                setJd={setJd} 
                onSubmit={handleGenerateQuestions} 
                isLoading={isGenerating} 
              />
            )}

            {phase === 2 && (
              <div className="space-y-8">
                {!recruiterState?.questions || recruiterState.questions.length === 0 ? (
                  <LoadingState />
                ) : (
                  <Phase2 
                    questions={recruiterState.questions} 
                    onBack={() => setPhase(1)} 
                    onStartInterview={() => setPhase(3)} 
                  />
                )}
              </div>
            )}

            {phase === 3 && recruiterState?.questions && (
              <InterviewRoom 
                questions={recruiterState.questions} 
                onComplete={handleInterviewComplete} 
              />
            )}
          </>
        )}
      </div>
    </div>
  );
}
