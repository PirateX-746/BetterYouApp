"use client";

import {
    Brain,
    HeartHandshake,
    Users,
    Laptop,
} from "lucide-react";

const services = [
    {
        title: "Individual Therapy",
        icon: Brain,
        description:
            "One-to-one psychological support focused on anxiety, mood concerns, stress, and personal difficulties. Sessions are tailored to your needs using evidence-based approaches.",
    },
    {
        title: "Cognitive Behavioural Therapy (CBT)",
        icon: HeartHandshake,
        description:
            "A structured therapeutic approach that helps identify and modify unhelpful thinking and behavioural patterns. Commonly used for anxiety, depression, and stress-related conditions.",
    },
    {
        title: "Couples & Relationship Support",
        icon: Users,
        description:
            "Professional guidance for partners experiencing communication difficulties, conflict, or emotional disconnection. Focused on improving understanding and relational stability.",
    },
    {
        title: "Online Consultations",
        icon: Laptop,
        description:
            "Secure telehealth appointments offering the same level of professional care as in-person sessions, ensuring accessibility and continuity of support.",
    },
];

export default function Services() {
    return (
        <section className="py-24 scroll-mt-5" id="services">
            <div className="max-w-5xl mx-auto px-6">

                {/* Section Header */}
                <div className="text-center mb-14">
                    <h2 className="text-3xl md:text-4xl font-semibold text-gray-900">
                        Areas of Practice
                    </h2>
                    <p className="text-gray-600 mt-4 max-w-xl mx-auto">
                        Psychological services delivered with professionalism, confidentiality,
                        and evidence-based care.
                    </p>
                </div>

                {/* Services Grid */}
                <div className="grid md:grid-cols-2 gap-8">
                    {services.map((service, index) => {
                        const Icon = service.icon;

                        return (
                            <div
                                key={index}
                                className="bg-white/80 backdrop-blur-md border border-gray-100 rounded-2xl p-8 shadow-sm hover:shadow-md transition"
                            >
                                <div className="flex items-center gap-4 mb-4">
                                    <div className="bg-blue-50 p-3 rounded-lg">
                                        <Icon className="text-blue-600" size={20} />
                                    </div>
                                    <h3 className="text-lg font-medium text-gray-900">
                                        {service.title}
                                    </h3>
                                </div>

                                <p className="text-gray-600 text-sm leading-relaxed">
                                    {service.description}
                                </p>
                            </div>
                        );
                    })}
                </div>

            </div>
        </section>
    );
}