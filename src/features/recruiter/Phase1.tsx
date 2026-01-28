interface Phase1Props {
  jd: string;
  setJd: (value: string) => void;
  onSubmit: () => void;
  isLoading: boolean;
}

export function Phase1({ jd, setJd, onSubmit, isLoading }: Phase1Props) {
  return (
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
          disabled={isLoading}
        />
        
        <button
          onClick={onSubmit}
          disabled={!jd.trim() || isLoading}
          className="w-full py-4 bg-black text-white rounded-xl font-medium hover:bg-neutral-800 disabled:bg-neutral-200 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2 cursor-pointer"
        >
          {isLoading ? (
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
  );
}
