import { useState } from 'react'

const LOGO_PATH =
  'M122.346 22.4028C123.674 20.3705 124.92 16.9171 124.954 13.498C125.05 6.04181 120.463 0 113.404 0C106.346 0 101.231 6.04181 101.135 13.5048C101.087 16.6356 101.56 19.1622 102.772 21.8054C91.5846 25.1696 84.2863 34.6168 82.8622 45.6706C82.8691 45.65 82.8759 45.65 82.8759 45.65C82.7527 46.6043 82.7184 47.1948 82.7184 47.1948C82.3967 50.1608 84.6217 52.8041 87.689 53.1267C90.7562 53.4288 93.1456 51.5476 93.8302 48.3139C94.5286 45.1007 96.9043 40.5694 101.32 39.1413C101.628 37.6789 101.615 33.4359 102.019 28.5682C104.607 28.5682 107.147 31.7401 107.147 31.7401C108.954 30.2983 111.152 29.4264 113.507 29.4264C115.862 29.4264 118.436 30.2983 120.394 31.7401C120.394 31.7401 121.791 28.5682 125.598 28.5682C126.679 38.8873 126.543 45.6637 116.198 45.6637H111.734C108.708 45.6637 106.695 48.1217 107.236 51.1494C107.783 54.1909 110.679 56.6557 113.705 56.6557H122.551C122.921 56.6557 123.338 56.6214 123.77 56.539C134.094 55.6396 138.654 48.9661 138.051 41.9425C137.415 34.4383 132.561 26.1789 122.332 22.4028'

function IntersandLogo({ className }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="82 0 57 57"
      className={className}
      fill="currentColor"
    >
      <path d={LOGO_PATH} />
      <path d={LOGO_PATH} fill="none" strokeWidth="2" className="logo-trace" />
    </svg>
  )
}

const LOADING_MESSAGES = [
  // Cat-themed
  'Herding the data cats',
  'Pawsing for your data',
  'Curiosity loading the cat',
  'Chasing down those numbers',
  'Knocking data off the table',
  'Taking a quick catnap',
  'Grooming the datasets',
  'Sharpening claws on the server',
  'Following the red dot of data',
  'Purring through the records',
  // Data-themed
  'Crunching the numbers',
  'Fetching fresh data',
  'Aggregating inventory',
  'Calculating forecasts',
  'Analyzing stock levels',
  'Processing supply data',
  'Querying the warehouse',
  'Compiling your report',
  'Sifting through records',
  'Loading the good stuff',
]

export function TableLoading() {
  const [message] = useState(
    () => LOADING_MESSAGES[Math.floor(Math.random() * LOADING_MESSAGES.length)],
  )

  return (
    <div className="flex min-h-[300px] flex-col items-center justify-center gap-8">
      <IntersandLogo className="table-loading-logo mt-40 size-32" />
      <p className="loading-message font-mono text-sm font-bold">
        {message}
        <span className="loading-ellipsis" />
      </p>
      <style>{`
        .loading-message {
          color: #c9cdd4;
        }
        .dark .loading-message {
          color: #4b5563;
        }
        @keyframes logoColorPulse {
          0%, 100% {
            color: #f3f4f6;
          }
          50% {
            color: #f0f1f3;
          }
        }
        @keyframes logoColorPulseDark {
          0%, 100% {
            color: #374151;
          }
          50% {
            color: #3f4a5c;
          }
        }
        .table-loading-logo {
          animation: logoColorPulse 2.5s ease-in-out infinite;
        }
        .dark .table-loading-logo {
          animation: logoColorPulseDark 2.5s ease-in-out infinite;
        }
        .logo-trace {
          stroke: #c9cdd4;
          stroke-dasharray: 35 230;
          stroke-dashoffset: 0;
          animation: traceMove 1.5s linear infinite;
        }
        .dark .logo-trace {
          stroke: #7f8694;
        }
        @keyframes traceMove {
          0% {
            stroke-dashoffset: 0;
          }
          100% {
            stroke-dashoffset: -265;
          }
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
