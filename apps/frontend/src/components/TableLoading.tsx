import { useState } from 'react'

function BoxLoader({ className }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      className={className}
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      {/* Box base */}
      <path d="M21 8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16Z" />
      {/* Inner lines */}
      <path d="m3.3 7 8.7 5 8.7-5" />
      <path d="M12 22V12" />
    </svg>
  )
}

const LOADING_MESSAGES = [
  'Crunching the numbers',
  'Fetching fresh data',
  'Aggregating results',
  'Calculating totals',
  'Analyzing the data',
  'Processing records',
  'Querying the database',
  'Compiling your report',
  'Sifting through records',
  'Loading your data',
  'Gathering information',
  'Building the view',
  'Preparing results',
  'Syncing data',
  'Almost there',
]

export function TableLoading() {
  const [message] = useState(
    () => LOADING_MESSAGES[Math.floor(Math.random() * LOADING_MESSAGES.length)],
  )

  return (
    <div className="flex min-h-[300px] flex-col items-center justify-center gap-6">
      <BoxLoader className="table-loading-logo size-16" />
      <p className="loading-message font-mono text-sm font-medium">
        {message}
        <span className="loading-ellipsis" />
      </p>
      <style>{`
        .loading-message {
          color: #9ca3af;
        }
        .dark .loading-message {
          color: #6b7280;
        }
        @keyframes boxPulse {
          0%, 100% {
            color: #d1d5db;
            transform: scale(1);
          }
          50% {
            color: #9ca3af;
            transform: scale(1.05);
          }
        }
        @keyframes boxPulseDark {
          0%, 100% {
            color: #4b5563;
            transform: scale(1);
          }
          50% {
            color: #6b7280;
            transform: scale(1.05);
          }
        }
        .table-loading-logo {
          animation: boxPulse 1.5s ease-in-out infinite;
        }
        .dark .table-loading-logo {
          animation: boxPulseDark 1.5s ease-in-out infinite;
        }
        @keyframes ellipsis {
          0% { content: ''; }
          25% { content: '.'; }
          50% { content: '..'; }
          75% { content: '...'; }
          100% { content: ''; }
        }
        .loading-ellipsis::after {
          content: '';
          animation: ellipsis 1s infinite;
          display: inline-block;
          width: 1.5em;
          text-align: left;
        }
      `}</style>
    </div>
  )
}
