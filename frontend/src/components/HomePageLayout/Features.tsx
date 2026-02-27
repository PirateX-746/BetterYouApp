"use client";

import FadeIn from "./animations/FadeIn";
import {
    ShieldCheck,
    BookOpen,
    UserCheck,
    HandHeart,
} from "lucide-react";

const features = [
    {
        title: "Confidential & Ethical Practice",
        desc: "All sessions are conducted in accordance with professional ethical guidelines and strict confidentiality standards.",
        icon: ShieldCheck,
    },
    {
        title: "Evidence-Based Methods",
        desc: "Therapeutic work is grounded in established psychological research, including Cognitive Behavioural Therapy (CBT).",
        icon: BookOpen,
    },
    {
        title: "Individualised Treatment Planning",
        desc: "Care is tailored to your personal history, current concerns, and clearly defined therapeutic goals.",
        icon: UserCheck,
    },
    {
        title: "Respectful & Non-Judgmental Environment",
        desc: "A structured space where you can speak openly and be heard with professionalism and empathy.",
        icon: HandHeart,
    },
];

export default function Features() {
    return (
        <section className="py-20 px-4 flex justify-center scroll-mt-5">

            <div className="max-w-[1200px] w-full">

                {/* Section Title */}
                <div className="text-center mb-12">
                    <h2 className="text-3xl md:text-4xl font-medium text-slate-800">
                        What You Can Expect
                    </h2>
                </div>

                {/* Features Grid */}
                <div className="grid md:grid-cols-2 gap-10">
                    {features.map((item, i) => {
                        const Icon = item.icon;

                        return (
                            <FadeIn key={i} delay={i * 0.08}>
                                <div className="bg-white border border-gray-100 rounded-2xl p-8 shadow-sm hover:shadow-md transition-shadow duration-300">

                                    <div className="flex items-start gap-4 mb-4">
                                        <div className="bg-blue-100 p-2.5 rounded-lg">
                                            <Icon size={18} className="text-blue-500" />
                                        </div>

                                        <h3 className="font-medium text-slate-800">
                                            {item.title}
                                        </h3>
                                    </div>

                                    <p className="text-slate-600 text-sm leading-relaxed ml-11">
                                        {item.desc}
                                    </p>

                                </div>
                            </FadeIn>
                        );
                    })}
                </div>

            </div>
        </section>
    );
}