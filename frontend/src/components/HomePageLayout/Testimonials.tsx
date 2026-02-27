"use client";

const testimonials = [
    {
        name: "Client A",
        text:
            "The sessions provided clarity during a very overwhelming period. I felt heard and understood throughout the process.",
    },
    {
        name: "Client B",
        text:
            "A structured and thoughtful approach that helped me better manage anxiety and improve daily functioning.",
    },
    {
        name: "Client C",
        text:
            "Professional, respectful, and supportive. The therapeutic space felt safe and non-judgmental.",
    },
];

export default function Testimonials() {
    return (
        <section className="flex justify-center px-4 py-10 bg-[#F4F8FC] scroll-mt-5">
            <div className="max-w-[1200px] w-full">

                {/* Section Title */}
                <div className="text-center mb-14">
                    <h2 className="text-3xl md:text-4xl font-medium text-slate-800">
                        Patient Feedback
                    </h2>
                    <p className="text-slate-500 text-sm mt-3">
                        Shared with consent. Identities remain confidential.
                    </p>
                </div>

                {/* 3 Reviews Grid */}
                <div className="grid md:grid-cols-3 gap-8">
                    {testimonials.map((item, index) => (
                        <div
                            key={index}
                            className="bg-white border border-gray-100 rounded-2xl p-8 shadow-sm hover:shadow-md transition-shadow duration-300"
                        >
                            <p className="text-slate-600 text-sm leading-relaxed mb-6 italic">
                                “{item.text}”
                            </p>

                            <p className="text-slate-700 font-medium text-sm">
                                — {item.name}
                            </p>
                        </div>
                    ))}
                </div>

            </div>
        </section>
    );
}