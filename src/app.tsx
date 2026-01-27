import { useState } from "react";
import { useAgent } from "agents/react";
import { useAgentChat } from "@cloudflare/ai-chat/react";
import type { UIMessage } from "@ai-sdk/react";

interface RecruiterState {
  jobDescription?: string;
  questions: string[];
  currentQuestionIndex: number;
  responses: Record<number, string>;
}

export default function Chat() {
  const [phase, setPhase] = useState<1 | 2>(1);
  const [jd, setJd] = useState("");
  const [recruiterState, setRecruiterState] = useState<RecruiterState | null>(null);

  const agent = useAgent({
    agent: "chat",
    onStateUpdate: (state) => {
      const s = state as RecruiterState;
      setRecruiterState(s);
      if (s.questions?.length === 5) {
        setPhase(2);
      }
    }
  });

  const {
    sendMessage,
    status
  } = useAgentChat<unknown, UIMessage<{ createdAt: string }>>({
    agent
  });

  const handleGenerateQuestions = async () => {
    console.log("handleGenerateQuestions triggered");
    if (!jd.trim()) return;
    
    // Clear local state first so the spinner shows immediately in Phase 2
    setRecruiterState(prev => prev ? { ...prev, questions: [] } : null);
    setPhase(2); 
    
    try {
      console.log("Sending JD to agent...");
      await sendMessage({
        role: "user",
        parts: [
          {
            type: "text",
            text: `Analyze this Job Description and generate 5 technical questions, then use the 'save_interview_setup' tool to save them.\n\nJD:\n${jd}`
          }
        ]
      });
      console.log("Message sent successfully");
    } catch (err) {
      console.error("Error sending message:", err);
    }
  };

  return (
    <div className="min-h-screen w-full bg-white text-neutral-900 flex flex-col items-center p-8 font-sans">
      <HasOpenAIKey />
      
      <div className="max-w-2xl w-full space-y-12 mt-12">
        <header className="space-y-4 flex justify-between items-start">
          <div className="space-y-4">
            <h1 className="text-4xl font-light tracking-tight">AI Auto-Recruiter</h1>
            <p className="text-neutral-500 text-lg">Automated hiring assistant for technical interviews.</p>
          </div>
          {(recruiterState?.questions?.length || 0) > 0 && (
            <button 
              onClick={async () => {
                setRecruiterState(null);
                setPhase(1);
                setJd("");
                // Optionally call the tool via a hidden message if we really want to wipe the server state immediately
                await sendMessage({
                  role: "user",
                  parts: [{ type: "text", text: "Forget everything. I want to start a completely new recruiter session from scratch." }]
                });
              }}
              className="px-4 py-2 border border-neutral-200 rounded-lg text-sm text-neutral-500 hover:bg-neutral-50 hover:text-neutral-800 transition-all"
            >
              Start New Session
            </button>
          )}
        </header>

        {phase === 1 ? (
          <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
            <section className="space-y-4">
              <h2 className="text-xl font-medium">Phase 1: Job Description</h2>
              <p className="text-neutral-600">
                Paste the job description below. Our AI will analyze the requirements and generate 5 targeted technical questions to evaluate candidates.
              </p>
            </section>

            <div className="space-y-4">
              <textarea
                value={jd}
                onChange={(e) => setJd(e.target.value)}
                placeholder="Paste Job Description here..."
                className="w-full h-64 p-6 bg-neutral-50 border border-neutral-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-black/5 transition-all resize-none text-base leading-relaxed"
                disabled={status === "submitted" || status === "streaming"}
              />
              
              <button
                onClick={handleGenerateQuestions}
                disabled={!jd.trim() || status === "submitted" || status === "streaming"}
                className="w-full py-4 bg-black text-white rounded-xl font-medium hover:bg-neutral-800 disabled:bg-neutral-200 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
              >
                {status === "submitted" || status === "streaming" ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    Analyzing JD...
                  </>
                ) : (
                  "Generate Technical Questions"
                )}
              </button>
            </div>
          </div>
        ) : (
          <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
            {!recruiterState?.questions || recruiterState.questions.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-20 space-y-4">
                <div className="w-8 h-8 border-4 border-black/10 border-t-black rounded-full animate-spin" />
                <p className="text-neutral-500 animate-pulse">AI is crafting your technical questions...</p>
                <p className="text-xs text-neutral-400">This might take a few seconds as we analyze the JD.</p>
              </div>
            ) : (
              <>
                <section className="space-y-4">
                  <div className="flex items-center gap-2 text-green-600">
                    <div className="w-2 h-2 bg-green-600 rounded-full" />
                    <h2 className="text-xl font-medium text-neutral-900">Phase 2: Interview Questions Ready</h2>
                  </div>
                  <p className="text-neutral-600">
                    The following questions have been generated based on the JD. These will be used for the candidate's interview.
                  </p>
                </section>

                <div className="space-y-4">
                  {recruiterState?.questions.map((q, i) => (
                    <div 
                      key={i} 
                      className="p-6 bg-neutral-50 border border-neutral-100 rounded-xl space-y-2 hover:border-neutral-200 transition-colors"
                    >
                      <span className="text-xs font-bold text-neutral-400 uppercase tracking-widest">Question {i + 1}</span>
                      <p className="text-lg text-neutral-800">{q}</p>
                    </div>
                  ))}
                </div>

                <div className="flex justify-between items-center pt-8">
                  <button
                    onClick={() => setPhase(1)}
                    className="text-neutral-400 hover:text-neutral-600 text-sm font-medium transition-colors"
                  >
                    ← Back to Job Description
                  </button>
                  
                  <button
                    className="px-8 py-3 bg-black text-white rounded-full font-medium hover:bg-neutral-800 transition-colors"
                  >
                    Start Interview →
                  </button>
                </div>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

const hasOpenAiKeyPromise = Promise.resolve({ success: true });

function HasOpenAIKey() {
  return null;
}
