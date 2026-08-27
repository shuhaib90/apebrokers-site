import React from "react";
import { sound } from "../utils/audio";

export const ApplicationRulesModal = ({ onClose, onOpenTerminal }) => {
  const rules = [
    "One application per person.",
    "Submit accurate information.",
    "Duplicate or suspicious applications may be rejected.",
    "Completing the application does not guarantee a WL spot.",
    "Final WL selection is determined by the ApeBrokers team."
  ];

  return (
    <div className="fixed inset-0 z-50 bg-black/85 flex items-center justify-center p-3 sm:p-6 overflow-y-auto animate-fadeIn">
      <div className="bg-broker-black border-4 border-black max-w-xl w-full p-4 sm:p-6 shadow-pixel-xl relative space-y-5">
        <div className="bg-broker-purple border-3 border-black p-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="w-3 h-3 bg-broker-crimson inline-block animate-blink" />
            <h2 className="font-pixel text-xs sm:text-sm text-broker-gold tracking-wider">
              FILING CABINET // BROKER APPLICATION RULES
            </h2>
          </div>
          <button
            type="button"
            onClick={() => { sound.playClick(); onClose(); }}
            className="pixel-btn pixel-btn-crimson px-2.5 py-1 text-[10px]"
          >
            [ CLOSE ✕ ]
          </button>
        </div>

        <div className="bg-broker-card p-4 border-2 border-broker-card-light space-y-3">
          <ul className="space-y-3 font-mono-code text-xs sm:text-sm text-gray-200">
            {rules.map((r, i) => (
              <li key={i} className="flex items-start gap-2.5">
                <span className="font-pixel text-[10px] text-broker-gold mt-0.5">[{i + 1}]</span>
                <span>{r}</span>
              </li>
            ))}
          </ul>
        </div>

        <div className="pt-2">
          <button
            type="button"
            onClick={() => { sound.playZoom(); onClose(); onOpenTerminal(); }}
            className="w-full py-3 pixel-btn pixel-btn-primary font-pixel text-xs tracking-wider"
          >
            [ I AGREE — LAUNCH WL TERMINAL ]
          </button>
        </div>
      </div>
    </div>
  );
};
