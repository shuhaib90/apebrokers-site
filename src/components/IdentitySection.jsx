import React from 'react';

export const IdentitySection = () => {
  return (
    <section id="about" className="py-24 px-4 sm:px-6 max-w-5xl mx-auto select-none border-t border-[#202b37]">
      <div className="text-center max-w-2xl mx-auto mb-14">
        <p className="eyebrow mb-2">WHAT IS AN APEBROKER?</p>
        <h2 className="text-3xl sm:text-5xl font-black tracking-tight text-white mb-4">
          Not just an NFT.<br />A persistent identity.
        </h2>
        <p className="text-gray-300 text-base leading-relaxed">
          ApeBroker is more than an NFT sitting in your wallet. It represents your permanent seat on the Robinhood Chain trading floor, carrying its own identity, alpha, and onchain history.
        </p>
      </div>

      {/* Split Section */}
      <div className="glass-panel p-6 sm:p-10">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-8 items-center">
          {/* Left Column */}
          <div className="md:col-span-6 space-y-4 md:border-r border-[#2e3e4f] md:pr-8">
            <span className="text-xs font-mono font-black tracking-widest text-[#00FF66]">
              01 // CORE CONCEPT
            </span>
            <h3 className="text-2xl sm:text-3xl font-black text-white leading-tight">
              You own the Broker.<br />
              <span className="text-[#00FF66]">The Broker commands the floor.</span>
            </h3>
            <p className="text-gray-300 text-sm leading-relaxed">
              This creates a powerful bond between holder and collection. Instead of simply holding a collectible, you are granted active membership in the Robinhood Chain alpha syndicate.
            </p>
          </div>

          {/* Right Column List */}
          <div className="md:col-span-6 space-y-3 md:pl-4">
            <p className="text-sm font-bold text-gray-300">An ApeBroker gives you:</p>
            <ul className="space-y-2.5 text-sm text-gray-200">
              <li className="flex items-center gap-3">
                <span className="w-2 h-2 rounded-full bg-[#00FF66] shrink-0" />
                <span>Guaranteed Whitelist Mint Allocation</span>
              </li>
              <li className="flex items-center gap-3">
                <span className="w-2 h-2 rounded-full bg-[#FFD700] shrink-0" />
                <span>Exclusive Discord Trading Floor Access</span>
              </li>
              <li className="flex items-center gap-3">
                <span className="w-2 h-2 rounded-full bg-[#00FF66] shrink-0" />
                <span>Priority Gas & Execution on Robinhood Chain</span>
              </li>
              <li className="flex items-center gap-3">
                <span className="w-2 h-2 rounded-full bg-[#e875a6] shrink-0" />
                <span>$BROKER Utility Token Drop Eligibility</span>
              </li>
              <li className="flex items-center gap-3">
                <span className="w-2 h-2 rounded-full bg-[#00FF66] shrink-0" />
                <span>Community Governance & Floor Alpha</span>
              </li>
            </ul>
          </div>
        </div>
      </div>
    </section>
  );
};
