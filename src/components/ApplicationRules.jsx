import React from 'react';

export const ApplicationRules = () => {
  const rules = [
    "One application per person.",
    "Submit accurate information.",
    "Duplicate or suspicious applications may be rejected.",
    "Completing the application does not guarantee a WL spot.",
    "Final WL selection is determined by the ApeBrokers team."
  ];

  return (
    <section className="py-6 max-w-4xl mx-auto px-4">
      <div className="bg-broker-card border-4 border-black p-4 sm:p-6 shadow-pixel-md">
        {/* Rules Header */}
        <div className="flex items-center gap-2 border-b-2 border-broker-card-light pb-3 mb-4">
          <div className="w-3 h-3 bg-broker-crimson border border-black" />
          <h3 className="font-pixel text-xs sm:text-sm text-broker-white tracking-wider uppercase">
            BROKER APPLICATION RULES
          </h3>
        </div>

        {/* Rules List */}
        <ul className="space-y-2.5 font-mono-code text-xs sm:text-sm text-gray-300">
          {rules.map((rule, idx) => (
            <li key={idx} className="flex items-start gap-2.5">
              <span className="font-pixel text-[10px] text-broker-gold mt-0.5 select-none">
                [{idx + 1}]
              </span>
              <span className="leading-relaxed">{rule}</span>
            </li>
          ))}
        </ul>

        {/* Footer Warning */}
        <div className="mt-4 pt-3 border-t border-broker-card-light font-pixel text-[8px] sm:text-[9px] text-gray-400 flex items-center justify-between">
          <span>BROKER POLICIES & TERMS</span>
          <span className="text-broker-gold">ROBINHOOD CHAIN PROTOCOL</span>
        </div>
      </div>
    </section>
  );
};
