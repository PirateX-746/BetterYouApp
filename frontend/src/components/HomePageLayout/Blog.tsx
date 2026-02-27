"use client";

import FadeIn from "./animations/FadeIn";

export default function Approach() {
    return (
        <section className="flex justify-center px-4 py-24 scroll-mt-5">
            <div className="max-w-[900px] w-full text-center">

                <FadeIn>

                    <h2 className="text-3xl md:text-4xl font-medium text-slate-800 mb-8">
                        Therapeutic Approach
                    </h2>

                    <p className="text-slate-600 leading-relaxed mb-6">
                        My work is grounded in evidence-based psychological practice,
                        with particular emphasis on Cognitive Behavioural Therapy (CBT).
                        Therapy is collaborative, structured, and tailored to your
                        individual experiences and goals.
                    </p>

                    <p className="text-slate-600 leading-relaxed">
                        Sessions focus on developing insight, strengthening coping
                        strategies, and fostering long-term emotional resilience.
                        Treatment plans are reviewed regularly to ensure meaningful
                        and measurable progress.
                    </p>
                </FadeIn>

            </div>
        </section>
    );
}