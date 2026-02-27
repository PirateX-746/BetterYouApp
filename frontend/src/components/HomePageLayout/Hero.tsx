"use client";

import FadeIn from "./animations/FadeIn";

export default function Hero() {
    return (
        <section className="flex justify-center px-4 py-10 mt-10 scroll-mt-24 transition-all" id="hero">
            <div className="w-full max-w-[1200px] bg-white/90 backdrop-blur-sm rounded-[28px] shadow-[0_8px_25px_rgba(0,0,0,0.04)] p-10 md:p-16 grid md:grid-cols-2 gap-12 items-center">

                {/* Left Content */}
                <FadeIn>
                    <div>
                        <p className="text-slate-500 font-medium mb-4 tracking-wide scroll-mt-5">
                            Clinical Psychology Practice
                        </p>

                        <h1 className="text-4xl md:text-5xl font-medium leading-tight mb-6 text-slate-800">
                            You Don’t Have to Carry
                            <br />
                            <span className="text-slate-600">
                                Everything Alone
                            </span>
                        </h1>

                        <p className="text-slate-600 mb-8 text-lg leading-relaxed">
                            If you’re feeling overwhelmed, stuck, anxious, or emotionally
                            exhausted, you are not alone. Therapy offers a safe and
                            confidential space to understand what you’re going through and
                            begin moving toward clarity and steadiness.
                        </p>

                        <button className="bg-blue-500 text-white px-8 py-3 rounded-full shadow-sm hover:opacity-90 transition">
                            Take the First Step
                        </button>

                        <div className="mt-10 text-sm text-slate-500 space-y-1">
                            <p>• Individual Therapy</p>
                            <p>• Cognitive Behavioural Therapy (CBT)</p>
                            <p>• Couples & Relationship Support</p>
                            <p>• In-person & Secure Telehealth</p>
                        </div>
                    </div>
                </FadeIn>

                {/* Right Image */}
                <FadeIn delay={0.2}>
                    <img
                        src="https://images.unsplash.com/photo-1584515933487-779824d29309"
                        alt="Therapy session"
                        className="rounded-[24px] object-cover w-full h-[420px]"
                    />
                </FadeIn>

            </div>
        </section>
    );
}