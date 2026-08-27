import React from 'react';

const PHASES = [
  {
    phase: 'PHASE 01',
    title: 'Genesis Mint',
    color: '#00FF66',
    desc: '2,222 unique pixel ApeBrokers minted exclusively on Robinhood Chain with token-bound verified accounts.',
    bullets: ['Guaranteed WL Mint Window', '2,222 Fixed Supply', 'Unique 16-Bit Pixel Traits'],
  },
  {
    phase: 'PHASE 02',
    title: 'Trading Floor Syndicate',
    color: '#e875a6',
    desc: 'Exclusive access to the private ApeBrokers Discord desks, floor alpha feeds, and broker identity verification.',
    bullets: ['Floor Trader Roles', 'Exclusive Alpha Callouts', 'Syndicate Governance'],
  },
  {
    phase: 'PHASE 03',
    title: '$BROKER Drop',
    color: '#5ec8ff',
    desc: 'Utility token planned to connect the ecosystem, distributed to eligible minters and floor participants.',
    bullets: ['Snapshot 24h after sellout', 'Original Minters Eligible', 'Ecosystem Staking Alpha'],
  },
  {
    phase: 'PHASE 04',
    title: 'Terminal Expansion',
    color: '#9682e7',
    desc: 'Deployment of specialized onchain broker tools, interactive trading modules, and Robinhood Chain liquidity rewards.',
    bullets: ['Interactive Retro Terminals', 'Trading Liquidity Alpha', 'Cross-Protocol Integrations'],
  },
];

export const PhasesSection = () => {
  return (
    <section id="phases" className="py-24 px-4 sm:px-6 max-w-6xl mx-auto select-none border-t border-[#202b37]">
      <div className="text-center max-w-2xl mx-auto mb-14">
        <p className="eyebrow mb-2">ROADMAP & PHASES</p>
        <h2 className="text-3xl sm:text-5xl font-black tracking-tight text-white mb-4">
          You own the Broker.<br />The Broker executes the plan.
        </h2>
        <p className="text-gray-300 text-base leading-relaxed">
          ApeBrokers is an onchain syndicate built for longevity, community-driven alpha, and Robinhood Chain dominance.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {PHASES.map((p, idx) => (
          <div
            key={idx}
            className="glass-panel p-6 sm:p-7 relative overflow-hidden flex flex-col justify-between hover:border-[#00FF66]/50 transition-colors"
          >
            {/* Top Accent Line */}
            <div
              className="absolute top-0 left-0 right-0 h-1"
              style={{ backgroundColor: p.color }}
            />

            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span
                  className="text-xs font-mono font-bold px-2.5 py-1 rounded-md border"
                  style={{ color: p.color, borderColor: `${p.color}55`, backgroundColor: `${p.color}15` }}
                >
                  {p.phase}
                </span>
                <span className="text-xs text-gray-500 font-mono">0{idx + 1}</span>
              </div>

              <h3 className="text-xl font-bold text-white tracking-tight">
                {p.title}
              </h3>

              <p className="text-xs text-gray-300 leading-relaxed">
                {p.desc}
              </p>
            </div>

            <div className="pt-6 border-t border-[#202b37] mt-6">
              <ul className="space-y-2 text-xs text-gray-300">
                {p.bullets.map((b, i) => (
                  <li key={i} className="flex items-center gap-2">
                    <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ backgroundColor: p.color }} />
                    <span>{b}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
};
