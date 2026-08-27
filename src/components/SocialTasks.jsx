import React from 'react';
import { sound } from '../utils/audio';

export const SocialTasks = ({ taskStates, onOpenTask, onVerifyTask }) => {
  const verifiedCount = Object.values(taskStates).filter((s) => s === 'VERIFIED').length;

  return (
    <div className="space-y-3 select-none">
      <div className="bg-black text-white p-3 sm:p-3.5 border-3 border-black flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        <div>
          <div className="font-pixel text-[11px] sm:text-xs text-[#FFD700] flex items-center gap-2">
            <span className="w-2.5 h-2.5 bg-[#00FF66] inline-block animate-blink" />
            <span>COMPLETE THE CHECKLIST</span>
          </div>
          <p className="font-mono-code text-[11px] text-gray-300 mt-0.5 font-medium">
            Open each link and verify to unlock application submission.
          </p>
        </div>
        <div className="bg-[#140D24] text-[#00FF66] font-pixel text-[9px] sm:text-[10px] px-2.5 py-1 border-2 border-black self-start sm:self-auto">
          VERIFIED: {verifiedCount} / 3
        </div>
      </div>

      {/* Task 1: Follow on X */}
      <div className="bg-white border-3 border-black p-3 sm:p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-pixel-sm">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 bg-black text-white flex items-center justify-center border-2 border-black shrink-0">
            <svg className="w-4 h-4 fill-current" viewBox="0 0 24 24">
              <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
            </svg>
          </div>
          <div>
            <div className="font-pixel text-[10px] sm:text-[11px] text-black">
              FOLLOW APEBROKERS ON X
            </div>
            <div className="font-mono-code text-xs text-gray-600 font-medium">@ApeBrokers official</div>
          </div>
        </div>

        <div className="flex items-center gap-2 self-end sm:self-auto">
          <button
            type="button"
            onClick={() => onOpenTask('https://x.com', 'followX')}
            className="pixel-btn bg-white hover:bg-black hover:text-white px-3 py-2 text-[10px] font-pixel min-h-[40px] flex items-center"
          >
            [ FOLLOW ]
          </button>
          <button
            type="button"
            disabled={taskStates.followX === 'LOCKED' || taskStates.followX === 'VERIFIED'}
            onClick={() => onVerifyTask('followX')}
            className={`pixel-btn px-3 py-2 text-[10px] font-pixel min-h-[40px] flex items-center ${
              taskStates.followX === 'VERIFIED'
                ? 'bg-[#00FF66] text-black cursor-default'
                : taskStates.followX === 'READY'
                ? 'bg-[#FFD700] text-black animate-pulse'
                : 'bg-gray-200 text-gray-500 cursor-not-allowed border-gray-400'
            }`}
          >
            {taskStates.followX === 'VERIFIED'
              ? '✓ COMPLETED'
              : taskStates.followX === 'VERIFYING'
              ? 'CHECKING...'
              : taskStates.followX === 'READY'
              ? '[ VERIFY ]'
              : 'LOCKED'}
          </button>
        </div>
      </div>

      {/* Task 2: Join Discord */}
      <div className="bg-white border-3 border-black p-3 sm:p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-pixel-sm">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 bg-[#2A0845] text-white flex items-center justify-center border-2 border-black shrink-0">
            <svg className="w-4 h-4 fill-current" viewBox="0 0 24 24">
              <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028c.462-.63.874-1.295 1.226-1.994.021-.041.001-.09-.041-.106a13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.929 1.793 8.18 1.793 12.061 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.894.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.028zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.946 2.418-2.157 2.418z"/>
            </svg>
          </div>
          <div>
            <div className="font-pixel text-[10px] sm:text-[11px] text-black">
              JOIN APEBROKERS DISCORD
            </div>
            <div className="font-mono-code text-xs text-gray-600 font-medium">Trading Floor Community</div>
          </div>
        </div>

        <div className="flex items-center gap-2 self-end sm:self-auto">
          <button
            type="button"
            onClick={() => onOpenTask('https://discord.com', 'joinDiscord')}
            className="pixel-btn bg-white hover:bg-black hover:text-white px-3 py-2 text-[10px] font-pixel min-h-[40px] flex items-center"
          >
            [ JOIN ]
          </button>
          <button
            type="button"
            disabled={taskStates.joinDiscord === 'LOCKED' || taskStates.joinDiscord === 'VERIFIED'}
            onClick={() => onVerifyTask('joinDiscord')}
            className={`pixel-btn px-3 py-2 text-[10px] font-pixel min-h-[40px] flex items-center ${
              taskStates.joinDiscord === 'VERIFIED'
                ? 'bg-[#00FF66] text-black cursor-default'
                : taskStates.joinDiscord === 'READY'
                ? 'bg-[#FFD700] text-black animate-pulse'
                : 'bg-gray-200 text-gray-500 cursor-not-allowed border-gray-400'
            }`}
          >
            {taskStates.joinDiscord === 'VERIFIED'
              ? '✓ COMPLETED'
              : taskStates.joinDiscord === 'VERIFYING'
              ? 'CHECKING...'
              : taskStates.joinDiscord === 'READY'
              ? '[ VERIFY ]'
              : 'LOCKED'}
          </button>
        </div>
      </div>

      {/* Task 3: Repost Announcement */}
      <div className="bg-white border-3 border-black p-3 sm:p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-pixel-sm">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 bg-black text-[#FFD700] flex items-center justify-center border-2 border-black shrink-0 font-pixel text-xs font-bold">
            RT
          </div>
          <div>
            <div className="font-pixel text-[10px] sm:text-[11px] text-black">
              REPOST THE WL ANNOUNCEMENT
            </div>
            <div className="font-mono-code text-xs text-gray-600 font-medium">Spread the alpha on X</div>
          </div>
        </div>

        <div className="flex items-center gap-2 self-end sm:self-auto">
          <button
            type="button"
            onClick={() => onOpenTask('https://x.com/intent/retweet', 'repostWL')}
            className="pixel-btn bg-white hover:bg-black hover:text-white px-3 py-2 text-[10px] font-pixel min-h-[40px] flex items-center"
          >
            [ REPOST ]
          </button>
          <button
            type="button"
            disabled={taskStates.repostWL === 'LOCKED' || taskStates.repostWL === 'VERIFIED'}
            onClick={() => onVerifyTask('repostWL')}
            className={`pixel-btn px-3 py-2 text-[10px] font-pixel min-h-[40px] flex items-center ${
              taskStates.repostWL === 'VERIFIED'
                ? 'bg-[#00FF66] text-black cursor-default'
                : taskStates.repostWL === 'READY'
                ? 'bg-[#FFD700] text-black animate-pulse'
                : 'bg-gray-200 text-gray-500 cursor-not-allowed border-gray-400'
            }`}
          >
            {taskStates.repostWL === 'VERIFIED'
              ? '✓ COMPLETED'
              : taskStates.repostWL === 'VERIFYING'
              ? 'CHECKING...'
              : taskStates.repostWL === 'READY'
              ? '[ VERIFY ]'
              : 'LOCKED'}
          </button>
        </div>
      </div>
    </div>
  );
};
