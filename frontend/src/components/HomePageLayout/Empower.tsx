"use client";

import FadeIn from "./animations/FadeIn";

export default function Empower() {
    return (
        <section className="flex justify-center px-4 py-24 scroll-mt-5" id="about">
            <div className="w-full max-w-[1200px] grid md:grid-cols-2 gap-16 items-center">

                {/* Image */}
                <FadeIn>
                    <img
                        src="/clinical-approach.jpg"
                        alt="Psychologist consultation in office setting"
                        className="rounded-[28px] object-cover w-full h-[480px] shadow-sm"
                    />
                </FadeIn>

                {/* Content */}
                <FadeIn delay={0.2}>
                    <div>
                        <p className="text-slate-500 font-medium mb-3 tracking-wide">
                            About the Practice
                        </p>

                        <h2 className="text-3xl md:text-4xl font-medium mb-6 text-slate-800 leading-snug">
                            Professional Psychological Support
                            <br />
                            Grounded in Trust and Clinical Care
                        </h2>

                        <p className="text-slate-600 mb-6 leading-relaxed">
                            Therapy is a collaborative process built on trust, safety, and
                            professional integrity. My approach is structured, evidence-based,
                            and tailored to your individual circumstances, ensuring thoughtful
                            and meaningful progress.
                        </p>

                        <ul className="space-y-4 text-slate-600">
                            <li>• Registered and ethically guided practice</li>
                            <li>• In-person and secure telehealth appointments</li>
                            <li>• Individualised treatment planning</li>
                            <li>• Clear therapeutic structure and goals</li>
                        </ul>

                        <button className="mt-8 bg-blue-500 text-white px-8 py-3 rounded-full hover:opacity-90 transition">
                            Learn More About My Approach
                        </button>
                    </div>
                </FadeIn>

            </div>
        </section>
    );
}