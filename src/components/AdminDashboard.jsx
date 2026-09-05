import React, { useState, useEffect } from 'react';
import { supabase } from '../utils/supabase';
import { sound } from '../utils/audio';

export const AdminDashboard = ({ onBackHome }) => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [pinInput, setPinInput] = useState('');
  const [pinError, setPinError] = useState('');

  const [applications, setApplications] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [fetchError, setFetchError] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [filterTier, setFilterTier] = useState('ALL'); // 'ALL' | 'GTD' | 'STANDARD'
  const [copiedId, setCopiedId] = useState(null);

  // Default admin PIN (can also be entered as 'admin' or 'ape2026' or '8888')
  const VALID_PINS = ['ape2026', 'admin', '8888', 'apebrokers'];

  const handlePinSubmit = (e) => {
    e.preventDefault();
    if (VALID_PINS.includes(pinInput.trim().toLowerCase())) {
      sound?.playVerifyChime?.();
      setIsAuthenticated(true);
      setPinError('');
    } else {
      sound?.playBlip?.();
      setPinError('Invalid Admin Passcode.');
    }
  };

  const fetchApplications = async () => {
    setIsLoading(true);
    setFetchError('');
    try {
      const { data, error } = await supabase
        .from('apebrokers_applications')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching applications:', error);
        setFetchError('Failed to fetch applications from Supabase.');
      } else {
        setApplications(data || []);
      }
    } catch (err) {
      console.error('Fetch exception:', err);
      setFetchError('Connection error while fetching database records.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (isAuthenticated) {
      fetchApplications();
    }
  }, [isAuthenticated]);

  // Export to CSV
  const handleExportCSV = () => {
    sound?.playClick?.();
    if (applications.length === 0) return;

    const headers = ['Broker ID', 'Wallet Address', 'X Username', 'Status', 'Is GTD', 'Card Tier', 'Submission Date'];
    const rows = applications.map((app) => [
      `"${app.broker_id || ''}"`,
      `"${app.wallet_address || ''}"`,
      `"${app.x_username || ''}"`,
      `"${app.status || ''}"`,
      app.is_gtd ? 'GTD' : 'STANDARD_WL',
      `"${app.card_tier || ''}"`,
      `"${new Date(app.created_at || Date.now()).toISOString()}"`,
    ]);

    const csvContent = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `ApeSyndicate_Whitelist_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const copyToClipboard = (text, id) => {
    sound?.playClick?.();
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  // Filtered applications
  const filtered = applications.filter((app) => {
    const matchesSearch =
      !searchQuery.trim() ||
      (app.wallet_address && app.wallet_address.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (app.x_username && app.x_username.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (app.broker_id && app.broker_id.toLowerCase().includes(searchQuery.toLowerCase()));

    const matchesFilter =
      filterTier === 'ALL' ||
      (filterTier === 'GTD' && app.is_gtd) ||
      (filterTier === 'STANDARD' && !app.is_gtd);

    return matchesSearch && matchesFilter;
  });

  const totalCount = applications.length;
  const gtdCount = applications.filter((a) => a.is_gtd).length;
  const standardCount = totalCount - gtdCount;

  // Authentication Screen
  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-[#070314] text-white flex flex-col justify-between font-pixel selection:bg-[#00FF66] selection:text-black p-4">
        <header className="w-full max-w-6xl mx-auto flex items-center justify-between py-4 border-b-4 border-black">
          <div className="flex items-center gap-2">
            <span className="w-3 h-3 bg-[#00FF66] rounded-full animate-blink" />
            <span className="font-pixel text-xs sm:text-base text-[#00FF66] font-extrabold">
              APESYNDICATE ADMIN
            </span>
          </div>
          <button
            type="button"
            onClick={onBackHome}
            className="pixel-btn pixel-btn-black px-3 py-1.5 text-xs text-white border-2 border-black rounded"
          >
            [ ← RETURN HOME ]
          </button>
        </header>

        <main className="flex-grow flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-[#0e0722] border-4 border-black ring-2 ring-[#00FF66]/50 p-6 sm:p-8 rounded-lg shadow-[8px_8px_0px_0px_#000] text-center space-y-6">
            <div className="space-y-2">
              <div className="w-12 h-12 bg-[#00FF66]/20 border-2 border-[#00FF66] rounded-full mx-auto flex items-center justify-center text-[#00FF66] text-xl font-bold">
                🔒
              </div>
              <h1 className="font-pixel text-base sm:text-lg text-white font-extrabold">
                ADMIN ACCESS
              </h1>
              <p className="font-mono text-xs text-gray-400">
                Enter admin security passcode to manage whitelist applications.
              </p>
            </div>

            <form onSubmit={handlePinSubmit} className="space-y-4">
              <div>
                <input
                  type="password"
                  placeholder="Enter passcode (e.g. ape2026)"
                  value={pinInput}
                  onChange={(e) => setPinInput(e.target.value)}
                  className="w-full bg-[#05020c] border-2 border-[#4c1d95] focus:border-[#00FF66] text-[#00FF66] font-mono text-sm px-4 py-3 rounded outline-none text-center tracking-widest"
                  autoFocus
                />
                {pinError && (
                  <div className="text-[#FF007F] font-mono text-xs mt-2 font-bold">
                    {pinError}
                  </div>
                )}
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  className="w-full pixel-btn pixel-btn-lime py-3 text-xs font-extrabold text-black rounded"
                >
                  [ UNLOCK DASHBOARD ]
                </button>
              </div>
            </form>

            <div className="font-mono text-[10px] text-gray-500">
              Default passcode: <code className="text-[#00FF66]">ape2026</code>
            </div>
          </div>
        </main>

        <footer className="text-center font-pixel text-[9px] text-gray-500 py-4">
          ApeSyndicate Security Terminal • Authorized Personnel Only
        </footer>
      </div>
    );
  }

  // Authenticated Dashboard
  return (
    <div className="min-h-screen bg-[#070314] text-white flex flex-col font-pixel selection:bg-[#00FF66] selection:text-black">
      {/* Top Header */}
      <header className="sticky top-0 z-50 w-full bg-[#00FF66] border-b-4 border-black px-4 sm:px-8 py-3 select-none shadow-[0_4px_12px_rgba(0,0,0,0.2)]">
        <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <span className="font-pixel text-xs sm:text-base text-black font-extrabold tracking-wider">
              APESYNDICATE ADMIN CONSOLE
            </span>
            <span className="bg-black text-[#00FF66] text-[9px] px-2 py-0.5 rounded font-mono font-bold">
              LIVE DATABASE
            </span>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={fetchApplications}
              disabled={isLoading}
              className="pixel-btn pixel-btn-black px-3 py-1.5 text-[10px] sm:text-xs font-bold text-[#00FF66] border-2 border-black rounded shadow-[2px_2px_0px_#000]"
            >
              {isLoading ? '[ REFRESHING... ]' : '[ REFRESH ]'}
            </button>

            <button
              type="button"
              onClick={handleExportCSV}
              disabled={applications.length === 0}
              className="pixel-btn pixel-btn-black px-3 py-1.5 text-[10px] sm:text-xs font-bold text-[#FFD700] hover:bg-[#FFD700] hover:text-black border-2 border-black rounded shadow-[2px_2px_0px_#000]"
            >
              [ EXPORT CSV ]
            </button>

            <button
              type="button"
              onClick={onBackHome}
              className="pixel-btn pixel-btn-black px-3 py-1.5 text-[10px] sm:text-xs font-extrabold text-white hover:bg-white hover:text-black border-2 border-black rounded shadow-[2px_2px_0px_#000]"
            >
              [ ← HOME ]
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-grow p-4 sm:p-6 max-w-7xl mx-auto w-full space-y-6">
        {/* Metrics Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
          <div className="bg-[#0e0722] border-3 border-black ring-2 ring-[#3b1d6e] p-4 rounded-lg shadow-[4px_4px_0px_#000]">
            <div className="text-gray-400 font-pixel text-[9px]">TOTAL APPLICATIONS</div>
            <div className="font-pixel text-2xl sm:text-3xl text-white font-extrabold mt-1">
              {totalCount.toLocaleString()}
            </div>
            <div className="font-mono text-[10px] text-gray-400 mt-1">Registered in Supabase</div>
          </div>

          <div className="bg-[#051c12] border-3 border-black ring-2 ring-[#00FF66] p-4 rounded-lg shadow-[4px_4px_0px_#000]">
            <div className="text-[#7affaa] font-pixel text-[9px]">GUARANTEED (GTD) SPOTS</div>
            <div className="font-pixel text-2xl sm:text-3xl text-[#00FF66] font-extrabold mt-1">
              {gtdCount.toLocaleString()}
            </div>
            <div className="font-mono text-[10px] text-gray-400 mt-1">
              {totalCount > 0 ? ((gtdCount / totalCount) * 100).toFixed(1) : 0}% of total entries
            </div>
          </div>

          <div className="bg-[#051a26] border-3 border-black ring-2 ring-[#00F0FF] p-4 rounded-lg shadow-[4px_4px_0px_#000]">
            <div className="text-[#80f5ff] font-pixel text-[9px]">STANDARD WHITELIST</div>
            <div className="font-pixel text-2xl sm:text-3xl text-[#00F0FF] font-extrabold mt-1">
              {standardCount.toLocaleString()}
            </div>
            <div className="font-mono text-[10px] text-gray-400 mt-1">Under standard review queue</div>
          </div>
        </div>

        {/* Filter & Search Bar */}
        <div className="bg-[#0e0722] border-3 border-black ring-1 ring-[#3b1d6e] p-4 rounded-lg shadow-[4px_4px_0px_#000] flex flex-col sm:flex-row items-center justify-between gap-3">
          {/* Search */}
          <div className="w-full sm:w-80">
            <input
              type="text"
              placeholder="Search wallet, @username, or broker ID..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-[#05020c] border-2 border-[#4c1d95] focus:border-[#00FF66] text-[#00FF66] font-mono text-xs px-3 py-2 rounded outline-none"
            />
          </div>

          {/* Tier Filters */}
          <div className="flex items-center gap-2 w-full sm:w-auto overflow-x-auto">
            <button
              type="button"
              onClick={() => setFilterTier('ALL')}
              className={`pixel-btn px-3 py-1.5 text-[10px] font-bold rounded ${
                filterTier === 'ALL'
                  ? 'pixel-btn-lime text-black'
                  : 'pixel-btn-black text-gray-300 border border-[#444]'
              }`}
            >
              ALL ({totalCount})
            </button>

            <button
              type="button"
              onClick={() => setFilterTier('GTD')}
              className={`pixel-btn px-3 py-1.5 text-[10px] font-bold rounded ${
                filterTier === 'GTD'
                  ? 'bg-[#00FF66] text-black border-2 border-black font-extrabold'
                  : 'pixel-btn-black text-[#00FF66] border border-[#00FF66]'
              }`}
            >
              GTD ONLY ({gtdCount})
            </button>

            <button
              type="button"
              onClick={() => setFilterTier('STANDARD')}
              className={`pixel-btn px-3 py-1.5 text-[10px] font-bold rounded ${
                filterTier === 'STANDARD'
                  ? 'bg-[#00F0FF] text-black border-2 border-black font-extrabold'
                  : 'pixel-btn-black text-[#00F0FF] border border-[#00F0FF]'
              }`}
            >
              STANDARD ({standardCount})
            </button>
          </div>
        </div>

        {/* Applications Data Table */}
        <div className="bg-[#0e0722] border-3 border-black ring-1 ring-[#3b1d6e] rounded-lg shadow-[6px_6px_0px_#000] overflow-hidden">
          <div className="p-3 bg-[#140a2c] border-b-2 border-black flex items-center justify-between">
            <span className="font-pixel text-[11px] text-[#00FF66]">
              SHOWING {filtered.length} OF {totalCount} RECORDS
            </span>
          </div>

          {isLoading ? (
            <div className="p-12 text-center font-mono text-xs text-[#00FF66] space-y-2">
              <span className="inline-block w-3 h-3 bg-[#00FF66] rounded-full animate-ping" />
              <div>Fetching latest records from Supabase...</div>
            </div>
          ) : fetchError ? (
            <div className="p-8 text-center font-mono text-xs text-[#FF007F] space-y-2">
              <div>{fetchError}</div>
              <button
                type="button"
                onClick={fetchApplications}
                className="pixel-btn pixel-btn-black px-4 py-1.5 text-xs text-white border border-[#FF007F] rounded"
              >
                [ RETRY ]
              </button>
            </div>
          ) : filtered.length === 0 ? (
            <div className="p-12 text-center font-mono text-xs text-gray-400">
              No matching applications found.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left font-mono text-xs">
                <thead>
                  <tr className="bg-[#120826] border-b border-[#2b164f] text-[10px] text-gray-400 font-pixel">
                    <th className="p-3">#</th>
                    <th className="p-3">BROKER ID</th>
                    <th className="p-3">WALLET ADDRESS</th>
                    <th className="p-3">X HANDLE</th>
                    <th className="p-3">STATUS</th>
                    <th className="p-3">DATE</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#20103b]">
                  {filtered.map((app, idx) => (
                    <tr key={app.id || idx} className="hover:bg-[#160b33] transition-colors">
                      <td className="p-3 text-gray-500 text-[11px]">{idx + 1}</td>
                      <td className="p-3 font-pixel text-[10px] text-[#FFD700]">
                        {app.broker_id || `APE-${idx + 1}`}
                      </td>
                      <td className="p-3">
                        <div className="flex items-center gap-1.5">
                          <span className="text-gray-200 font-mono text-[11px]">
                            {app.wallet_address ? `${app.wallet_address.slice(0, 8)}...${app.wallet_address.slice(-6)}` : 'N/A'}
                          </span>
                          <button
                            type="button"
                            onClick={() => copyToClipboard(app.wallet_address, app.id || idx)}
                            className="text-[9px] text-[#00FF66] hover:underline"
                            title="Copy full address"
                          >
                            {copiedId === (app.id || idx) ? '✓ COPIED' : '[COPY]'}
                          </button>
                        </div>
                      </td>
                      <td className="p-3">
                        {app.x_username ? (
                          <a
                            href={`https://x.com/${app.x_username.replace(/^@/, '')}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-[#00F0FF] hover:underline font-bold text-[11px]"
                          >
                            @{app.x_username.replace(/^@/, '')}
                          </a>
                        ) : (
                          <span className="text-gray-500">N/A</span>
                        )}
                      </td>
                      <td className="p-3">
                        <span
                          className={`inline-block px-2 py-0.5 rounded font-pixel text-[9px] font-bold ${
                            app.is_gtd
                              ? 'bg-[#00FF66] text-black'
                              : 'bg-[#00F0FF]/20 text-[#00F0FF] border border-[#00F0FF]/50'
                          }`}
                        >
                          {app.is_gtd ? 'GTD' : 'STANDARD WL'}
                        </span>
                      </td>
                      <td className="p-3 text-gray-400 text-[10px] whitespace-nowrap">
                        {app.created_at ? new Date(app.created_at).toLocaleDateString() : 'Recent'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </main>
    </div>
  );
};
