"use client";

import FadeIn from "./animations/FadeIn";

export default function AboutPsychologist() {
    return (
        <section className="py-24 px-4 flex justify-center bg-white scroll-mt-5">
            <div className="max-w-[1000px] w-full grid md:grid-cols-2 gap-14 items-center">

                {/* Image */}
                <FadeIn>
                    <img
                        src="https://images.unsplash.com/photo-1573497620053-ea5300f94f21"
                        alt="Clinical Psychologist"
                        className="rounded-[28px] w-full h-[450px] object-cover"
                    />
                </FadeIn>

                {/* Content */}
                <FadeIn delay={0.2}>
                    <div>
                        <p className="text-slate-500 mb-3 font-medium tracking-wide">
                            About the Psychologist
                        </p>

                        <h2 className="text-3xl md:text-4xl font-medium text-slate-800 mb-6">
                            Dr. [Full Name], Clinical Psychologist
                        </h2>

                        <p className="text-slate-600 leading-relaxed mb-6">
                            Dr. [Last Name] is a licensed clinical psychologist with
                            experience in providing evidence-based psychological care
                            for anxiety, mood disorders, relationship concerns, and
                            life transitions.
                        </p>

                        <p className="text-slate-600 leading-relaxed mb-6">
                            Her practice integrates structured therapeutic approaches,
                            including Cognitive Behavioural Therapy (CBT), within a
                            professional and confidential setting.
                        </p>

                        <div className="text-sm text-slate-500 space-y-1">
                            <p>• Licensed Clinical Psychologist</p>
                            <p>• [Degree: PhD / PsyD / M.Phil]</p>
                            <p>• [Registered with Licensing Body]</p>
                            <p>• [Years of Experience]</p>
                        </div>
                    </div>
                </FadeIn>

            </div>
        </section>
    );
}