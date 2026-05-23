import React from 'react';
import { useNavigate } from 'react-router-dom';

function LandingPage() {
  const navigate = useNavigate();

  return (
    <div className="relative min-h-screen overflow-hidden bg-[#0f081d] text-white">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,_rgba(115,17,212,0.45),_transparent_36%),radial-gradient(circle_at_top_right,_rgba(64,224,208,0.18),_transparent_30%),linear-gradient(135deg,_#0f081d_0%,_#1b102c_45%,_#12091f_100%)]" />
      <div className="absolute inset-0 opacity-20 [background-image:linear-gradient(rgba(255,255,255,0.07)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.07)_1px,transparent_1px)] [background-size:52px_52px]" />

      <div className="relative mx-auto flex min-h-screen max-w-7xl flex-col justify-center px-6 py-14 lg:px-10">
        <div className="max-w-3xl">
          <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm font-medium text-white/80 backdrop-blur">
            <span className="text-lg">🎪</span>
            Event Management System
          </div>

          <h1 className="mt-6 max-w-4xl text-5xl font-black tracking-tight text-white sm:text-6xl lg:text-7xl">
            A cleaner front door for managers and workers.
          </h1>

          <p className="mt-6 max-w-2xl text-lg leading-8 text-white/72 sm:text-xl">
            Choose the path that fits your role. Managers go to the dashboard and worker tools keep assignments
            close at hand.
          </p>
        </div>

        <div className="mt-12 grid gap-6 md:grid-cols-2 lg:mt-16">
          <button
            type="button"
            onClick={() => navigate('/manager/login')}
            className="group rounded-[28px] border border-white/10 bg-white/8 p-6 text-left shadow-2xl shadow-black/25 backdrop-blur-xl transition duration-300 hover:-translate-y-1 hover:border-white/20 hover:bg-white/12 focus:outline-none focus:ring-2 focus:ring-[#7311d4]"
          >
            <div className="flex items-center justify-between">
              <div className="flex size-14 items-center justify-center rounded-2xl bg-[#7311d4]/20 text-3xl ring-1 ring-inset ring-[#7311d4]/30">
                👔
              </div>
              <span className="rounded-full border border-emerald-400/30 bg-emerald-400/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-emerald-200">
                Secure access
              </span>
            </div>

            <div className="mt-8">
              <h2 className="text-2xl font-bold tracking-tight text-white">Manager</h2>
              <p className="mt-3 max-w-sm text-base leading-7 text-white/72">
                Manage events, staff, inventory, and payments from the admin workspace.
              </p>
            </div>

            <div className="mt-8 flex items-center gap-3 text-sm font-semibold text-white/90 transition group-hover:text-white">
              <span>Continue to manager login</span>
              <span className="transition-transform group-hover:translate-x-1">→</span>
            </div>
          </button>

          <button
            type="button"
            onClick={() => navigate('/worker')}
            className="group rounded-[28px] border border-white/10 bg-white/8 p-6 text-left shadow-2xl shadow-black/25 backdrop-blur-xl transition duration-300 hover:-translate-y-1 hover:border-white/20 hover:bg-white/12 focus:outline-none focus:ring-2 focus:ring-cyan-300"
          >
            <div className="flex items-center justify-between">
              <div className="flex size-14 items-center justify-center rounded-2xl bg-cyan-300/15 text-3xl ring-1 ring-inset ring-cyan-200/25">
                👨‍🍳
              </div>
              <span className="rounded-full border border-cyan-300/30 bg-cyan-300/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-cyan-100">
                Shift ready
              </span>
            </div>

            <div className="mt-8">
              <h2 className="text-2xl font-bold tracking-tight text-white">Worker</h2>
              <p className="mt-3 max-w-sm text-base leading-7 text-white/72">
                View assignments, confirm shifts, and keep availability up to date.
              </p>
            </div>

            <div className="mt-8 flex items-center gap-3 text-sm font-semibold text-white/90 transition group-hover:text-white">
              <span>Go to worker portal</span>
              <span className="transition-transform group-hover:translate-x-1">→</span>
            </div>
          </button>
        </div>

        <div className="mt-10 flex flex-wrap items-center gap-x-6 gap-y-3 text-sm text-white/55">
          <span>Designed for quick access</span>
          <span className="hidden h-1 w-1 rounded-full bg-white/25 sm:block" />
          <span>Optimized for desktop and mobile</span>
        </div>
      </div>
    </div>
  );
}

export default LandingPage;