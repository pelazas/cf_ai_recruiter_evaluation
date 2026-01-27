interface HeaderProps {
  questionsLength: number;
  onReset: () => void;
}

export function Header({ questionsLength, onReset }: HeaderProps) {
  return (
    <header className="space-y-4 flex justify-between items-start">
      <div className="space-y-4">
        <h1 className="text-4xl font-light tracking-tight">AI Auto-Recruiter</h1>
        <p className="text-neutral-500 text-lg">Automated hiring assistant for technical interviews.</p>
      </div>
      {questionsLength > 0 && (
        <button 
          onClick={onReset}
          className="px-4 py-2 border border-neutral-200 rounded-lg text-sm text-neutral-500 hover:bg-neutral-50 hover:text-neutral-800 transition-all cursor-pointer"
        >
          Start New Session
        </button>
      )}
    </header>
  );
}
