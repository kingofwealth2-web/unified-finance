import React from 'react';

function App() {
  // This is a placeholder for your real database data
  const member = { name: "Prince Kofi", total: 45200 };
  
  return (
    <div className="min-h-screen p-6 md:p-12 max-w-4xl mx-auto">
      <header className="flex justify-between items-center mb-12">
        <div>
          <h2 className="text-sm font-semibold opacity-50 tracking-tight text-gray-500">KINGDOM LEDGER</h2>
          <h1 className="text-3xl font-bold tracking-tight text-gray-900">Financial Overview</h1>
        </div>
        <div className="h-12 w-12 rounded-full bg-gradient-to-tr from-blue-600 to-sky-400 shadow-lg" />
      </header>

      {/* Main Stats Card */}
      <div className="glass-card rounded-[32px] p-8 mb-8 shadow-sm bg-white/70">
        <p className="text-xs font-bold uppercase tracking-[0.2em] text-blue-600 mb-2">Total Partnership</p>
        <h3 className="text-6xl font-bold tracking-tighter text-gray-900">
          ${member.total.toLocaleString()}
        </h3>
      </div>

      {/* Progress Sections */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white rounded-[24px] p-6 shadow-sm border border-gray-100">
          <h4 className="font-semibold mb-4 text-gray-800">Church Welfare</h4>
          <div className="h-2 w-full bg-gray-100 rounded-full overflow-hidden">
            <div className="h-full bg-blue-500 w-[70%]" />
          </div>
          <p className="mt-2 text-sm text-gray-500">$31,640 contributed</p>
        </div>

        <div className="bg-white rounded-[24px] p-6 shadow-sm border border-gray-100">
          <h4 className="font-semibold mb-4 text-gray-800">Education Fund</h4>
          <div className="h-2 w-full bg-gray-100 rounded-full overflow-hidden">
            <div className="h-full bg-emerald-500 w-[30%]" />
          </div>
          <p className="mt-2 text-sm text-gray-500">$13,560 contributed</p>
        </div>
      </div>
    </div>
  );
}

export default App;