"use client";

import FadeIn from "./animations/FadeIn";

export default function CTA() {
    return (
        <section className="py-24 px-4 flex justify-center">
            <div className="max-w-[1200px] w-full">

                <FadeIn>
                    <div className="text-center bg-white border border-gray-100 rounded-2xl p-12 shadow-sm">

                        <h2 className="text-2xl md:text-3xl font-medium text-slate-800 mb-6">
                            Taking the first step can feel difficult.
                        </h2>

                        <p className="text-slate-600 mb-8 leading-relaxed">
                            If you feel ready to seek support, appointments can be scheduled
                            confidentially. You are welcome to reach out with any questions
                            before booking.
                        </p>

                        <button className="bg-blue-500 text-white px-8 py-3 rounded-full hover:opacity-90 transition">
                            Book Appointment
                        </button>

                    </div>
                </FadeIn>

            </div>
        </section>
    );
}