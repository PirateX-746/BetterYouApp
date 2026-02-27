"use client";

import FadeIn from "./animations/FadeIn";

export default function Quote() {
    return (
        <section className="py-24 px-4 flex justify-center bg-white scroll-mt-5">
            <FadeIn>
                <div className="max-w-[800px] text-center">
                    <p className="text-xl italic text-gray-700">
                        “Healing takes time, and asking for help is a courageous step.”
                    </p>
                </div>
            </FadeIn>
        </section>
    );
}