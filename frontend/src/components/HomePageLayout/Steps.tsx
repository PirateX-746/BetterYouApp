"use client";

import {
    MessageCircle,
    User,
    Target,
    CalendarDays,
    HeartHandshake,
} from "lucide-react";

const steps = [
    {
        title: "Reach Out",
        description:
            "Send me a message or book directly through the website. I’ll respond personally and we’ll schedule your first session.",
        time: "Within 1 week",
        icon: MessageCircle,
    },
    {
        title: "First Session",
        description:
            "Our first conversation is a calm, supportive space where we explore what brings you here.",
        time: "1–2 weeks",
        icon: User,
    },
    {
        title: "Clarify Your Direction",
        description:
            "Together, we define your goals and the direction of our work.",
        time: "2–3 weeks",
        icon: Target,
    },
    {
        title: "Ongoing Sessions",
        description:
            "We meet regularly at a pace that supports steady progress and reflection.",
        time: "1–2 months",
        icon: CalendarDays,
    },
    {
        title: "Reflection & Growth",
        description:
            "We review your progress and decide thoughtfully what comes next.",
        time: "2–3 months",
        icon: HeartHandshake,
    },
];

export default function Steps() {
    return (
        <section className="py-24 scroll-mt-5" id="how-we-work">
            <div className="max-w-6xl mx-auto px-6">

                {/* Title */}
                <div className="text-center mb-20">
                    <h2 className="text-4xl font-semibold text-gray-900">
                        How Our Work Together Unfolds
                    </h2>
                    <p className="text-gray-600 mt-4">
                        A thoughtful step-by-step journey designed around you.
                    </p>
                </div>

                <div className="relative">

                    {/* Vertical Line */}
                    <div className="absolute left-5 md:left-1/2 top-0 h-full w-[2px] bg-blue-100 md:-translate-x-1/2"></div>

                    <div className="space-y-16">
                        {steps.map((step, index) => {
                            const Icon = step.icon;
                            const isLeft = index % 2 === 0;

                            return (
                                <div
                                    key={index}
                                    className={`relative flex ${isLeft ? "md:justify-start" : "md:justify-end"
                                        }`}
                                >
                                    {/* Dot */}
                                    <div className="absolute left-5 md:left-1/2 w-5 h-5 bg-white border-4 border-blue-500 rounded-full -translate-x-1/2 md:-translate-x-1/2 z-10"></div>

                                    {/* Card */}
                                    <div
                                        className={`ml-14 md:ml-0 w-full md:w-[45%] bg-white/70 backdrop-blur-xl border border-white/40 shadow-lg rounded-2xl p-8 transition hover:shadow-xl ${isLeft
                                            ? "md:mr-auto md:pr-10"
                                            : "md:ml-auto md:pl-10"
                                            }`}
                                    >
                                        <div className="flex items-center gap-4 mb-4">
                                            <div className="bg-blue-100 p-3 rounded-xl">
                                                <Icon className="text-blue-600" size={22} />
                                            </div>
                                            <span className="text-sm text-blue-500 font-medium">
                                                {step.time}
                                            </span>
                                        </div>

                                        <h3 className="text-xl font-semibold text-gray-900 mb-3">
                                            {step.title}
                                        </h3>

                                        <p className="text-gray-600 text-sm leading-relaxed">
                                            {step.description}
                                        </p>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            </div>
        </section>
    );
}