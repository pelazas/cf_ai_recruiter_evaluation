interface Phase2Props {
  questions: string[];
  onBack: () => void;
  onStartInterview: () => void;
}

export function Phase2({ questions, onBack, onStartInterview }: Phase2Props) {
  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
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
        {questions.map((q, i) => (
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
          onClick={onBack}
          className="text-neutral-400 hover:text-neutral-600 text-sm font-medium transition-colors cursor-pointer"
        >
          ← Back to Job Description
        </button>
        
        <button
          onClick={onStartInterview}
          className="px-8 py-3 bg-black text-white rounded-full font-medium hover:bg-neutral-800 transition-colors cursor-pointer"
        >
          Start Interview →
        </button>
      </div>
    </div>
  );
}
