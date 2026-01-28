export function LoadingState() {
  return (
    <div className="flex flex-col items-center justify-center py-20 space-y-4 animate-in fade-in duration-500">
      <div className="w-8 h-8 border-4 border-black/10 border-t-black rounded-full animate-spin" />
      <p className="text-neutral-500 animate-pulse">AI is crafting your technical questions...</p>
      <p className="text-xs text-neutral-400">This might take a few seconds as we analyze the JD.</p>
    </div>
  );
}
